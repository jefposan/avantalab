-- Assinaturas pessoais adquiridas nas lojas nativas.
-- A assinatura é vinculada ao usuário (e não a um único perfil), pois o
-- Pessoal Premium libera os perfis pessoais do mesmo login.

create extension if not exists pgcrypto;

create table if not exists public.assinaturas_loja (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loja text not null check (loja in ('apple_app_store', 'google_play')),
  produto_id text,
  entitlement_id text not null,
  status text not null default 'expirada'
    check (status in ('ativa', 'cancelada', 'expirada', 'inadimplente')),
  ciclo text check (ciclo in ('mensal', 'anual')),
  valido_ate timestamptz,
  gateway_customer_id text,
  ambiente text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, loja, entitlement_id)
);

create index if not exists assinaturas_loja_usuario_idx
  on public.assinaturas_loja(user_id, loja, status);
create index if not exists assinaturas_loja_validade_idx
  on public.assinaturas_loja(valido_ate);
alter table public.assinaturas_loja enable row level security;

drop policy if exists "assinaturas_loja_select_propria" on public.assinaturas_loja;
create policy "assinaturas_loja_select_propria" on public.assinaturas_loja
  for select using (user_id = auth.uid());

create table if not exists public.revenuecat_webhook_eventos (
  id uuid primary key default gen_random_uuid(),
  revenuecat_event_id text not null unique,
  evento text not null,
  user_id uuid references auth.users(id) on delete set null,
  produto_id text,
  payload jsonb not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'processado', 'ignorado', 'erro')),
  erro text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz
);

create index if not exists revenuecat_webhook_eventos_status_idx
  on public.revenuecat_webhook_eventos(status, recebido_em);
alter table public.revenuecat_webhook_eventos enable row level security;

-- Sem policies de escrita: sincronização e webhooks usam somente service role.
