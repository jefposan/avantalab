-- Reserva um SKU por loja durante o envio assíncrono ao Magalu.
-- Não altera anúncios existentes nem o estoque físico.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create unique index if not exists marketplace_magalu_publication_sku_guard
  on public.marketplace_publications(connection_id, provider_listing_id)
  where provider = 'magalu' and status in ('publishing', 'published') and provider_listing_id is not null;

create unique index if not exists marketplace_magalu_publication_one_active
  on public.marketplace_publications(connection_id)
  where provider = 'magalu' and status = 'publishing';

commit;
