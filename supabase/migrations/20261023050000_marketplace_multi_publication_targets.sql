-- Uma tentativa estável por produto/conta, inclusive entre abas/dispositivos.
-- Histórico de cada envio permanece em marketplace_publications.
create table if not exists public.marketplace_multi_publication_targets (
 empresa_id uuid not null references public.empresas(id),
 product_id uuid not null references public.marketplace_products(id) on delete cascade,
 connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
 request_key uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now(),
 primary key (empresa_id,product_id,connection_id)
);
alter table public.marketplace_multi_publication_targets enable row level security;
revoke all on public.marketplace_multi_publication_targets from public,anon,authenticated;
grant select,insert,update on public.marketplace_multi_publication_targets to service_role;
