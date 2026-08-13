-- Backup, pontos de restauração e restauração isolados por conta do AvantaVendas.
-- Nenhuma operação deste arquivo usa auth.uid() como chave dos dados operacionais:
-- um mesmo login pode participar de várias contas sem misturar seus registros.

create table if not exists public.vendas_mobile_pontos_restauracao (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  nome text,
  origem text not null check (origem in ('manual', 'automatico_diario', 'pre_restauracao', 'pre_reset')),
  schema_versao integer not null default 1,
  snapshot jsonb not null,
  tamanho_bytes bigint not null default 0,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists vendas_mobile_pontos_conta_data_idx
  on public.vendas_mobile_pontos_restauracao(conta_id, criado_em desc);

create table if not exists public.vendas_mobile_pontos_restauracao_estado (
  conta_id uuid primary key references public.vendas_mobile_contas(id) on delete cascade,
  alterado_em timestamptz not null default now(),
  ultimo_diario_em timestamptz
);

create table if not exists public.vendas_mobile_restauracoes_auditoria (
  id uuid primary key default gen_random_uuid(),
  conta_id uuid not null references public.vendas_mobile_contas(id) on delete cascade,
  ponto_origem_id uuid references public.vendas_mobile_pontos_restauracao(id) on delete set null,
  ponto_seguranca_id uuid references public.vendas_mobile_pontos_restauracao(id) on delete set null,
  executado_por uuid references auth.users(id) on delete set null,
  modo text not null default 'substituir',
  criado_em timestamptz not null default now()
);

alter table public.vendas_mobile_pontos_restauracao enable row level security;
alter table public.vendas_mobile_pontos_restauracao_estado enable row level security;
alter table public.vendas_mobile_restauracoes_auditoria enable row level security;

drop policy if exists vendas_mobile_pontos_leitura on public.vendas_mobile_pontos_restauracao;
create policy vendas_mobile_pontos_leitura on public.vendas_mobile_pontos_restauracao
  for select to authenticated
  using (public.vendas_mobile_papel_conta(conta_id) in ('proprietario', 'administrador'));

drop policy if exists vendas_mobile_pontos_exclusao on public.vendas_mobile_pontos_restauracao;
create policy vendas_mobile_pontos_exclusao on public.vendas_mobile_pontos_restauracao
  for delete to authenticated
  using (public.vendas_mobile_papel_conta(conta_id) = 'proprietario');

drop policy if exists vendas_mobile_auditoria_leitura on public.vendas_mobile_restauracoes_auditoria;
create policy vendas_mobile_auditoria_leitura on public.vendas_mobile_restauracoes_auditoria
  for select to authenticated
  using (public.vendas_mobile_papel_conta(conta_id) in ('proprietario', 'administrador'));

create or replace function public.vendas_mobile_papel_usuario_conta(p_conta_id uuid, p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel
  from public.vendas_mobile_contas_usuarios
  where conta_id = p_conta_id
    and user_id = p_user_id
    and status = 'ativo'
  limit 1
$$;

create or replace function public.exportar_snapshot_conta_vendas_mobile(p_conta_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conta public.vendas_mobile_contas%rowtype;
begin
  select * into v_conta
  from public.vendas_mobile_contas
  where id = p_conta_id and arquivada_em is null;

  if v_conta.id is null then
    raise exception 'Conta de vendas não encontrada.';
  end if;

  return jsonb_build_object(
    'produto', 'AvantaVendas',
    'schema_versao', 1,
    'gerado_em', now(),
    'conta_origem', jsonb_build_object('id', v_conta.id, 'nome', v_conta.nome),
    'dados', jsonb_build_object(
      'clientes', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_clientes t where t.conta_id = p_conta_id), '[]'::jsonb),
      'produtos', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_produtos t where t.conta_id = p_conta_id), '[]'::jsonb),
      'pedidos', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_pedidos t where t.conta_id = p_conta_id), '[]'::jsonb),
      'pedido_itens', coalesce((
        select jsonb_agg(to_jsonb(i) order by i.criado_em, i.id)
        from public.vendas_mobile_pedido_itens i
        join public.vendas_mobile_pedidos p on p.id = i.pedido_id
        where p.conta_id = p_conta_id
      ), '[]'::jsonb),
      'pagamentos', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_pagamentos t where t.conta_id = p_conta_id), '[]'::jsonb),
      'agenda', coalesce((select jsonb_agg(to_jsonb(t) order by t.criado_em, t.id) from public.vendas_mobile_agenda t where t.conta_id = p_conta_id), '[]'::jsonb),
      'estoque_movimentos', coalesce((
        select jsonb_agg(to_jsonb(m) order by m.criado_em, m.id)
        from public.vendas_mobile_estoque_movimentos m
        join public.vendas_mobile_produtos p on p.id = m.produto_id
        where p.conta_id = p_conta_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.criar_ponto_restauracao_vendas_mobile(
  p_conta_id uuid,
  p_origem text default 'manual',
  p_criado_por uuid default null,
  p_nome text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_id uuid;
  v_papel text;
begin
  if p_origem not in ('manual', 'automatico_diario', 'pre_restauracao', 'pre_reset') then
    raise exception 'Origem do ponto de restauração inválida.';
  end if;

  if p_criado_por is not null then
    v_papel := public.vendas_mobile_papel_usuario_conta(p_conta_id, p_criado_por);
    if v_papel not in ('proprietario', 'administrador') then
      raise exception 'Sem permissão para criar um ponto desta conta.';
    end if;
  elsif p_origem <> 'automatico_diario' then
    raise exception 'Responsável pelo ponto de restauração não informado.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('av-vendas:' || p_conta_id::text, 0));
  v_snapshot := public.exportar_snapshot_conta_vendas_mobile(p_conta_id);

  insert into public.vendas_mobile_pontos_restauracao
    (conta_id, nome, origem, schema_versao, snapshot, tamanho_bytes, criado_por)
  values
    (p_conta_id, nullif(trim(coalesce(p_nome, '')), ''), p_origem, 1, v_snapshot, pg_column_size(v_snapshot), p_criado_por)
  returning id into v_id;

  if p_origem = 'automatico_diario' then
    insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em, ultimo_diario_em)
    values (p_conta_id, now(), now())
    on conflict (conta_id) do update set ultimo_diario_em = excluded.ultimo_diario_em;
  end if;

  delete from public.vendas_mobile_pontos_restauracao p
  where p.conta_id = p_conta_id
    and p.origem = 'manual'
    and p.id not in (
      select id from public.vendas_mobile_pontos_restauracao
      where conta_id = p_conta_id and origem = 'manual'
      order by criado_em desc limit 10
    );

  delete from public.vendas_mobile_pontos_restauracao
  where conta_id = p_conta_id
    and (
      (origem = 'automatico_diario' and criado_em < now() - interval '30 days')
      or (origem in ('pre_restauracao', 'pre_reset') and criado_em < now() - interval '90 days')
    );

  return v_id;
end;
$$;

create or replace function public.restaurar_snapshot_conta_vendas_mobile(
  p_conta_id uuid,
  p_snapshot jsonb,
  p_criado_por uuid,
  p_ponto_origem_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ponto_seguranca uuid;
  v_dados jsonb;
begin
  if public.vendas_mobile_papel_usuario_conta(p_conta_id, p_criado_por) <> 'proprietario' then
    raise exception 'Somente o proprietário pode restaurar esta conta.';
  end if;
  if coalesce((p_snapshot ->> 'schema_versao')::integer, 0) <> 1 then
    raise exception 'Versão de backup incompatível.';
  end if;
  if nullif(p_snapshot #>> '{conta_origem,id}', '')::uuid is distinct from p_conta_id then
    raise exception 'Este backup pertence a outra conta de vendas.';
  end if;
  if jsonb_typeof(p_snapshot -> 'dados') <> 'object' then
    raise exception 'Arquivo de backup inválido.';
  end if;

  v_dados := p_snapshot -> 'dados';
  if exists (
    select 1
    from unnest(array['clientes','produtos','pedidos','pagamentos','agenda']) chave
    cross join lateral jsonb_array_elements(coalesce(v_dados -> chave, '[]'::jsonb)) registro
    where nullif(registro ->> 'conta_id', '')::uuid is distinct from p_conta_id
  ) then
    raise exception 'O backup contém registros de outra conta de vendas.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(v_dados -> 'pedido_itens', '[]'::jsonb)) item
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v_dados -> 'pedidos', '[]'::jsonb)) pedido
      where pedido ->> 'id' = item ->> 'pedido_id'
    )
  ) then
    raise exception 'O backup contém itens sem pedido válido.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(v_dados -> 'estoque_movimentos', '[]'::jsonb)) movimento
    where not exists (
      select 1 from jsonb_array_elements(coalesce(v_dados -> 'produtos', '[]'::jsonb)) produto
      where produto ->> 'id' = movimento ->> 'produto_id'
    )
  ) then
    raise exception 'O backup contém movimentos sem produto válido.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('av-vendas:' || p_conta_id::text, 0));
  v_ponto_seguranca := public.criar_ponto_restauracao_vendas_mobile(
    p_conta_id, 'pre_restauracao', p_criado_por, 'Antes da restauração'
  );
  perform set_config('app.vendas_mobile_transferencia', '1', true);
  perform set_config('app.vendas_mobile_restaurando', '1', true);

  delete from public.vendas_mobile_pagamentos where conta_id = p_conta_id;
  delete from public.vendas_mobile_pedido_itens i
    using public.vendas_mobile_pedidos p
    where i.pedido_id = p.id and p.conta_id = p_conta_id;
  delete from public.vendas_mobile_pedidos where conta_id = p_conta_id;
  delete from public.vendas_mobile_agenda where conta_id = p_conta_id;
  delete from public.vendas_mobile_estoque_movimentos m
    using public.vendas_mobile_produtos p
    where m.produto_id = p.id and p.conta_id = p_conta_id;
  delete from public.vendas_mobile_produtos where conta_id = p_conta_id;
  delete from public.vendas_mobile_clientes where conta_id = p_conta_id;

  insert into public.vendas_mobile_clientes
    select * from jsonb_populate_recordset(null::public.vendas_mobile_clientes, coalesce(v_dados -> 'clientes', '[]'::jsonb));
  insert into public.vendas_mobile_produtos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_produtos, coalesce(v_dados -> 'produtos', '[]'::jsonb));
  insert into public.vendas_mobile_pedidos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_pedidos, coalesce(v_dados -> 'pedidos', '[]'::jsonb));
  insert into public.vendas_mobile_pedido_itens
    select * from jsonb_populate_recordset(null::public.vendas_mobile_pedido_itens, coalesce(v_dados -> 'pedido_itens', '[]'::jsonb));
  insert into public.vendas_mobile_pagamentos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_pagamentos, coalesce(v_dados -> 'pagamentos', '[]'::jsonb));
  insert into public.vendas_mobile_agenda
    select * from jsonb_populate_recordset(null::public.vendas_mobile_agenda, coalesce(v_dados -> 'agenda', '[]'::jsonb));
  insert into public.vendas_mobile_estoque_movimentos
    select * from jsonb_populate_recordset(null::public.vendas_mobile_estoque_movimentos, coalesce(v_dados -> 'estoque_movimentos', '[]'::jsonb));

  insert into public.vendas_mobile_restauracoes_auditoria
    (conta_id, ponto_origem_id, ponto_seguranca_id, executado_por, modo)
  values (p_conta_id, p_ponto_origem_id, v_ponto_seguranca, p_criado_por, 'substituir');

  insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em)
  values (p_conta_id, now())
  on conflict (conta_id) do update set alterado_em = excluded.alterado_em;

  return v_ponto_seguranca;
end;
$$;

create or replace function public.restaurar_ponto_restauracao_vendas_mobile(
  p_conta_id uuid,
  p_ponto_id uuid,
  p_criado_por uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_snapshot jsonb;
begin
  select snapshot into v_snapshot
  from public.vendas_mobile_pontos_restauracao
  where id = p_ponto_id and conta_id = p_conta_id;
  if v_snapshot is null then raise exception 'Ponto de restauração não encontrado.'; end if;
  return public.restaurar_snapshot_conta_vendas_mobile(p_conta_id, v_snapshot, p_criado_por, p_ponto_id);
end;
$$;

create or replace function public.resetar_conta_vendas_mobile_rpc(
  p_conta_id uuid,
  p_confirmacao text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid := auth.uid();
  v_ponto_seguranca uuid;
  v_clientes integer;
  v_produtos integer;
  v_pedidos integer;
  v_pagamentos integer;
  v_agenda integer;
begin
  if v_usuario is null then raise exception 'Sessão expirada.'; end if;
  if upper(trim(coalesce(p_confirmacao, ''))) <> 'RESETAR' then raise exception 'Confirmação de segurança inválida.'; end if;
  if public.vendas_mobile_papel_usuario_conta(p_conta_id, v_usuario) <> 'proprietario' then
    raise exception 'Somente o proprietário pode resetar esta conta.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('av-vendas:' || p_conta_id::text, 0));
  v_ponto_seguranca := public.criar_ponto_restauracao_vendas_mobile(
    p_conta_id, 'pre_reset', v_usuario, 'Antes do reset'
  );
  perform set_config('app.vendas_mobile_transferencia', '1', true);
  perform set_config('app.vendas_mobile_restaurando', '1', true);

  delete from public.vendas_mobile_pagamentos where conta_id = p_conta_id;
  get diagnostics v_pagamentos = row_count;
  delete from public.vendas_mobile_pedido_itens i using public.vendas_mobile_pedidos p
    where i.pedido_id = p.id and p.conta_id = p_conta_id;
  delete from public.vendas_mobile_pedidos where conta_id = p_conta_id;
  get diagnostics v_pedidos = row_count;
  delete from public.vendas_mobile_agenda where conta_id = p_conta_id;
  get diagnostics v_agenda = row_count;
  delete from public.vendas_mobile_estoque_movimentos m using public.vendas_mobile_produtos p
    where m.produto_id = p.id and p.conta_id = p_conta_id;
  delete from public.vendas_mobile_produtos where conta_id = p_conta_id;
  get diagnostics v_produtos = row_count;
  delete from public.vendas_mobile_clientes where conta_id = p_conta_id;
  get diagnostics v_clientes = row_count;

  insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em)
  values (p_conta_id, now())
  on conflict (conta_id) do update set alterado_em = excluded.alterado_em;

  return jsonb_build_object(
    'ok', true,
    'ponto_seguranca_id', v_ponto_seguranca,
    'clientes', v_clientes,
    'produtos', v_produtos,
    'pedidos', v_pedidos,
    'pagamentos', v_pagamentos,
    'agenda', v_agenda
  );
end;
$$;

create or replace function public.marcar_ponto_restauracao_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_conta_id uuid;
begin
  if current_setting('app.vendas_mobile_restaurando', true) = '1' then
    return coalesce(new, old);
  end if;
  v_conta_id := coalesce(new.conta_id, old.conta_id);
  if v_conta_id is not null then
    insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em)
    values (v_conta_id, now())
    on conflict (conta_id) do update set alterado_em = excluded.alterado_em;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.marcar_ponto_restauracao_dependencia_vendas_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_referencia uuid; v_conta_id uuid;
begin
  if current_setting('app.vendas_mobile_restaurando', true) = '1' then
    return coalesce(new, old);
  end if;
  if tg_table_name = 'vendas_mobile_pedido_itens' then
    v_referencia := coalesce(new.pedido_id, old.pedido_id);
    select conta_id into v_conta_id from public.vendas_mobile_pedidos where id = v_referencia;
  else
    v_referencia := coalesce(new.produto_id, old.produto_id);
    select conta_id into v_conta_id from public.vendas_mobile_produtos where id = v_referencia;
  end if;
  if v_conta_id is not null then
    insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em)
    values (v_conta_id, now())
    on conflict (conta_id) do update set alterado_em = excluded.alterado_em;
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['vendas_mobile_clientes','vendas_mobile_produtos','vendas_mobile_pedidos','vendas_mobile_pagamentos','vendas_mobile_agenda'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_marcar_restauracao', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.marcar_ponto_restauracao_vendas_mobile()', t || '_marcar_restauracao', t);
  end loop;
end $$;

drop trigger if exists vendas_mobile_pedido_itens_marcar_restauracao on public.vendas_mobile_pedido_itens;
create trigger vendas_mobile_pedido_itens_marcar_restauracao
  after insert or update or delete on public.vendas_mobile_pedido_itens
  for each row execute function public.marcar_ponto_restauracao_dependencia_vendas_mobile();

drop trigger if exists vendas_mobile_estoque_movimentos_marcar_restauracao on public.vendas_mobile_estoque_movimentos;
create trigger vendas_mobile_estoque_movimentos_marcar_restauracao
  after insert or update or delete on public.vendas_mobile_estoque_movimentos
  for each row execute function public.marcar_ponto_restauracao_dependencia_vendas_mobile();

revoke all on function public.exportar_snapshot_conta_vendas_mobile(uuid) from public, anon, authenticated;
revoke all on function public.criar_ponto_restauracao_vendas_mobile(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.restaurar_snapshot_conta_vendas_mobile(uuid, jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.restaurar_ponto_restauracao_vendas_mobile(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.exportar_snapshot_conta_vendas_mobile(uuid) to service_role;
grant execute on function public.criar_ponto_restauracao_vendas_mobile(uuid, text, uuid, text) to service_role;
grant execute on function public.restaurar_snapshot_conta_vendas_mobile(uuid, jsonb, uuid, uuid) to service_role;
grant execute on function public.restaurar_ponto_restauracao_vendas_mobile(uuid, uuid, uuid) to service_role;
revoke all on function public.resetar_conta_vendas_mobile_rpc(uuid, text) from public, anon;
grant execute on function public.resetar_conta_vendas_mobile_rpc(uuid, text) to authenticated;

insert into public.vendas_mobile_pontos_restauracao_estado(conta_id, alterado_em)
select id, now() from public.vendas_mobile_contas where arquivada_em is null
on conflict (conta_id) do nothing;
