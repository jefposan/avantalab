-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Depende de 0001_fiscal_transactional_NOT_APPLIED.sql e de homologacao local.

begin;

create table fiscal_private.recovery_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  job_type text not null check (job_type in ('authorization_status','receipt_status','processed_artifact','danfe_generation')),
  state text not null default 'pending' check (state in ('pending','leased','completed','dead_letter')),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 8 check (max_attempts between 1 and 12),
  available_at timestamptz not null default now(),
  leased_at timestamptz,
  lease_expires_at timestamptz,
  worker_id text,
  last_error_code text,
  last_error_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (company_id, idempotency_key),
  constraint recovery_jobs_lease_complete check (
    state <> 'leased'
    or (leased_at is not null and lease_expires_at is not null and worker_id is not null)
  ),
  constraint recovery_jobs_completion_complete check (
    state <> 'completed' or completed_at is not null
  )
);

create index recovery_jobs_pending_idx
  on fiscal_private.recovery_jobs(available_at, id)
  where state = 'pending';

create index recovery_jobs_expired_lease_idx
  on fiscal_private.recovery_jobs(lease_expires_at, id)
  where state = 'leased';

create index recovery_jobs_emission_idx
  on fiscal_private.recovery_jobs(company_id, emission_id, created_at desc);

alter table fiscal_private.recovery_jobs enable row level security;
alter table fiscal_private.recovery_jobs force row level security;

revoke all on fiscal_private.recovery_jobs from public, anon, authenticated;
grant select, insert, update on fiscal_private.recovery_jobs to service_role;

comment on table fiscal_private.recovery_jobs is
  'Fila interna sem XML ou segredo; usa lease, SKIP LOCKED, retentativa e dead letter.';

commit;
