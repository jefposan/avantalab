-- Consultas assistidas: a pessoa informa o preço visto na vitrine pública.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.marketplace_price_consultations
  drop constraint if exists marketplace_price_consultations_sample_source_check,
  drop constraint if exists marketplace_price_consultations_provider_product_id_check;

alter table public.marketplace_price_consultations
  add constraint marketplace_price_consultations_sample_source_check
    check (sample_source in ('active_offers', 'catalog_reference', 'manual_reference')),
  add constraint marketplace_price_consultations_provider_product_id_check
    check (provider_product_id ~ '^(MLB[0-9]+|PROFILE:[0-9a-f-]{36})$');

commit;
