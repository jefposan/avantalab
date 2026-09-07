-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Depende de 0001_fiscal_transactional_NOT_APPLIED.sql e de revisao fiscal formal.

begin;

create table fiscal_private.artifact_retention_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.empresas(id) on delete restrict,
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  artifact_id uuid not null references fiscal_private.artifacts(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  event_type text not null check (event_type in ('registered','extended','legal_hold_applied','legal_hold_released')),
  baseline_until date not null,
  effective_until date,
  indefinite_hold boolean not null default false,
  reason text not null check (char_length(reason) between 10 and 500),
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  unique (artifact_id, sequence),
  constraint artifact_retention_effective_check check (
    (indefinite_hold and effective_until is null)
    or (not indefinite_hold and effective_until is not null and effective_until >= baseline_until)
  )
);

create index artifact_retention_company_idx
  on fiscal_private.artifact_retention_events(company_id, artifact_id, sequence desc);

create table fiscal_private.artifact_access_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.empresas(id) on delete restrict,
  emission_id uuid references fiscal_private.emissions(id) on delete restrict,
  artifact_id uuid references fiscal_private.artifacts(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  artifact_type text not null check (artifact_type in ('processed_xml','danfe_pdf')),
  permission_code text not null check (permission_code in ('fiscal.documents.xml.download','fiscal.documents.danfe.download')),
  outcome text not null check (outcome in ('granted','denied','failed')),
  reason_code text not null check (char_length(reason_code) between 3 and 80),
  grant_expires_at timestamptz,
  occurred_at timestamptz not null default now(),
  constraint artifact_access_grant_check check (
    (outcome = 'granted' and emission_id is not null and artifact_id is not null and grant_expires_at is not null)
    or outcome <> 'granted'
  )
);

create index artifact_access_company_idx
  on fiscal_private.artifact_access_events(company_id, occurred_at desc);

create table fiscal_private.storage_restore_tests (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null check (char_length(provider_id) between 3 and 100),
  backup_reference_hash text not null check (backup_reference_hash ~ '^[a-f0-9]{64}$'),
  outcome text not null check (outcome in ('passed','failed')),
  recovery_point_seconds integer not null check (recovery_point_seconds >= 0),
  recovery_time_seconds integer not null check (recovery_time_seconds > 0),
  tested_by uuid references auth.users(id) on delete set null,
  tested_at timestamptz not null,
  created_at timestamptz not null default now()
);

create trigger artifact_retention_events_immutable before update or delete on fiscal_private.artifact_retention_events for each row execute function fiscal_private.reject_immutable_change();
create trigger artifact_access_events_immutable before update or delete on fiscal_private.artifact_access_events for each row execute function fiscal_private.reject_immutable_change();
create trigger storage_restore_tests_immutable before update or delete on fiscal_private.storage_restore_tests for each row execute function fiscal_private.reject_immutable_change();

alter table fiscal_private.artifact_retention_events enable row level security;
alter table fiscal_private.artifact_retention_events force row level security;
alter table fiscal_private.artifact_access_events enable row level security;
alter table fiscal_private.artifact_access_events force row level security;
alter table fiscal_private.storage_restore_tests enable row level security;
alter table fiscal_private.storage_restore_tests force row level security;

revoke all on fiscal_private.artifact_retention_events from public, anon, authenticated;
revoke all on fiscal_private.artifact_access_events from public, anon, authenticated;
revoke all on fiscal_private.storage_restore_tests from public, anon, authenticated;
grant select, insert on fiscal_private.artifact_retention_events to service_role;
grant select, insert on fiscal_private.artifact_access_events to service_role;
grant select, insert on fiscal_private.storage_restore_tests to service_role;
grant usage, select on all sequences in schema fiscal_private to service_role;

comment on table fiscal_private.artifact_retention_events is 'Historico append-only de retencao e bloqueios; descarte exige revisao juridico-fiscal.';
comment on table fiscal_private.artifact_access_events is 'Auditoria append-only de tentativas de acesso; nunca armazena URL assinada ou conteudo fiscal.';
comment on table fiscal_private.storage_restore_tests is 'Evidencias sem segredo dos ensaios periodicos de restauracao do armazenamento fiscal.';

commit;
