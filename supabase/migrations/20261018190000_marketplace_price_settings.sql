-- Configuração por empresa, consumida pelo Web e PWA. Histórico/lotes não são recalculados.
create table if not exists public.marketplace_price_settings (
  empresa_id uuid primary key references public.empresas(id) on delete cascade,
  minimum_percent numeric(7,2) not null default 50,
  medium_percent numeric(7,2) not null default 70,
  ideal_percent numeric(7,2) not null default 90,
  theme_mode text not null default 'profile' check (theme_mode in ('profile','light','dark','system')),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (minimum_percent > 0 and minimum_percent <= medium_percent and medium_percent <= ideal_percent and ideal_percent <= 1000)
);
alter table public.marketplace_price_settings enable row level security;
revoke all on public.marketplace_price_settings from public, anon, authenticated;
grant select, insert, update on public.marketplace_price_settings to service_role;
