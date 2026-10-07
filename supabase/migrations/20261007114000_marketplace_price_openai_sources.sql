-- Pesquisa de preços com IA e fontes verificáveis por oferta.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.marketplace_price_consultations
  add column if not exists source_offers jsonb not null default '[]'::jsonb;

alter table public.marketplace_price_consultations
  drop constraint if exists marketplace_price_consultations_sample_source_check,
  drop constraint if exists marketplace_price_consultations_source_offers_check;

alter table public.marketplace_price_consultations
  add constraint marketplace_price_consultations_sample_source_check
    check (sample_source in ('active_offers', 'catalog_reference', 'manual_reference', 'google_shopping', 'openai_web_search')),
  add constraint marketplace_price_consultations_source_offers_check
    check (jsonb_typeof(source_offers) = 'array');

commit;
