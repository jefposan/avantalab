-- NT 2025.002-RTC: TStat admite três ou quatro dígitos.
-- Somente amplia a validação; não altera notas, numeração, permissões ou histórico.
begin;
alter table fiscal_private.emissions drop constraint emissions_status_code_check;
alter table fiscal_private.emissions add constraint emissions_status_code_check check (status_code is null or status_code ~ '^[0-9]{3,4}$');
alter table fiscal_private.transmission_attempts drop constraint transmission_attempts_status_code_check;
alter table fiscal_private.transmission_attempts add constraint transmission_attempts_status_code_check check (status_code is null or status_code ~ '^[0-9]{3,4}$');
alter table fiscal_private.emission_corrections drop constraint emission_corrections_source_status_code_check;
alter table fiscal_private.emission_corrections add constraint emission_corrections_source_status_code_check check (source_status_code ~ '^[0-9]{3,4}$');
commit;
