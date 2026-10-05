-- Gestão de anúncios: migração aditiva; nenhum item é alterado no provedor.
-- Recuperação: em falha a transação inteira é revertida. Após sucesso,
-- preservar tabelas/cache e desabilitar o uso das rotas, sem apagar histórico.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.marketplace_connections
  add column if not exists seller_name text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_cursor text,
  add column if not exists sync_cursor_at timestamptz,
  add column if not exists sync_phase text not null default 'scan' check (sync_phase in ('scan', 'enrich')),
  add column if not exists sync_pending_ids text[] not null default array[]::text[],
  add column if not exists sync_scan_in_flight boolean not null default false,
  add column if not exists sync_lock_owner uuid,
  add column if not exists sync_lock_until timestamptz,
  add column if not exists refresh_lock_owner uuid,
  add column if not exists refresh_lock_until timestamptz;
alter table public.marketplace_oauth_pending add column if not exists browser_binding_hash text;

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
  provider text not null default 'mercado_livre' check (provider = 'mercado_livre'),
  provider_listing_id text not null check (provider_listing_id ~ '^MLB[0-9]{6,20}$'),
  title text not null, search_text text not null default '', status text not null,
  snapshot jsonb not null, synced_at timestamptz not null default now(),
  unique (connection_id, provider_listing_id)
);
create index if not exists marketplace_listings_company_idx on public.marketplace_listings(empresa_id, connection_id, status, synced_at desc);
alter table public.marketplace_listings enable row level security;
revoke all on public.marketplace_listings from anon, authenticated;
grant select, insert, update, delete on public.marketplace_listings to service_role;

create table if not exists public.marketplace_listing_actions (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
  provider_listing_id text not null,
  action text not null check (action in ('pause', 'resume', 'close', 'delete')),
  request_key uuid not null, actor_id uuid references auth.users(id) on delete set null,
  status text not null default 'requested' check (status in ('requested', 'succeeded', 'failed', 'uncertain')),
  error_code text, created_at timestamptz not null default now(),
  unique (empresa_id, request_key)
);
alter table public.marketplace_listing_actions enable row level security;
revoke all on public.marketplace_listing_actions from anon, authenticated;
grant select, insert, update, delete on public.marketplace_listing_actions to service_role;

create table if not exists public.marketplace_notifications (
  id text primary key, seller_reference text not null, provider_listing_id text not null,
  attempts integer not null default 0, processed_at timestamptz,
  next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists marketplace_notifications_pending_idx on public.marketplace_notifications(next_attempt_at) where processed_at is null;
alter table public.marketplace_notifications enable row level security;
revoke all on public.marketplace_notifications from anon, authenticated;
grant select, insert, update, delete on public.marketplace_notifications to service_role;
commit;
