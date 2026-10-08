-- Vendas recebidas dos marketplaces: fila aditiva, sem alterar anúncios existentes.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.marketplace_sale_notifications (
  id text primary key,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
  provider text not null default 'mercado_livre' check (provider = 'mercado_livre'),
  topic text not null check (topic in ('orders_v2', 'orders', 'shipments')),
  resource text not null,
  attempts integer not null default 0,
  processed_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  error_code text,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_sale_notifications_pending_idx on public.marketplace_sale_notifications(connection_id, next_attempt_at) where processed_at is null;
alter table public.marketplace_sale_notifications enable row level security;
revoke all on public.marketplace_sale_notifications from anon, authenticated;
grant select, insert, update, delete on public.marketplace_sale_notifications to service_role;

create table if not exists public.marketplace_sales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  connection_id uuid not null references public.marketplace_connections(id) on delete cascade,
  provider text not null default 'mercado_livre' check (provider = 'mercado_livre'),
  provider_order_id text not null check (provider_order_id ~ '^[0-9]{1,24}$'),
  status text not null,
  shipment_id text,
  shipment_status text,
  shipment_substatus text,
  label_status text not null default 'unavailable' check (label_status in ('ready', 'unavailable', 'fulfilled')),
  seen_at timestamptz,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, provider_order_id)
);
create index if not exists marketplace_sales_connection_idx on public.marketplace_sales(empresa_id, connection_id, seen_at, updated_at desc);
alter table public.marketplace_sales enable row level security;
revoke all on public.marketplace_sales from anon, authenticated;
grant select, insert, update, delete on public.marketplace_sales to service_role;
commit;
