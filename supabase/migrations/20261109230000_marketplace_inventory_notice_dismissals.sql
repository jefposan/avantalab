-- Confirmação de leitura por empresa e usuário; não altera estoque nem o evento.
create table if not exists public.marketplace_inventory_notice_dismissals (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id text not null check (char_length(notice_id) between 1 and 600),
  issue_code text not null check (char_length(issue_code) between 1 and 80),
  dismissed_at timestamptz not null default now(),
  primary key (empresa_id, user_id, notice_id, issue_code)
);

alter table public.marketplace_inventory_notice_dismissals enable row level security;
revoke all on public.marketplace_inventory_notice_dismissals from public, anon, authenticated, service_role;
grant select, insert on public.marketplace_inventory_notice_dismissals to service_role;
