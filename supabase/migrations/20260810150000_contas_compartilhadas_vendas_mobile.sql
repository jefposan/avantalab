-- Contas compartilháveis do AvantaVendas.
-- Um login pode participar de várias contas; os dados operacionais pertencem à
-- conta, enquanto user_id continua registrando quem criou o lançamento.

create table if not exists public.vendas_mobile_contas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 2 and 100),
  empresa_id uuid references public.empresas(id) on delete set null,
  criado_por uuid not null references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  arquivada_em timestamptz
);

create table if not exists public.vendas_mobile_contas_usuarios (
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel text not null check (papel in ('proprietario', 'administrador', 'vendedor', 'consulta')),
  status text not null default 'ativo' check (status in ('ativo', 'bloqueado')),
  convidado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (conta_id, user_id)
);

create index if not exists vendas_mobile_contas_usuarios_user_idx
  on public.vendas_mobile_contas_usuarios(user_id, status);
create index if not exists vendas_mobile_contas_empresa_idx
  on public.vendas_mobile_contas(empresa_id) where arquivada_em is null;

-- Cria uma conta inicial para cada usuário que já possui dados ou acesso.
insert into public.vendas_mobile_contas (nome, empresa_id, criado_por)
select distinct on (origem.user_id)
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'nome'), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Minha conta de vendas'),
  (
    select p.empresa_id from public.vendas_mobile_pedidos p
    where p.user_id = origem.user_id and p.empresa_id is not null
    order by p.criado_em desc nulls last limit 1
  ),
  origem.user_id
from (
  select user_id from public.vendas_mobile_clientes
  union select user_id from public.vendas_mobile_pedidos
  union select user_id from public.vendas_mobile_pagamentos
  union select user_id from public.vendas_mobile_acessos
) origem
join auth.users u on u.id = origem.user_id
where not exists (
  select 1 from public.vendas_mobile_contas c where c.criado_por = origem.user_id
)
order by origem.user_id;

insert into public.vendas_mobile_contas_usuarios (conta_id, user_id, papel)
select c.id, c.criado_por, 'proprietario'
from public.vendas_mobile_contas c
on conflict (conta_id, user_id) do nothing;

-- A referência é adicionada como NOT VALID para não varrer todo o histórico
-- durante a publicação. Ela já é aplicada aos novos registros e poderá ser
-- validada em uma janela de manutenção sem interromper o uso do app.
alter table public.vendas_mobile_clientes add column if not exists conta_id uuid;
alter table public.vendas_mobile_pedidos add column if not exists conta_id uuid;
alter table public.vendas_mobile_pagamentos add column if not exists conta_id uuid;
alter table public.vendas_mobile_agenda add column if not exists conta_id uuid;
alter table public.vendas_mobile_produtos add column if not exists conta_id uuid;

do $$
declare t text;
begin
  foreach t in array array['vendas_mobile_clientes','vendas_mobile_pedidos','vendas_mobile_pagamentos','vendas_mobile_agenda','vendas_mobile_produtos'] loop
    if not exists (
      select 1 from pg_constraint where conname = t || '_conta_fkey' and conrelid = ('public.' || t)::regclass
    ) then
      execute format('alter table public.%I add constraint %I foreign key (conta_id) references public.vendas_mobile_contas(id) on delete cascade not valid', t, t || '_conta_fkey');
    end if;
  end loop;
end $$;

-- Pedidos e pagamentos possuem gatilhos que recalculam a receita da empresa.
-- Na conversão histórica isso faria uma sincronização completa para cada linha
-- atualizada. A marca local faz os gatilhos reconhecerem a transferência e
-- preserva a receita já existente, sem milhares de recalculações repetidas.
select set_config('app.vendas_mobile_transferencia', '1', true);

update public.vendas_mobile_clientes t set conta_id = c.id from public.vendas_mobile_contas c where t.conta_id is null and c.criado_por = t.user_id;
update public.vendas_mobile_pedidos t set conta_id = c.id from public.vendas_mobile_contas c where t.conta_id is null and c.criado_por = t.user_id;
update public.vendas_mobile_pagamentos t set conta_id = c.id from public.vendas_mobile_contas c where t.conta_id is null and c.criado_por = t.user_id;
update public.vendas_mobile_agenda t set conta_id = c.id from public.vendas_mobile_contas c where t.conta_id is null and c.criado_por = t.user_id;
update public.vendas_mobile_produtos t set conta_id = c.id from public.vendas_mobile_contas c where t.conta_id is null and c.criado_por = t.user_id;

create index if not exists vendas_mobile_clientes_conta_idx on public.vendas_mobile_clientes(conta_id, nome);
create index if not exists vendas_mobile_pedidos_conta_idx on public.vendas_mobile_pedidos(conta_id, criado_em desc);
create index if not exists vendas_mobile_pagamentos_conta_idx on public.vendas_mobile_pagamentos(conta_id, data_pagamento desc);
create index if not exists vendas_mobile_agenda_conta_idx on public.vendas_mobile_agenda(conta_id);
create index if not exists vendas_mobile_produtos_conta_idx on public.vendas_mobile_produtos(conta_id);

-- Compatibilidade com a versão já publicada: enquanto o navegador antigo ainda
-- envia somente user_id, a primeira conta daquele usuário é preenchida no
-- servidor. Assim, a migração não interrompe lançamentos durante o rollout.
create or replace function public.preencher_conta_operacional_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.conta_id is null then
    select id into new.conta_id from public.vendas_mobile_contas
    where criado_por = new.user_id and arquivada_em is null
    order by criado_em limit 1;
  end if;
  if new.conta_id is null then raise exception 'Não foi possível identificar a conta de vendas.'; end if;
  return new;
end;
$$;

drop trigger if exists vendas_mobile_clientes_conta_padrao on public.vendas_mobile_clientes;
create trigger vendas_mobile_clientes_conta_padrao before insert on public.vendas_mobile_clientes for each row execute function public.preencher_conta_operacional_vendas_mobile();
drop trigger if exists vendas_mobile_pedidos_conta_padrao on public.vendas_mobile_pedidos;
create trigger vendas_mobile_pedidos_conta_padrao before insert on public.vendas_mobile_pedidos for each row execute function public.preencher_conta_operacional_vendas_mobile();
drop trigger if exists vendas_mobile_pagamentos_conta_padrao on public.vendas_mobile_pagamentos;
create trigger vendas_mobile_pagamentos_conta_padrao before insert on public.vendas_mobile_pagamentos for each row execute function public.preencher_conta_operacional_vendas_mobile();
drop trigger if exists vendas_mobile_agenda_conta_padrao on public.vendas_mobile_agenda;
create trigger vendas_mobile_agenda_conta_padrao before insert on public.vendas_mobile_agenda for each row execute function public.preencher_conta_operacional_vendas_mobile();
drop trigger if exists vendas_mobile_produtos_conta_padrao on public.vendas_mobile_produtos;
create trigger vendas_mobile_produtos_conta_padrao before insert on public.vendas_mobile_produtos for each row execute function public.preencher_conta_operacional_vendas_mobile();

create or replace function public.vendas_mobile_papel_conta(p_conta_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select papel from public.vendas_mobile_contas_usuarios
  where conta_id = p_conta_id and user_id = auth.uid() and status = 'ativo'
  limit 1
$$;

create or replace function public.vendas_mobile_pode_ler_conta(p_conta_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.vendas_mobile_papel_conta(p_conta_id) is not null
$$;

create or replace function public.vendas_mobile_pode_operar_conta(p_conta_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.vendas_mobile_papel_conta(p_conta_id) in ('proprietario', 'administrador', 'vendedor')
$$;

create or replace function public.vendas_mobile_pode_gerir_conta(p_conta_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.vendas_mobile_papel_conta(p_conta_id) in ('proprietario', 'administrador')
$$;

alter table public.vendas_mobile_contas enable row level security;
alter table public.vendas_mobile_contas_usuarios enable row level security;
create policy vendas_mobile_contas_leitura on public.vendas_mobile_contas for select to authenticated using (public.vendas_mobile_pode_ler_conta(id));
create policy vendas_mobile_contas_criar on public.vendas_mobile_contas for insert to authenticated with check (criado_por = auth.uid());
create policy vendas_mobile_contas_atualizar on public.vendas_mobile_contas for update to authenticated using (public.vendas_mobile_papel_conta(id) = 'proprietario') with check (public.vendas_mobile_papel_conta(id) = 'proprietario');
create policy vendas_mobile_contas_usuarios_leitura on public.vendas_mobile_contas_usuarios for select to authenticated using (public.vendas_mobile_pode_ler_conta(conta_id));

-- As inclusões e alterações de participantes passam pelas RPCs abaixo.
create or replace function public.criar_conta_vendas_mobile_rpc(p_nome text, p_empresa_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_conta public.vendas_mobile_contas;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if length(trim(coalesce(p_nome,''))) < 2 then raise exception 'Informe o nome da conta.'; end if;
  if p_empresa_id is not null and not exists (
    select 1 from public.vendas_mobile_acessos a where a.user_id = auth.uid() and a.empresa_id = p_empresa_id and a.status = 'ativo'
    union all
    select 1 from public.usuarios_empresa u where u.user_id = auth.uid() and u.empresa_id = p_empresa_id and u.status = 'ativo'
  ) then raise exception 'Você ainda não possui acesso aprovado a esta empresa.'; end if;
  insert into public.vendas_mobile_contas(nome, empresa_id, criado_por) values (trim(p_nome), p_empresa_id, auth.uid()) returning * into v_conta;
  insert into public.vendas_mobile_contas_usuarios(conta_id,user_id,papel) values(v_conta.id,auth.uid(),'proprietario');
  return jsonb_build_object('id',v_conta.id,'nome',v_conta.nome,'empresa_id',v_conta.empresa_id,'papel','proprietario');
end;
$$;

create or replace function public.minhas_contas_vendas_mobile_rpc()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'nome', c.nome, 'empresa_id', c.empresa_id, 'empresa_nome', e.nome,
    'papel', m.papel, 'criado_por', c.criado_por
  ) order by (m.papel = 'proprietario') desc, c.criado_em), '[]'::jsonb)
  from public.vendas_mobile_contas_usuarios m
  join public.vendas_mobile_contas c on c.id=m.conta_id and c.arquivada_em is null
  left join public.empresas e on e.id=c.empresa_id
  where m.user_id=auth.uid() and m.status='ativo'
$$;

create or replace function public.adicionar_usuario_conta_vendas_mobile_rpc(p_conta_id uuid, p_email text, p_papel text default 'vendedor')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_usuario uuid;
begin
  if public.vendas_mobile_papel_conta(p_conta_id) not in ('proprietario','administrador') then raise exception 'Sem permissão para gerenciar usuários desta conta.'; end if;
  if p_papel not in ('administrador','vendedor','consulta') then raise exception 'Papel inválido.'; end if;
  select id into v_usuario from auth.users where lower(email)=lower(trim(p_email));
  if v_usuario is null then raise exception 'Nenhuma conta AvantaLab foi encontrada para este e-mail.'; end if;
  insert into public.vendas_mobile_contas_usuarios(conta_id,user_id,papel,status,convidado_por)
  values(p_conta_id,v_usuario,p_papel,'ativo',auth.uid())
  on conflict(conta_id,user_id) do update set papel=excluded.papel,status='ativo',convidado_por=auth.uid(),atualizado_em=now();
  return jsonb_build_object('user_id',v_usuario,'papel',p_papel);
end;
$$;

-- RLS dos registros operacionais usa a conta, não o dono histórico do registro.
do $$
declare t text;
begin
  foreach t in array array['vendas_mobile_clientes','vendas_mobile_pedidos','vendas_mobile_pagamentos','vendas_mobile_agenda','vendas_mobile_produtos'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.vendas_mobile_pode_ler_conta(conta_id))', t || '_conta_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.vendas_mobile_pode_operar_conta(conta_id) and user_id = auth.uid())', t || '_conta_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.vendas_mobile_pode_operar_conta(conta_id)) with check (public.vendas_mobile_pode_operar_conta(conta_id))', t || '_conta_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.vendas_mobile_pode_operar_conta(conta_id))', t || '_conta_delete', t);
  end loop;
end $$;

drop policy if exists vendas_mobile_pedido_itens_own on public.vendas_mobile_pedido_itens;
drop policy if exists vendas_mobile_pedido_itens_select on public.vendas_mobile_pedido_itens;
drop policy if exists vendas_mobile_pedido_itens_insert on public.vendas_mobile_pedido_itens;
drop policy if exists vendas_mobile_pedido_itens_update on public.vendas_mobile_pedido_itens;
drop policy if exists vendas_mobile_pedido_itens_delete on public.vendas_mobile_pedido_itens;
create policy vendas_mobile_pedido_itens_conta_select on public.vendas_mobile_pedido_itens for select to authenticated using (
  exists (select 1 from public.vendas_mobile_pedidos p where p.id = pedido_id and public.vendas_mobile_pode_ler_conta(p.conta_id))
);
create policy vendas_mobile_pedido_itens_conta_operar on public.vendas_mobile_pedido_itens for all to authenticated using (
  exists (select 1 from public.vendas_mobile_pedidos p where p.id = pedido_id and public.vendas_mobile_pode_operar_conta(p.conta_id))
) with check (
  exists (select 1 from public.vendas_mobile_pedidos p where p.id = pedido_id and public.vendas_mobile_pode_operar_conta(p.conta_id))
);

-- Novos pedidos obtêm a empresa exclusivamente da conta ativa; uma conta
-- pessoal pode permanecer sem integração financeira.
create or replace function public.preencher_empresa_lancamento_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.conta_id is null then raise exception 'Selecione uma conta de vendas.'; end if;
  select empresa_id into new.empresa_id from public.vendas_mobile_contas where id = new.conta_id;
  return new;
end;
$$;

create or replace function public.salvar_pedido_vendas_mobile_rpc(p_pedido jsonb, p_itens jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_conta_id uuid; v_pedido_id uuid;
  v_pedido public.vendas_mobile_pedidos%rowtype;
begin
  if v_user_id is null then raise exception 'Sessão expirada.'; end if;
  v_conta_id := nullif(p_pedido->>'conta_id','')::uuid;
  if v_conta_id is null then
    select id into v_conta_id from public.vendas_mobile_contas where criado_por = v_user_id and arquivada_em is null order by criado_em limit 1;
  end if;
  if v_conta_id is null or not public.vendas_mobile_pode_operar_conta(v_conta_id) then raise exception 'Conta de vendas inválida ou sem permissão.'; end if;
  if jsonb_typeof(coalesce(p_itens,'[]'::jsonb)) <> 'array' then raise exception 'A lista de itens do pedido é inválida.'; end if;
  v_pedido_id := nullif(p_pedido->>'id','')::uuid;
  if v_pedido_id is null then
    insert into public.vendas_mobile_pedidos (user_id,conta_id,cliente_id,status,subtotal,desconto,total,forma_pagamento,observacoes,criado_em,atualizado_em)
    values (v_user_id,v_conta_id,nullif(p_pedido->>'cliente_id','')::uuid,coalesce(nullif(p_pedido->>'status',''),'concluida'),coalesce((p_pedido->>'subtotal')::numeric,0),coalesce((p_pedido->>'desconto')::numeric,0),coalesce((p_pedido->>'total')::numeric,0),nullif(p_pedido->>'forma_pagamento',''),nullif(p_pedido->>'observacoes',''),coalesce((p_pedido->>'criado_em')::timestamptz,now()),now()) returning * into v_pedido;
  else
    update public.vendas_mobile_pedidos set cliente_id=nullif(p_pedido->>'cliente_id','')::uuid,status=coalesce(nullif(p_pedido->>'status',''),'concluida'),subtotal=coalesce((p_pedido->>'subtotal')::numeric,0),desconto=coalesce((p_pedido->>'desconto')::numeric,0),total=coalesce((p_pedido->>'total')::numeric,0),forma_pagamento=nullif(p_pedido->>'forma_pagamento',''),observacoes=nullif(p_pedido->>'observacoes',''),criado_em=coalesce((p_pedido->>'criado_em')::timestamptz,criado_em),atualizado_em=now()
    where id=v_pedido_id and conta_id=v_conta_id and public.vendas_mobile_pode_operar_conta(conta_id) returning * into v_pedido;
    if not found then raise exception 'Pedido não encontrado ou sem permissão para alteração.'; end if;
    delete from public.vendas_mobile_pedido_itens where pedido_id=v_pedido.id;
  end if;
  insert into public.vendas_mobile_pedido_itens(pedido_id,produto_id,produto_nome,produto_sku,quantidade,preco_unitario,preco_custo,desconto,total)
  select v_pedido.id,nullif(item->>'produto_id','')::uuid,coalesce(nullif(item->>'produto_nome',''),'Produto'),nullif(item->>'produto_sku',''),coalesce((item->>'quantidade')::numeric,1),coalesce((item->>'preco_unitario')::numeric,0),case when item ? 'preco_custo' then nullif(item->>'preco_custo','')::numeric else null end,coalesce((item->>'desconto')::numeric,0),coalesce((item->>'total')::numeric,0)
  from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) item;
  return to_jsonb(v_pedido) || jsonb_build_object('itens',coalesce((select jsonb_agg(to_jsonb(i) order by i.criado_em,i.id) from public.vendas_mobile_pedido_itens i where i.pedido_id=v_pedido.id),'[]'::jsonb));
end;
$$;

revoke all on function public.vendas_mobile_papel_conta(uuid) from public;
revoke all on function public.vendas_mobile_pode_ler_conta(uuid) from public;
revoke all on function public.vendas_mobile_pode_operar_conta(uuid) from public;
revoke all on function public.vendas_mobile_pode_gerir_conta(uuid) from public;
revoke all on function public.criar_conta_vendas_mobile_rpc(text,uuid) from public;
revoke all on function public.minhas_contas_vendas_mobile_rpc() from public;
revoke all on function public.adicionar_usuario_conta_vendas_mobile_rpc(uuid,text,text) from public;
grant execute on function public.vendas_mobile_papel_conta(uuid), public.vendas_mobile_pode_ler_conta(uuid), public.vendas_mobile_pode_operar_conta(uuid), public.vendas_mobile_pode_gerir_conta(uuid), public.criar_conta_vendas_mobile_rpc(text,uuid), public.minhas_contas_vendas_mobile_rpc(), public.adicionar_usuario_conta_vendas_mobile_rpc(uuid,text,text) to authenticated;
