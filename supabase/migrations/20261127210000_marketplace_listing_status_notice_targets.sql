begin;
set local lock_timeout = '5s';

-- Identificadores dos anúncios cuja conferência falhou no ciclo da conta.
alter table public.marketplace_listing_status_checks
  add column failed_listing_ids text[] not null default '{}';

notify pgrst, 'reload schema';
commit;
