-- Contas do AvantaVendas são unidades operacionais de primeira classe.
-- Migração conservadora: nenhuma linha existente é removida. Estruturas
-- legadas são preservadas para auditoria e bloqueadas para novos usos.

create or replace function public.preencher_conta_operacional_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if new.conta_id is null then raise exception 'Selecione uma conta de vendas antes de continuar.'; end if;
  if not public.vendas_mobile_pode_operar_conta(new.conta_id) then
    raise exception 'Você não possui permissão para operar esta conta de vendas.';
  end if;
  new.user_id := auth.uid();
  return new;
end;
$$;

create table if not exists public.vendas_mobile_contas_preferencias (
  conta_id uuid primary key references public.vendas_mobile_contas(id) on delete cascade,
  atualizado_por uuid references auth.users(id) on delete set null,
  versao integer not null default 1 check (versao >= 1),
  preferencias jsonb not null default '{}'::jsonb check (jsonb_typeof(preferencias) = 'object'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
insert into public.vendas_mobile_contas_preferencias(conta_id, atualizado_por, versao, preferencias, criado_em, atualizado_em)
select conta.id, preferencia.user_id, preferencia.versao, preferencia.preferencias,
       preferencia.criado_em, preferencia.atualizado_em
from public.vendas_mobile_preferencias preferencia
cross join lateral (
  select c.id from public.vendas_mobile_contas_usuarios membro
  join public.vendas_mobile_contas c on c.id = membro.conta_id
  where membro.user_id = preferencia.user_id and membro.status = 'ativo' and c.arquivada_em is null
  order by (membro.papel = 'proprietario') desc, c.criado_em limit 1
) conta
on conflict (conta_id) do nothing;
alter table public.vendas_mobile_contas_preferencias enable row level security;
drop policy if exists vendas_contas_preferencias_select on public.vendas_mobile_contas_preferencias;
drop policy if exists vendas_contas_preferencias_insert on public.vendas_mobile_contas_preferencias;
drop policy if exists vendas_contas_preferencias_update on public.vendas_mobile_contas_preferencias;
drop policy if exists vendas_contas_preferencias_delete on public.vendas_mobile_contas_preferencias;
create policy vendas_contas_preferencias_select on public.vendas_mobile_contas_preferencias
  for select to authenticated using (public.vendas_mobile_pode_ler_conta(conta_id));
create policy vendas_contas_preferencias_insert on public.vendas_mobile_contas_preferencias
  for insert to authenticated with check (public.vendas_mobile_pode_operar_conta(conta_id));
create policy vendas_contas_preferencias_update on public.vendas_mobile_contas_preferencias
  for update to authenticated using (public.vendas_mobile_pode_operar_conta(conta_id))
  with check (public.vendas_mobile_pode_operar_conta(conta_id));
create policy vendas_contas_preferencias_delete on public.vendas_mobile_contas_preferencias
  for delete to authenticated using (public.vendas_mobile_pode_gerir_conta(conta_id));
grant select, insert, update, delete on public.vendas_mobile_contas_preferencias to authenticated;

create table if not exists public.vendas_mobile_contas_catalogo_recebimentos (
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  catalogo_produto_id uuid not null references public.vendas_mobile_catalogo_produtos(id) on delete cascade,
  produto_id uuid references public.vendas_mobile_produtos(id) on delete set null,
  status text not null default 'recebido' check (status in ('recebido', 'removido')),
  recebido_por uuid references auth.users(id) on delete set null,
  recebido_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (conta_id, catalogo_produto_id)
);
insert into public.vendas_mobile_contas_catalogo_recebimentos(
  conta_id, catalogo_produto_id, produto_id, status, recebido_por, recebido_em, atualizado_em
)
select distinct on (produto.conta_id, recibo.catalogo_produto_id)
  produto.conta_id, recibo.catalogo_produto_id, recibo.produto_id, recibo.status,
  recibo.user_id, recibo.recebido_em, recibo.atualizado_em
from public.vendas_mobile_catalogo_recebimentos recibo
join public.vendas_mobile_produtos produto on produto.id = recibo.produto_id
where produto.conta_id is not null
order by produto.conta_id, recibo.catalogo_produto_id,
         (recibo.status = 'recebido') desc, recibo.atualizado_em desc
on conflict (conta_id, catalogo_produto_id) do nothing;
alter table public.vendas_mobile_contas_catalogo_recebimentos enable row level security;
drop policy if exists vendas_contas_catalogo_select on public.vendas_mobile_contas_catalogo_recebimentos;
create policy vendas_contas_catalogo_select on public.vendas_mobile_contas_catalogo_recebimentos
  for select to authenticated using (public.vendas_mobile_pode_ler_conta(conta_id));
grant select on public.vendas_mobile_contas_catalogo_recebimentos to authenticated;

create or replace function public.registrar_remocao_catalogo_vendas_mobile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.catalogo_produto_origem_id is not null then
    update public.vendas_mobile_contas_catalogo_recebimentos
       set status = 'removido', produto_id = null, atualizado_em = now()
     where conta_id = old.conta_id and catalogo_produto_id = old.catalogo_produto_origem_id;
  end if;
  return old;
end;
$$;

create or replace function public.sincronizar_catalogo_vendas_mobile_rpc(p_conta_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_empresa_id uuid; v_catalogo public.vendas_mobile_catalogos;
  v_produto public.vendas_mobile_catalogo_produtos; v_produto_conta_id uuid;
  v_adicionados integer := 0; v_ignorados integer := 0;
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('catalogo-conta:' || p_conta_id::text, 0));
  select empresa_id into v_empresa_id from public.vendas_mobile_contas
  where id = p_conta_id and arquivada_em is null;
  if v_empresa_id is null then return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0); end if;
  if not exists (
    select 1 from public.vendas_mobile_vinculos_comerciais vinculo
    where vinculo.user_id = auth.uid() and vinculo.empresa_id = v_empresa_id
      and vinculo.ativo and vinculo.catalogo_ativo
  ) then return jsonb_build_object('adicionados', 0, 'ja_recebidos', 0); end if;
  for v_catalogo in
    select catalogo.* from public.vendas_mobile_catalogos catalogo
    join public.empresa_modulos modulo on modulo.empresa_id = catalogo.empresa_id
      and modulo.modulo_id = 'vendas_mobile' and modulo.ativo = true
    where catalogo.empresa_id = v_empresa_id and catalogo.ativo = true
  loop
    for v_produto in select * from public.vendas_mobile_catalogo_produtos
      where catalogo_id = v_catalogo.id and ativo = true
    loop
      if exists (select 1 from public.vendas_mobile_contas_catalogo_recebimentos r
        where r.conta_id = p_conta_id and r.catalogo_produto_id = v_produto.id) then
        v_ignorados := v_ignorados + 1; continue;
      end if;
      select id into v_produto_conta_id from public.vendas_mobile_produtos
      where conta_id = p_conta_id and catalogo_produto_origem_id = v_produto.id limit 1;
      if v_produto_conta_id is null then
        insert into public.vendas_mobile_produtos(
          user_id, conta_id, marca, categoria, sku, nome, descricao, preco, preco_custo,
          estoque, unidade, imagem_url, metadados, ativo, catalogo_empresa_id,
          catalogo_produto_origem_id, estoque_controlado
        ) values (
          auth.uid(), p_conta_id, v_produto.marca, v_produto.categoria, v_produto.sku,
          v_produto.nome, v_produto.descricao, v_produto.preco_venda, v_produto.preco_custo,
          null, v_produto.unidade, v_produto.imagem_url,
          jsonb_build_object('catalogo_empresa', jsonb_build_object('catalogo_id', v_catalogo.id, 'produto_id', v_produto.id)),
          true, v_catalogo.id, v_produto.id, false
        ) returning id into v_produto_conta_id;
        v_adicionados := v_adicionados + 1;
      else v_ignorados := v_ignorados + 1; end if;
      insert into public.vendas_mobile_contas_catalogo_recebimentos(
        conta_id, catalogo_produto_id, produto_id, status, recebido_por
      ) values (p_conta_id, v_produto.id, v_produto_conta_id, 'recebido', auth.uid())
      on conflict (conta_id, catalogo_produto_id) do nothing;
    end loop;
  end loop;
  return jsonb_build_object('adicionados', v_adicionados, 'ja_recebidos', v_ignorados);
end;
$$;

alter table public.vendas_mobile_estoque_movimentos
  add column if not exists conta_id uuid references public.vendas_mobile_contas(id) on delete cascade;
update public.vendas_mobile_estoque_movimentos movimento
set conta_id = produto.conta_id from public.vendas_mobile_produtos produto
where produto.id = movimento.produto_id and movimento.conta_id is null;
create index if not exists vendas_estoque_movimentos_conta_idx
  on public.vendas_mobile_estoque_movimentos(conta_id, criado_em desc);
drop policy if exists vendas_estoque_movimentos_proprios on public.vendas_mobile_estoque_movimentos;
drop policy if exists vendas_estoque_movimentos_conta_select on public.vendas_mobile_estoque_movimentos;
create policy vendas_estoque_movimentos_conta_select on public.vendas_mobile_estoque_movimentos
  for select to authenticated using (
    (conta_id is not null and public.vendas_mobile_pode_ler_conta(conta_id))
    or (conta_id is null and user_id = auth.uid())
  );

create or replace function public.movimentar_estoque_vendas_mobile_rpc(
  p_conta_id uuid, p_produto_id uuid, p_tipo text, p_quantidade numeric, p_observacao text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_produto public.vendas_mobile_produtos; v_anterior numeric(12,3); v_final numeric(12,3);
begin
  if auth.uid() is null then raise exception 'Sessão expirada.'; end if;
  if p_conta_id is null or not public.vendas_mobile_pode_operar_conta(p_conta_id) then
    raise exception 'Conta de vendas inválida ou sem permissão.';
  end if;
  select * into v_produto from public.vendas_mobile_produtos
  where id = p_produto_id and conta_id = p_conta_id for update;
  if v_produto.id is null then raise exception 'Produto não encontrado nesta conta.'; end if;
  if not v_produto.estoque_controlado then raise exception 'Ative o controle de estoque deste produto antes de movimentá-lo.'; end if;
  v_anterior := coalesce(v_produto.estoque, 0);
  if p_tipo = 'entrada' then
    if coalesce(p_quantidade, 0) <= 0 then raise exception 'Informe uma entrada maior que zero.'; end if;
    v_final := v_anterior + p_quantidade;
  elsif p_tipo = 'ajuste' then
    if p_quantidade is null or p_quantidade < 0 then raise exception 'Informe o saldo final do ajuste.'; end if;
    v_final := p_quantidade;
  else raise exception 'Movimentação de estoque inválida.'; end if;
  update public.vendas_mobile_produtos set estoque = v_final, atualizado_em = now()
  where id = v_produto.id and conta_id = p_conta_id;
  insert into public.vendas_mobile_estoque_movimentos(
    user_id, conta_id, produto_id, tipo, quantidade, saldo_anterior, saldo_final, observacao
  ) values (
    auth.uid(), p_conta_id, v_produto.id, p_tipo,
    case when p_tipo = 'ajuste' then v_final - v_anterior else p_quantidade end,
    v_anterior, v_final, nullif(trim(p_observacao), '')
  );
  return jsonb_build_object('produto_id', v_produto.id, 'conta_id', p_conta_id,
    'saldo_anterior', v_anterior, 'saldo_final', v_final, 'tipo', p_tipo);
end;
$$;

alter table public.vendas_mobile_backups_reset
  add column if not exists conta_id uuid references public.vendas_mobile_contas(id) on delete set null;
create index if not exists vendas_backups_reset_conta_idx
  on public.vendas_mobile_backups_reset(conta_id, criado_em desc);
drop policy if exists vendas_backups_reset_proprios on public.vendas_mobile_backups_reset;
drop policy if exists vendas_backups_reset_conta_select on public.vendas_mobile_backups_reset;
create policy vendas_backups_reset_conta_select on public.vendas_mobile_backups_reset
  for select to authenticated using (
    (conta_id is not null and public.vendas_mobile_pode_ler_conta(conta_id))
    or (conta_id is null and user_id = auth.uid())
  );

create or replace function public.resetar_vendas_mobile_rpc(p_confirmacao text, p_conta_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_backup_id uuid;
begin
  if auth.uid() is null or upper(trim(coalesce(p_confirmacao, ''))) <> 'RESETAR' then
    raise exception 'Confirmação de segurança inválida.';
  end if;
  if p_conta_id is null or not public.vendas_mobile_pode_gerir_conta(p_conta_id) then
    raise exception 'Somente o proprietário ou administrador pode resetar esta conta.';
  end if;
  insert into public.vendas_mobile_backups_reset(user_id, conta_id, dados)
  values (auth.uid(), p_conta_id, jsonb_build_object(
    'schema', 'vendas_mobile_conta_v1', 'gerado_em', now(),
    'conta', coalesce((select to_jsonb(c) from public.vendas_mobile_contas c where c.id = p_conta_id), '{}'::jsonb),
    'membros', coalesce((select jsonb_agg(to_jsonb(m)) from public.vendas_mobile_contas_usuarios m where m.conta_id = p_conta_id), '[]'::jsonb),
    'clientes', coalesce((select jsonb_agg(to_jsonb(c)) from public.vendas_mobile_clientes c where c.conta_id = p_conta_id), '[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_pedidos p where p.conta_id = p_conta_id), '[]'::jsonb),
    'itens_pedidos', coalesce((select jsonb_agg(to_jsonb(i)) from public.vendas_mobile_pedido_itens i join public.vendas_mobile_pedidos p on p.id = i.pedido_id where p.conta_id = p_conta_id), '[]'::jsonb),
    'pagamentos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_pagamentos p where p.conta_id = p_conta_id), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(to_jsonb(p)) from public.vendas_mobile_produtos p where p.conta_id = p_conta_id), '[]'::jsonb),
    'estoque_movimentos', coalesce((select jsonb_agg(to_jsonb(m)) from public.vendas_mobile_estoque_movimentos m where m.conta_id = p_conta_id), '[]'::jsonb),
    'agenda', coalesce((select jsonb_agg(to_jsonb(a)) from public.vendas_mobile_agenda a where a.conta_id = p_conta_id), '[]'::jsonb),
    'catalogo_recebimentos', coalesce((select jsonb_agg(to_jsonb(r)) from public.vendas_mobile_contas_catalogo_recebimentos r where r.conta_id = p_conta_id), '[]'::jsonb),
    'preferencias', coalesce((select to_jsonb(p) from public.vendas_mobile_contas_preferencias p where p.conta_id = p_conta_id), '{}'::jsonb)
  )) returning id into v_backup_id;
  perform set_config('app.vendas_mobile_transferencia', '1', true);
  delete from public.vendas_mobile_pagamentos where conta_id = p_conta_id;
  delete from public.vendas_mobile_pedidos where conta_id = p_conta_id;
  delete from public.vendas_mobile_agenda where conta_id = p_conta_id;
  delete from public.vendas_mobile_produtos where conta_id = p_conta_id;
  delete from public.vendas_mobile_clientes where conta_id = p_conta_id;
  delete from public.vendas_mobile_contas_catalogo_recebimentos where conta_id = p_conta_id;
  delete from public.vendas_mobile_contas_preferencias where conta_id = p_conta_id;
  perform set_config('app.vendas_mobile_transferencia', '0', true);
  return v_backup_id;
end;
$$;

revoke all on function public.sincronizar_catalogo_vendas_mobile_rpc() from authenticated;
revoke all on function public.movimentar_estoque_vendas_mobile_rpc(uuid, text, numeric, text) from authenticated;
revoke all on function public.resetar_vendas_mobile_rpc(text) from authenticated;
revoke all on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) from public;
revoke all on function public.movimentar_estoque_vendas_mobile_rpc(uuid, uuid, text, numeric, text) from public;
revoke all on function public.resetar_vendas_mobile_rpc(text, uuid) from public;
grant execute on function public.sincronizar_catalogo_vendas_mobile_rpc(uuid) to authenticated;
grant execute on function public.movimentar_estoque_vendas_mobile_rpc(uuid, uuid, text, numeric, text) to authenticated;
grant execute on function public.resetar_vendas_mobile_rpc(text, uuid) to authenticated;
