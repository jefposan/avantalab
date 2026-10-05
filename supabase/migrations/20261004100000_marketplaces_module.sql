-- Anúncios em marketplaces: conexões OAuth e rascunhos de publicação por empresa.
-- Tokens não são acessíveis pelo cliente; o backend usa service role e criptografia em repouso.
begin;

insert into public.modulos (id, nome, descricao, icone, disponivel, perfis, ordem, preco_mensal, vendavel_business, incluido_business_pro, modo_navegacao, rota_web, superficies)
values ('marketplaces', 'Anúncios em marketplaces', 'Conecte marketplaces e publique anúncios assistidos por EAN e valor.', 'marketplaces', true, array['empresa'], 7, 14.90, true, true, 'pagina_total', '/marketplaces', array['web'])
on conflict (id) do update set nome = excluded.nome, descricao = excluded.descricao, icone = excluded.icone, disponivel = excluded.disponivel, perfis = excluded.perfis, ordem = excluded.ordem, preco_mensal = excluded.preco_mensal, vendavel_business = excluded.vendavel_business, incluido_business_pro = excluded.incluido_business_pro, modo_navegacao = excluded.modo_navegacao, rota_web = excluded.rota_web, superficies = excluded.superficies;

create table if not exists public.marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  provider text not null check (provider in ('mercado_livre', 'shopee', 'tiktok_shop', 'magalu', 'casas_bahia', 'amazon')),
  status text not null default 'connecting' check (status in ('connecting', 'connected', 'expired', 'attention', 'disconnected')),
  seller_reference text,
  token_sealed jsonb,
  token_key_version smallint,
  scopes text[] not null default array[]::text[],
  expires_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz,
  last_checked_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, provider, seller_reference)
);
alter table public.marketplace_connections enable row level security;
revoke all on public.marketplace_connections from anon, authenticated;
create index if not exists marketplace_connections_empresa_provider_idx on public.marketplace_connections (empresa_id, provider, status);

create table if not exists public.marketplace_oauth_pending (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  provider text not null check (provider = 'mercado_livre'),
  state text not null unique,
  verifier_sealed jsonb not null,
  started_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.marketplace_oauth_pending enable row level security;
revoke all on public.marketplace_oauth_pending from anon, authenticated;
create index if not exists marketplace_oauth_pending_lookup_idx on public.marketplace_oauth_pending (state, provider, expires_at) where consumed_at is null;

create table if not exists public.marketplace_publications (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  connection_id uuid references public.marketplace_connections(id) on delete set null,
  provider text not null check (provider in ('mercado_livre', 'shopee', 'tiktok_shop', 'magalu', 'casas_bahia', 'amazon')),
  ean text not null,
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'draft' check (status in ('draft', 'needs_information', 'validated', 'publishing', 'published', 'failed', 'cancelled')),
  idempotency_key uuid not null default gen_random_uuid(),
  provider_listing_id text,
  provider_product_id text,
  missing_fields jsonb not null default '[]'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, provider, idempotency_key)
);
alter table public.marketplace_publications enable row level security;
revoke all on public.marketplace_publications from anon, authenticated;
create index if not exists marketplace_publications_empresa_status_idx on public.marketplace_publications (empresa_id, provider, status, created_at desc);

create table if not exists public.marketplace_publication_events (
  id bigint generated always as identity primary key,
  publication_id uuid not null references public.marketplace_publications(id) on delete cascade,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.marketplace_publication_events enable row level security;
revoke all on public.marketplace_publication_events from anon, authenticated;

commit;
