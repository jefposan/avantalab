-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Depende de 0006_fiscal_certificates_NOT_APPLIED.sql e serve apenas ao
-- laboratório local até revisão formal da cadeia ICP-Brasil e revogação.

begin;

alter table fiscal_private.certificates
  add column validation_checked_at timestamptz,
  add column activated_at timestamptz,
  add column validation_evidence jsonb;

alter table fiscal_private.certificates
  add constraint nfe_certificates_activation_evidence_check check (
    status <> 'active'
    or (
      validation_checked_at is not null
      and activated_at is not null
      and jsonb_typeof(validation_evidence) = 'object'
      and validation_evidence @> '{"ownerVerified":true,"validityVerified":true,"keyUsageVerified":true,"chainVerified":true,"rootPinned":true,"revocationVerified":true,"signingAvailable":true,"mutualTlsAvailable":true}'::jsonb
      and not (validation_evidence ?| array['password','passphrase','pkcs12','pfx','privateKey','encryptedPayload','iv','authTag','certificatePem','chainPem'])
    )
  );

alter table fiscal_private.certificate_events
  drop constraint if exists certificate_events_event_type_check;

alter table fiscal_private.certificate_events
  add constraint nfe_certificate_events_type_check check (
    event_type in ('certificate.installed','certificate.replaced','certificate.activated','certificate.blocked')
  );

comment on column fiscal_private.certificates.validation_evidence is
  'Somente evidencias publicas e booleanas; nunca certificado, cadeia, senha, chave ou resposta bruta de revogacao.';
comment on column fiscal_private.certificates.activated_at is
  'Preenchido somente pela transacao que registra todas as verificacoes obrigatorias como aprovadas.';

commit;
