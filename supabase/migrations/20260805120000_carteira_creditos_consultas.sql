-- Carteira genérica AvantaLab. Nesta primeira entrega, somente consultas usam o saldo.
create table if not exists public.carteiras (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  saldo_centavos bigint not null default 0 check (saldo_centavos >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.carteira_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in ('recarga','consumo','estorno','ajuste','chargeback')),
  valor_centavos bigint not null check (valor_centavos <> 0),
  saldo_apos_centavos bigint not null check (saldo_apos_centavos >= 0),
  servico_codigo text,
  referencia_tipo text,
  referencia_id uuid,
  idempotencia text not null unique,
  descricao text not null,
  metadados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists carteira_movimentacoes_empresa_data_idx
  on public.carteira_movimentacoes (empresa_id, criado_em desc);

create table if not exists public.carteira_recargas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  criado_por uuid not null references auth.users(id) on delete restrict,
  valor_centavos bigint not null check (valor_centavos between 3000 and 1000000),
  status text not null default 'pendente' check (status in ('criando','pendente','confirmada','recebida','vencida','cancelada','estornada','chargeback','erro')),
  provedor text not null default 'ASAAS' check (provedor = 'ASAAS'),
  gateway_payment_id text unique,
  forma_pagamento text,
  invoice_url text,
  vencimento date,
  creditada_em timestamptz,
  payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists carteira_recargas_empresa_data_idx
  on public.carteira_recargas (empresa_id, criado_em desc);

create table if not exists public.consultas_credito (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  criado_por uuid not null references auth.users(id) on delete restrict,
  documento text not null,
  tipo_documento text not null check (tipo_documento in ('CPF','CNPJ')),
  tipo_consulta text not null check (tipo_consulta in ('credito_essencial','credito_avancada','credito_completa')),
  provedor text not null default 'DIRECT_DATA' check (provedor = 'DIRECT_DATA'),
  valor_centavos bigint not null check (valor_centavos > 0),
  status text not null default 'processando' check (status in ('processando','concluida','falhou','estornada','revisao')),
  idempotencia text not null unique,
  resultado_json jsonb,
  erro_codigo text,
  consultado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists consultas_credito_empresa_data_idx
  on public.consultas_credito (empresa_id, criado_em desc);

alter table public.carteiras enable row level security;
alter table public.carteira_movimentacoes enable row level security;
alter table public.carteira_recargas enable row level security;
alter table public.consultas_credito enable row level security;

create policy "carteiras_select_empresa" on public.carteiras for select
  using (exists (select 1 from public.usuarios_empresa u where u.empresa_id = carteiras.empresa_id and u.user_id = auth.uid() and u.status = 'ativo'));
create policy "carteira_movimentacoes_select_empresa" on public.carteira_movimentacoes for select
  using (exists (select 1 from public.usuarios_empresa u where u.empresa_id = carteira_movimentacoes.empresa_id and u.user_id = auth.uid() and u.status = 'ativo'));
create policy "carteira_recargas_select_empresa" on public.carteira_recargas for select
  using (exists (select 1 from public.usuarios_empresa u where u.empresa_id = carteira_recargas.empresa_id and u.user_id = auth.uid() and u.status = 'ativo'));
create policy "consultas_credito_select_empresa" on public.consultas_credito for select
  using (exists (select 1 from public.usuarios_empresa u where u.empresa_id = consultas_credito.empresa_id and u.user_id = auth.uid() and u.status = 'ativo'));

-- Nenhuma escrita direta pelo navegador. As rotinas abaixo são chamadas somente pelo servidor.
revoke insert, update, delete on public.carteiras, public.carteira_movimentacoes, public.carteira_recargas, public.consultas_credito from anon, authenticated;

create or replace function public.creditar_recarga_carteira(p_recarga_id uuid, p_gateway_payment_id text, p_evento_id text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_recarga public.carteira_recargas%rowtype; v_saldo bigint;
begin
  select * into v_recarga from public.carteira_recargas where id = p_recarga_id and gateway_payment_id = p_gateway_payment_id for update;
  if not found then raise exception 'recarga_nao_encontrada'; end if;
  if v_recarga.creditada_em is not null then
    select saldo_centavos into v_saldo from public.carteiras where empresa_id = v_recarga.empresa_id;
    return coalesce(v_saldo, 0);
  end if;
  insert into public.carteiras (empresa_id) values (v_recarga.empresa_id) on conflict do nothing;
  update public.carteiras set saldo_centavos = saldo_centavos + v_recarga.valor_centavos, atualizado_em = now()
    where empresa_id = v_recarga.empresa_id returning saldo_centavos into v_saldo;
  update public.carteira_recargas set status = 'confirmada', creditada_em = now(), atualizado_em = now() where id = v_recarga.id;
  insert into public.carteira_movimentacoes (empresa_id, usuario_id, tipo, valor_centavos, saldo_apos_centavos, referencia_tipo, referencia_id, idempotencia, descricao)
    values (v_recarga.empresa_id, v_recarga.criado_por, 'recarga', v_recarga.valor_centavos, v_saldo, 'recarga', v_recarga.id, 'asaas:' || p_gateway_payment_id, 'Créditos adicionados à carteira')
    on conflict (idempotencia) do nothing;
  return v_saldo;
end $$;

create or replace function public.consumir_credito_consulta(p_empresa_id uuid, p_usuario_id uuid, p_documento text, p_tipo_documento text, p_tipo_consulta text, p_valor_centavos bigint, p_idempotencia text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_saldo bigint; v_consulta_id uuid;
begin
  if not exists (select 1 from public.usuarios_empresa where empresa_id = p_empresa_id and user_id = p_usuario_id and status = 'ativo') then raise exception 'sem_acesso'; end if;
  insert into public.carteiras (empresa_id) values (p_empresa_id) on conflict do nothing;
  select saldo_centavos into v_saldo from public.carteiras where empresa_id = p_empresa_id for update;
  if v_saldo < p_valor_centavos then raise exception 'saldo_insuficiente'; end if;
  select id into v_consulta_id from public.consultas_credito where idempotencia = p_idempotencia;
  if v_consulta_id is not null then return v_consulta_id; end if;
  insert into public.consultas_credito (empresa_id, criado_por, documento, tipo_documento, tipo_consulta, valor_centavos, idempotencia)
    values (p_empresa_id, p_usuario_id, p_documento, p_tipo_documento, p_tipo_consulta, p_valor_centavos, p_idempotencia) returning id into v_consulta_id;
  update public.carteiras set saldo_centavos = saldo_centavos - p_valor_centavos, atualizado_em = now() where empresa_id = p_empresa_id returning saldo_centavos into v_saldo;
  insert into public.carteira_movimentacoes (empresa_id, usuario_id, tipo, valor_centavos, saldo_apos_centavos, servico_codigo, referencia_tipo, referencia_id, idempotencia, descricao)
    values (p_empresa_id, p_usuario_id, 'consumo', -p_valor_centavos, v_saldo, p_tipo_consulta, 'consulta', v_consulta_id, 'consulta:' || p_idempotencia, 'Consulta de crédito');
  return v_consulta_id;
end $$;

create or replace function public.estornar_credito_consulta(p_consulta_id uuid, p_erro_codigo text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_consulta public.consultas_credito%rowtype; v_saldo bigint;
begin
  select * into v_consulta from public.consultas_credito where id = p_consulta_id for update;
  if not found then raise exception 'consulta_nao_encontrada'; end if;
  if v_consulta.status = 'estornada' then select saldo_centavos into v_saldo from public.carteiras where empresa_id = v_consulta.empresa_id; return v_saldo; end if;
  if v_consulta.status <> 'processando' then raise exception 'consulta_nao_estornavel'; end if;
  update public.carteiras set saldo_centavos = saldo_centavos + v_consulta.valor_centavos, atualizado_em = now() where empresa_id = v_consulta.empresa_id returning saldo_centavos into v_saldo;
  update public.consultas_credito set status = 'estornada', erro_codigo = p_erro_codigo, atualizado_em = now() where id = p_consulta_id;
  insert into public.carteira_movimentacoes (empresa_id, usuario_id, tipo, valor_centavos, saldo_apos_centavos, servico_codigo, referencia_tipo, referencia_id, idempotencia, descricao)
    values (v_consulta.empresa_id, v_consulta.criado_por, 'estorno', v_consulta.valor_centavos, v_saldo, v_consulta.tipo_consulta, 'consulta', v_consulta.id, 'estorno:' || v_consulta.id, 'Estorno de consulta não concluída')
    on conflict (idempotencia) do nothing;
  return v_saldo;
end $$;

revoke all on function public.creditar_recarga_carteira(uuid,text,text) from public, anon, authenticated;
revoke all on function public.consumir_credito_consulta(uuid,uuid,text,text,text,bigint,text) from public, anon, authenticated;
revoke all on function public.estornar_credito_consulta(uuid,text) from public, anon, authenticated;
grant execute on function public.creditar_recarga_carteira(uuid,text,text) to service_role;
grant execute on function public.consumir_credito_consulta(uuid,uuid,text,text,text,bigint,text) to service_role;
grant execute on function public.estornar_credito_consulta(uuid,text) to service_role;
