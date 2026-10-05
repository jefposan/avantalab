-- Histórico de consultas do Marketplaces Mobile. Reutiliza a conexão Mercado Livre já existente.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

update public.modulos
set superficies = array['web', 'pwa']
where id = 'marketplaces';

create table if not exists public.marketplace_price_consultations (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  connection_id uuid references public.marketplace_connections(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  input_type text not null check (input_type in ('ean', 'text')),
  input_value text not null check (char_length(input_value) between 1 and 180),
  ean text check (ean is null or ean ~ '^[0-9]{8,14}$'),
  provider_product_id text not null check (provider_product_id ~ '^MLB[0-9]+$'),
  product_name text not null,
  product_description text,
  image_url text,
  currency text not null default 'BRL' check (currency = 'BRL'),
  market_price_cents integer not null check (market_price_cents > 0),
  minimum_price_cents integer not null check (minimum_price_cents > 0),
  medium_price_cents integer not null check (medium_price_cents > 0),
  ideal_price_cents integer not null check (ideal_price_cents > 0),
  sample_count integer not null check (sample_count > 0),
  sample_min_cents integer not null check (sample_min_cents > 0),
  sample_max_cents integer not null check (sample_max_cents >= sample_min_cents),
  sample_source text not null check (sample_source in ('active_offers', 'catalog_reference')),
  created_at timestamptz not null default now()
);

alter table public.marketplace_price_consultations enable row level security;
revoke all on public.marketplace_price_consultations from anon, authenticated;
grant select, insert, update, delete on public.marketplace_price_consultations to service_role;
create index if not exists marketplace_price_consultations_empresa_created_idx
  on public.marketplace_price_consultations (empresa_id, created_at desc);
create index if not exists marketplace_price_consultations_empresa_ean_idx
  on public.marketplace_price_consultations (empresa_id, ean, created_at desc)
  where ean is not null;

commit;
