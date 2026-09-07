-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Exige revisao no repositorio principal, backup e homologacao antes do uso.

begin;

create schema if not exists fiscal_private;
revoke all on schema fiscal_private from public, anon, authenticated;
grant usage on schema fiscal_private to service_role;

create table fiscal_private.emissions (
  id uuid primary key,
  company_id uuid not null references public.empresas(id) on delete restrict,
  establishment_id uuid not null,
  draft_id text not null,
  origin_id text,
  document_type text not null check (document_type = 'nfe'),
  model text not null check (model = '55'),
  environment text not null check (environment = 'homologacao'),
  state text not null check (state in ('draft','prepared','number_reserved','signed','submitted','processing','authorized','artifacts_stored','danfe_ready','rejected','failed','canceled')),
  version integer not null default 1 check (version > 0),
  series text,
  number integer check (number between 1 and 999999999),
  reservation_id uuid,
  access_key text check (access_key is null or access_key ~ '^[0-9]{44}$'),
  signed_checksum text check (signed_checksum is null or signed_checksum ~ '^[a-f0-9]{64}$'),
  batch_id text,
  receipt_number text check (receipt_number is null or receipt_number ~ '^[0-9]{15}$'),
  status_code text check (status_code is null or status_code ~ '^[0-9]{3}$'),
  status_reason text,
  protocol_number text,
  submitted_at timestamptz,
  authorized_at timestamptz,
  processed_storage_reference text,
  processed_checksum text check (processed_checksum is null or processed_checksum ~ '^[a-f0-9]{64}$'),
  danfe_storage_reference text,
  danfe_checksum text check (danfe_checksum is null or danfe_checksum ~ '^[a-f0-9]{64}$'),
  canceled_at timestamptz,
  cancellation_protocol text,
  cancellation_status_code text,
  failure_code text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint emissions_number_complete check (
    (state = 'draft' and series is null and number is null and reservation_id is null)
    or (state in ('prepared','failed') and (
      (series is null and number is null and reservation_id is null)
      or (series is not null and number is not null and reservation_id is not null)
    ))
    or (state not in ('draft','prepared','failed') and series is not null and number is not null and reservation_id is not null)
  ),
  constraint emissions_access_key_complete check (
    state in ('draft','prepared','number_reserved','failed','rejected') or access_key is not null
  ),
  constraint emissions_authorization_complete check (
    state not in ('authorized','artifacts_stored','danfe_ready','canceled')
    or (status_code = '100' and protocol_number is not null and authorized_at is not null)
  ),
  constraint emissions_processed_artifact_complete check (
    state not in ('artifacts_stored','danfe_ready')
    or (processed_storage_reference is not null and processed_checksum is not null)
  ),
  constraint emissions_danfe_complete check (
    state not in ('danfe_ready')
    or (danfe_storage_reference is not null and danfe_checksum is not null)
  ),
  constraint emissions_cancellation_complete check (
    state <> 'canceled'
    or (cancellation_protocol is not null and cancellation_status_code in ('135','155') and canceled_at is not null)
  )
);

create unique index emissions_company_draft_uq on fiscal_private.emissions(company_id, draft_id);
create unique index emissions_company_number_uq on fiscal_private.emissions(company_id, establishment_id, document_type, series, number) where number is not null;
create unique index emissions_company_access_key_uq on fiscal_private.emissions(company_id, access_key) where access_key is not null;
create index emissions_company_state_idx on fiscal_private.emissions(company_id, state, updated_at desc);

create table fiscal_private.number_sequences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  establishment_id uuid not null,
  document_type text not null check (document_type = 'nfe'),
  series text not null check (series ~ '^[0-9]{1,3}$'),
  next_number integer not null check (next_number between 1 and 999999999),
  last_reserved_number integer not null default 0 check (last_reserved_number between 0 and 999999999),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, establishment_id, document_type, series)
);

create unique index number_sequences_active_uq on fiscal_private.number_sequences(company_id, establishment_id, document_type) where active;

create table fiscal_private.number_voids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  establishment_id uuid not null,
  document_type text not null check (document_type = 'nfe'),
  series text not null,
  start_number integer not null check (start_number between 1 and 999999999),
  end_number integer not null check (end_number between 1 and 999999999 and end_number >= start_number),
  status text not null check (status in ('pending','confirmed','rejected')),
  reason text not null check (char_length(reason) between 15 and 255),
  protocol_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index number_voids_lookup_idx on fiscal_private.number_voids(company_id, establishment_id, document_type, series, start_number, end_number) where status <> 'rejected';

create table fiscal_private.number_reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  establishment_id uuid not null,
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  document_type text not null check (document_type = 'nfe'),
  series text not null,
  number integer not null check (number between 1 and 999999999),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  status text not null default 'reserved' check (status in ('reserved','authorized','void_pending','voided')),
  reserved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, idempotency_key),
  unique (company_id, establishment_id, document_type, series, number),
  unique (emission_id)
);

create table fiscal_private.artifacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  artifact_type text not null check (artifact_type in ('signed_xml','protocol_xml','processed_xml','danfe_pdf')),
  storage_reference text not null,
  storage_version text,
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  byte_length bigint not null check (byte_length > 0),
  content_type text not null check (content_type in ('application/xml','application/pdf')),
  created_at timestamptz not null default now(),
  unique (emission_id, artifact_type),
  unique (storage_reference, storage_version)
);

create table fiscal_private.transmission_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.empresas(id) on delete restrict,
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  attempt_number integer not null check (attempt_number > 0),
  operation_key text not null check (char_length(operation_key) between 8 and 120),
  access_key text not null check (access_key ~ '^[0-9]{44}$'),
  signed_checksum text not null check (signed_checksum ~ '^[a-f0-9]{64}$'),
  batch_id text,
  receipt_number text check (receipt_number is null or receipt_number ~ '^[0-9]{15}$'),
  status_code text check (status_code is null or status_code ~ '^[0-9]{3}$'),
  status_reason text,
  protocol_number text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (emission_id, attempt_number),
  unique (company_id, operation_key)
);

create table fiscal_private.events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.empresas(id) on delete restrict,
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  sequence integer not null check (sequence > 0),
  from_state text,
  to_state text not null,
  event_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  public_payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  unique (emission_id, sequence)
);

create index events_company_emission_idx on fiscal_private.events(company_id, emission_id, sequence);

create table fiscal_private.operations (
  company_id uuid not null references public.empresas(id) on delete restrict,
  operation_key text not null check (char_length(operation_key) between 8 and 120),
  emission_id uuid not null references fiscal_private.emissions(id) on delete restrict,
  operation_type text not null check (operation_type in ('create','transition')),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  resulting_version integer not null check (resulting_version > 0),
  created_at timestamptz not null default now(),
  primary key (company_id, operation_key)
);

create or replace function fiscal_private.reject_immutable_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Historico fiscal imutavel: alteracao ou exclusao recusada.' using errcode = '55000';
end;
$$;

create trigger events_immutable before update or delete on fiscal_private.events for each row execute function fiscal_private.reject_immutable_change();
create trigger operations_immutable before update or delete on fiscal_private.operations for each row execute function fiscal_private.reject_immutable_change();
create trigger artifacts_immutable before update or delete on fiscal_private.artifacts for each row execute function fiscal_private.reject_immutable_change();
create trigger transmission_attempts_immutable before update or delete on fiscal_private.transmission_attempts for each row execute function fiscal_private.reject_immutable_change();

alter table fiscal_private.emissions enable row level security;
alter table fiscal_private.emissions force row level security;
alter table fiscal_private.number_sequences enable row level security;
alter table fiscal_private.number_sequences force row level security;
alter table fiscal_private.number_voids enable row level security;
alter table fiscal_private.number_voids force row level security;
alter table fiscal_private.number_reservations enable row level security;
alter table fiscal_private.number_reservations force row level security;
alter table fiscal_private.artifacts enable row level security;
alter table fiscal_private.artifacts force row level security;
alter table fiscal_private.events enable row level security;
alter table fiscal_private.events force row level security;
alter table fiscal_private.transmission_attempts enable row level security;
alter table fiscal_private.transmission_attempts force row level security;
alter table fiscal_private.operations enable row level security;
alter table fiscal_private.operations force row level security;

revoke all on all tables in schema fiscal_private from public, anon, authenticated;
revoke all on all sequences in schema fiscal_private from public, anon, authenticated;
revoke execute on all functions in schema fiscal_private from public, anon, authenticated;

grant select, insert, update on fiscal_private.emissions to service_role;
grant select, insert, update on fiscal_private.number_sequences to service_role;
grant select, insert, update on fiscal_private.number_voids to service_role;
grant select, insert, update on fiscal_private.number_reservations to service_role;
grant select, insert on fiscal_private.artifacts to service_role;
grant select, insert on fiscal_private.transmission_attempts to service_role;
grant select, insert on fiscal_private.events to service_role;
grant select, insert on fiscal_private.operations to service_role;
grant usage, select on all sequences in schema fiscal_private to service_role;

comment on schema fiscal_private is 'Persistencia fiscal interna; nao expor pela Data API.';
comment on table fiscal_private.events is 'Historico append-only sem XML, PDF, certificado ou segredo.';
comment on table fiscal_private.artifacts is 'Somente referencias e checksums; conteudo permanece no armazenamento fiscal privado.';

commit;
