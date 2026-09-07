-- MIGRACAO OFICIAL APROVADA PARA O PILOTO TRIDIUM.
-- Depende de 0001_fiscal_transactional_NOT_APPLIED.sql e permite preservar
-- todas as versões imutáveis de um artefato quando uma NF-e rejeitada é corrigida.

begin;

alter table fiscal_private.artifacts
  add column revision integer not null default 1 check (revision > 0);

alter table fiscal_private.artifacts
  drop constraint if exists artifacts_emission_id_artifact_type_key;

alter table fiscal_private.artifacts
  add constraint fiscal_artifacts_emission_type_revision_uq
    unique (emission_id, artifact_type, revision);

create index fiscal_artifacts_latest_idx
  on fiscal_private.artifacts(company_id, emission_id, artifact_type, revision desc);

comment on column fiscal_private.artifacts.revision is
  'Versão imutável do artefato dentro da emissão; revisões anteriores nunca são sobrescritas.';

commit;
