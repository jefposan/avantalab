-- Consultas assistidas: a pessoa informa o preço visto na vitrine pública.
-- A lista já aceita google_shopping para manter esta migração aditiva segura
-- quando a fonte automática tiver sido habilitada antes do seu registro local.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.marketplace_price_consultations
  drop constraint if exists marketplace_price_consultations_sample_source_check,
  drop constraint if exists marketplace_price_consultations_provider_product_id_check;

alter table public.marketplace_price_consultations
  add constraint marketplace_price_consultations_sample_source_check
    check (sample_source in ('active_offers', 'catalog_reference', 'manual_reference', 'google_shopping')),
  add constraint marketplace_price_consultations_provider_product_id_check
    check (provider_product_id ~ '^(MLB[0-9]+|PROFILE:[0-9a-f-]{36})$');

commit;
