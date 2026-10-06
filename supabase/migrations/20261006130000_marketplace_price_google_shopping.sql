-- Histórico de consultas automáticas realizadas via Google Shopping.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.marketplace_price_consultations
  drop constraint if exists marketplace_price_consultations_sample_source_check;

alter table public.marketplace_price_consultations
  add constraint marketplace_price_consultations_sample_source_check
    check (sample_source in ('active_offers', 'catalog_reference', 'manual_reference', 'google_shopping'));

commit;
