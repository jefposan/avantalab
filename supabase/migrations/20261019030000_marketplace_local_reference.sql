-- Requer a migração 20261019020000. Um valor salvo não é uma pesquisa nova.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.marketplace_price_consultations drop constraint if exists marketplace_price_consultations_sample_source_check;
alter table public.marketplace_price_consultations add constraint marketplace_price_consultations_sample_source_check check(sample_source in ('active_offers','catalog_reference','manual_reference','google_shopping','openai_web_search','local_reference'));
alter table public.marketplace_price_consultations drop constraint if exists marketplace_price_consultations_provider_product_id_check;
alter table public.marketplace_price_consultations add constraint marketplace_price_consultations_provider_product_id_check check(provider_product_id ~ '^(MLB[0-9]+|PROFILE:[0-9a-f-]{36}|MANUAL:[0-9a-f-]{36}|LOCAL:[0-9a-f-]{36})$');
notify pgrst,'reload schema';
commit;
