begin;
create table fiscal_private.commercial_payment_settings (
  company_id uuid primary key references public.empresas(id) on delete cascade,
  settings jsonb not null check(jsonb_typeof(settings)='object'),
  version integer not null default 1 check(version>0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table fiscal_private.commercial_payment_settings enable row level security;
revoke all on fiscal_private.commercial_payment_settings from public, anon, authenticated;
grant select, insert, update on fiscal_private.commercial_payment_settings to avanta_vendas_runtime;
create policy commercial_payment_settings_runtime on fiscal_private.commercial_payment_settings
  for all to avanta_vendas_runtime
  using (public.vendas_runtime_empresa_liberada(company_id))
  with check (public.vendas_runtime_empresa_liberada(company_id));
commit;
