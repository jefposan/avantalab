-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Depende de 0001 e 0008. Acrescenta o evento processado de cancelamento ao
-- armazenamento fiscal privado e imutável.

begin;

alter table fiscal_private.artifacts
  drop constraint if exists artifacts_artifact_type_check;

alter table fiscal_private.artifacts
  add constraint artifacts_artifact_type_check check (
    artifact_type in (
      'signed_xml',
      'protocol_xml',
      'processed_xml',
      'danfe_pdf',
      'cancellation_event_xml'
    )
  );

comment on constraint artifacts_artifact_type_check on fiscal_private.artifacts is
  'Artefatos fiscais imutáveis, incluindo o evento processado de cancelamento.';

commit;
