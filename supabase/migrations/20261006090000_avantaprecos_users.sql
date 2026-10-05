begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table if not exists public.marketplace_price_users (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(trim(nome)) between 2 and 120),
  login text not null check (login ~ '^[a-z0-9][a-z0-9._-]{2,39}$'),
  email text not null,
  ativo boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, user_id),
  unique (login)
);

alter table public.marketplace_price_users enable row level security;
revoke all on public.marketplace_price_users from anon, authenticated;
grant select, insert, update, delete on public.marketplace_price_users to service_role;
create index if not exists marketplace_price_users_empresa_idx
  on public.marketplace_price_users (empresa_id, ativo, nome);
create index if not exists marketplace_price_users_user_idx
  on public.marketplace_price_users (user_id, ativo);

commit;
