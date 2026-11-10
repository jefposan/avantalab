begin;
set local lock_timeout = '5s';

-- Inicializa somente a sequência NF-e de produção da Tridium.
-- Uma reaplicação preserva a configuração e a numeração já existentes.
insert into fiscal_private.number_sequences
  (company_id, establishment_id, document_type, environment, series, next_number)
select id, id, 'nfe', 'producao', '2', 1
from public.empresas e
where e.id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'
  and not exists (
    select 1 from fiscal_private.number_sequences s
    where s.company_id = e.id and s.establishment_id = e.id
      and s.document_type = 'nfe' and s.environment = 'producao'
      and (s.active or s.series::integer = 2)
  )
  and not exists (
    select 1 from fiscal_private.number_reservations r
    where r.company_id = e.id and r.establishment_id = e.id
      and r.document_type = 'nfe' and r.environment = 'producao'
      and r.series::integer = 2
  )
  and not exists (
    select 1 from fiscal_private.number_voids v
    where v.company_id = e.id and v.establishment_id = e.id
      and v.document_type = 'nfe' and v.environment = 'producao'
      and v.series::integer = 2
  )
on conflict do nothing;

commit;
