-- Reconferência dos anúncios já conhecidos, independente da busca da plataforma.
begin;
set local lock_timeout='5s';
create table public.marketplace_listing_status_checks (
 connection_id uuid primary key references public.marketplace_connections(id) on delete cascade,
 empresa_id uuid not null references public.empresas(id),
 cursor uuid, checked_at timestamptz not null default now(),
 last_completed_at timestamptz, cycle_failed boolean not null default false, issue text
);
create index marketplace_listing_status_checks_company on public.marketplace_listing_status_checks(empresa_id,checked_at);
alter table public.marketplace_listing_status_checks enable row level security;
revoke all on public.marketplace_listing_status_checks from public,anon,authenticated;
grant select,insert,update,delete on public.marketplace_listing_status_checks to service_role;
notify pgrst,'reload schema';
commit;
