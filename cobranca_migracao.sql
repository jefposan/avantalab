-- ─────────────────────────────────────────────────────────────
-- COBRANÇA — migração idempotente (segura para rodar várias vezes).
-- Cria as tabelas se faltarem e adiciona colunas novas em tabelas
-- que já existem. Não apaga nada. Rode inteira no Supabase → SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- ── CUPONS ────────────────────────────────────────────────────
create table if not exists public.cupons (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique,
  tipo           text not null check (tipo in ('periodo','vitalicio')),
  duracao_valor    integer,
  duracao_unidade  text check (duracao_unidade in ('dias','semanas','meses')),
  max_usos       integer,
  usos           integer not null default 0,
  validade       timestamptz,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
-- Colunas novas em tabelas que já existiam (versões anteriores usavam duracao_meses):
alter table public.cupons add column if not exists duracao_valor integer;
alter table public.cupons add column if not exists duracao_unidade text;
create index if not exists cupons_codigo_idx on public.cupons(codigo);
alter table public.cupons enable row level security;

-- ── ASSINATURAS ───────────────────────────────────────────────
create table if not exists public.assinaturas (
  id                       uuid primary key default gen_random_uuid(),
  empresa_id               uuid not null references public.empresas(id) on delete cascade,
  tipo_perfil              text not null check (tipo_perfil in ('empresa','pessoal')),
  plano                    text,
  status                   text not null default 'trial'
                            check (status in ('trial','ativa','expirada','cancelada','cortesia','inadimplente')),
  ciclo                    text check (ciclo in ('mensal','anual')),
  trial_fim                timestamptz,
  valido_ate               timestamptz,
  gateway                  text,
  gateway_customer_id      text,
  gateway_subscription_id  text,
  cupom_id                 uuid references public.cupons(id),
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),
  unique (empresa_id)
);
create index if not exists assinaturas_empresa_idx on public.assinaturas(empresa_id);
create index if not exists assinaturas_status_idx on public.assinaturas(status);
create index if not exists assinaturas_gw_sub_idx on public.assinaturas(gateway_subscription_id);
create index if not exists assinaturas_gw_cust_idx on public.assinaturas(gateway_customer_id);
alter table public.assinaturas enable row level security;

-- Policy (drop + create = idempotente): usuário lê a assinatura do próprio perfil.
drop policy if exists "assinaturas_select" on public.assinaturas;
create policy "assinaturas_select" on public.assinaturas
  for select using (
    empresa_id in (select empresa_id from public.usuarios_empresa where user_id = auth.uid())
  );

-- ── CUPONS_RESGATES ───────────────────────────────────────────
create table if not exists public.cupons_resgates (
  id            uuid primary key default gen_random_uuid(),
  cupom_id      uuid not null references public.cupons(id) on delete cascade,
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  resgatado_em  timestamptz not null default now()
);
create index if not exists cupons_resgates_cupom_idx on public.cupons_resgates(cupom_id);
create index if not exists cupons_resgates_empresa_idx on public.cupons_resgates(empresa_id);
alter table public.cupons_resgates enable row level security;

-- ── Limpeza opcional (tabela de diagnóstico temporária, se existir) ──
-- drop table if exists public.cobranca_webhook_log;
