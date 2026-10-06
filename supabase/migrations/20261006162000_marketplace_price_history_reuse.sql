-- Histórico reutilizável do AvantaPreços: mantém a data da pesquisa e permite
-- correções manuais auditáveis do valor de referência.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.marketplace_price_consultations
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_researched_at timestamptz not null default now(),
  add column if not exists manually_updated_at timestamptz;

update public.marketplace_price_consultations
set updated_at = created_at,
    last_researched_at = created_at
where updated_at is null
   or last_researched_at is null;

alter table public.marketplace_price_consultations
  drop constraint if exists marketplace_price_consultations_provider_product_id_check;

alter table public.marketplace_price_consultations
  add constraint marketplace_price_consultations_provider_product_id_check
    check (provider_product_id ~ '^(MLB[0-9]+|PROFILE:[0-9a-f-]{36}|MANUAL:[0-9a-f-]{36})$');

create index if not exists marketplace_price_consultations_empresa_name_idx
  on public.marketplace_price_consultations (empresa_id, product_name, created_at desc);

commit;
