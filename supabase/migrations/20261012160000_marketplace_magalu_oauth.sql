-- Preparação local: aplicar somente junto da futura ativação autorizada do Magalu.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.marketplace_oauth_pending
  drop constraint if exists marketplace_oauth_pending_provider_check;
alter table public.marketplace_oauth_pending
  add constraint marketplace_oauth_pending_provider_check check (provider in ('mercado_livre', 'magalu'));
alter table public.marketplace_oauth_pending add column if not exists browser_binding_hash text;
alter table public.marketplace_oauth_pending enable row level security;
revoke all on public.marketplace_oauth_pending from anon, authenticated;
grant select, insert, update, delete on public.marketplace_oauth_pending to service_role;
commit;
