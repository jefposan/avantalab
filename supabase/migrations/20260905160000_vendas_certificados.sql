-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Depende de 0001_fiscal_transactional_NOT_APPLIED.sql, chave mestra externa,
-- backup/restore e revisao formal antes de qualquer certificado real.

begin;

create table fiscal_private.certificates (
  id uuid primary key,
  company_id uuid not null references public.empresas(id) on delete restrict,
  document_type text not null check (document_type = 'nfe'),
  mode text not null check (mode = 'a1'),
  status text not null check (status in ('pending_validation','active','replaced','blocked')),
  secure_reference text not null unique check (secure_reference ~ '^certificate://[0-9a-f-]{36}/[0-9a-f-]{36}$'),
  key_id text not null check (char_length(key_id) between 3 and 80),
  iv bytea not null check (octet_length(iv) = 12),
  auth_tag bytea not null check (octet_length(auth_tag) = 16),
  encrypted_payload bytea not null check (octet_length(encrypted_payload) between 1 and 5243904),
  fingerprint_sha256 text not null check (fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  subject_document text not null check (subject_document ~ '^[0-9]{14}$'),
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  installed_by uuid not null references auth.users(id) on delete restrict,
  installed_at timestamptz not null default now(),
  replaced_at timestamptz,
  constraint nfe_certificates_validity_check check (valid_to > valid_from),
  constraint nfe_certificates_status_check check (
    (status in ('pending_validation','active') and replaced_at is null)
    or (status in ('replaced','blocked') and replaced_at is not null)
  )
);

create unique index certificates_company_current_uq
  on fiscal_private.certificates(company_id, document_type) where status in ('pending_validation','active');
create index certificates_company_history_idx
  on fiscal_private.certificates(company_id, document_type, installed_at desc);

create table fiscal_private.certificate_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.empresas(id) on delete restrict,
  certificate_id uuid not null references fiscal_private.certificates(id) on delete restrict,
  event_type text not null check (event_type in ('certificate.installed','certificate.replaced','certificate.blocked')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  public_payload jsonb not null default '{}'::jsonb check (
    jsonb_typeof(public_payload) = 'object'
    and not (public_payload ?| array['password','passphrase','pkcs12','pfx','privateKey','encryptedPayload','iv','authTag'])
  ),
  occurred_at timestamptz not null default now()
);

create index certificate_events_company_idx
  on fiscal_private.certificate_events(company_id, occurred_at desc);

create trigger certificate_events_immutable before update or delete on fiscal_private.certificate_events
  for each row execute function fiscal_private.reject_immutable_change();

alter table fiscal_private.certificates enable row level security;
alter table fiscal_private.certificates force row level security;
alter table fiscal_private.certificate_events enable row level security;
alter table fiscal_private.certificate_events force row level security;

revoke all on fiscal_private.certificates from public, anon, authenticated;
revoke all on fiscal_private.certificate_events from public, anon, authenticated;
grant select, insert, update on fiscal_private.certificates to service_role;
grant select, insert on fiscal_private.certificate_events to service_role;
grant usage, select on all sequences in schema fiscal_private to service_role;

comment on table fiscal_private.certificates is 'Certificados A1 cifrados por chave externa ao banco; nunca expostos pela Data API.';
comment on column fiscal_private.certificates.encrypted_payload is 'PKCS#12 normalizado e senha interna aleatoria em envelope AES-256-GCM autenticado.';
comment on table fiscal_private.certificate_events is 'Auditoria imutavel sem arquivo, senha, chave privada ou parametros de decifracao.';

commit;
