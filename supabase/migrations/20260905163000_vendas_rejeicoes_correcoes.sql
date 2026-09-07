-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Depende de 0001 e 0008. Registra retratos corrigidos sem alterar o rascunho
-- comercial original nem reutilizar silenciosamente o documento rejeitado.

begin;

create table fiscal_private.emission_corrections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  revision integer not null check (revision > 0),
  operation_key text not null check (char_length(operation_key) between 8 and 120),
  source_status_code text not null check (source_status_code ~ '^[0-9]{3}$'),
  issuer_snapshot jsonb not null check (jsonb_typeof(issuer_snapshot) = 'object'),
  recipient_snapshot jsonb not null check (jsonb_typeof(recipient_snapshot) = 'object'),
  items_snapshot jsonb not null check (jsonb_typeof(items_snapshot) = 'array'),
  totals_snapshot jsonb not null check (jsonb_typeof(totals_snapshot) = 'object'),
  payment_snapshot jsonb not null check (jsonb_typeof(payment_snapshot) = 'object'),
  correction_digest text not null check (correction_digest ~ '^[a-f0-9]{64}$'),
  preparation_payload jsonb not null check (jsonb_typeof(preparation_payload) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (emission_id, revision),
  unique (company_id, operation_key)
);

create index fiscal_emission_corrections_latest_idx
  on fiscal_private.emission_corrections(company_id, emission_id, revision desc);

create trigger emission_corrections_immutable before update or delete
  on fiscal_private.emission_corrections for each row
  execute function fiscal_private.reject_immutable_change();

alter table fiscal_private.emission_corrections enable row level security;
alter table fiscal_private.emission_corrections force row level security;
revoke all on fiscal_private.emission_corrections from public, anon, authenticated;
grant select, insert on fiscal_private.emission_corrections to service_role;

comment on table fiscal_private.emission_corrections is
  'Retratos fiscais corrigidos e imutáveis de uma NF-e rejeitada; o rascunho comercial original permanece preservado.';

commit;
