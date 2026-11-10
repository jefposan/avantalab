begin;
set local lock_timeout = '5s';

-- O histórico existente pertence integralmente ao piloto de homologação.
alter table fiscal_private.number_sequences
  add column environment text not null default 'homologacao'
  check (environment in ('homologacao', 'producao'));

alter table fiscal_private.number_sequences add unique (company_id, establishment_id, document_type, environment, series);

alter table fiscal_private.number_reservations
  add column environment text not null default 'homologacao'
  check (environment in ('homologacao', 'producao'));

alter table fiscal_private.number_voids
  add column environment text not null default 'homologacao'
  check (environment in ('homologacao', 'producao'));

drop index fiscal_private.number_sequences_active_uq;
create unique index number_sequences_active_uq on fiscal_private.number_sequences
  (company_id, establishment_id, document_type, environment) where active;

drop index fiscal_private.number_reservations_occupied_number;
create unique index number_reservations_occupied_number on fiscal_private.number_reservations
  (company_id, establishment_id, document_type, environment, series, number)
  where status <> 'released';

-- Uma reserva só pode pertencer a uma emissão do mesmo ambiente.
alter table fiscal_private.emissions add unique (id, environment);
alter table fiscal_private.number_reservations
  add foreign key (emission_id, environment)
  references fiscal_private.emissions (id, environment) on delete restrict;

commit;
