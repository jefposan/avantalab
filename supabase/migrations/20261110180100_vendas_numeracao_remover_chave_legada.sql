begin;
set local lock_timeout = '5s';

do $$
declare constraint_name text;
begin
  select c.conname into strict constraint_name
  from pg_constraint c
  where c.conrelid = 'fiscal_private.number_sequences'::regclass
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) = 'UNIQUE (company_id, establishment_id, document_type, series)';
  execute format('alter table fiscal_private.number_sequences drop constraint %I', constraint_name);
end $$;

commit;
