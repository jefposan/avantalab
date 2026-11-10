begin;
set local lock_timeout = '5s';

alter table fiscal_private.emissions
  drop constraint emissions_environment_check,
  add constraint emissions_environment_check
    check (environment in ('homologacao', 'producao'));

commit;
