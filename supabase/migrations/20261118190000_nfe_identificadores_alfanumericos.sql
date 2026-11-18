begin;
-- NT Conjunta DFe 2025.001 e NT NF-e 2026.004: mesma chave de 44 posições;
-- letras exclusivamente nas 12 primeiras posições do CNPJ. Sem UPDATE de
-- documentos, séries, numeração, tributos, certificados ou arquivos existentes.
alter table fiscal_private.emissions drop constraint emissions_access_key_check;
alter table fiscal_private.emissions add constraint emissions_access_key_check check (
 access_key is null or access_key ~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
);
alter table fiscal_private.artifacts drop constraint artifacts_access_key_check;
alter table fiscal_private.artifacts add constraint artifacts_access_key_check check (
 access_key ~ '^[0-9]{6}[A-Z0-9]{12}[0-9]{26}$'
);
alter table fiscal_private.certificates drop constraint certificates_subject_document_check;
alter table fiscal_private.certificates add constraint certificates_subject_document_check check (
 subject_document ~ '^[A-Z0-9]{12}[0-9]{2}$'
);
commit;
