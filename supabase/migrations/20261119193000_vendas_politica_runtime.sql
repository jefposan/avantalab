begin;
-- Somente o serviço interno de Vendas; permissões HTTP continuam obrigatórias.
grant select, insert, update on fiscal_private.commercial_policies to avanta_vendas_runtime;
create policy commercial_policies_runtime_select on fiscal_private.commercial_policies
for select to avanta_vendas_runtime
using (public.vendas_runtime_empresa_liberada(company_id));
create policy commercial_policies_runtime_insert on fiscal_private.commercial_policies
for insert to avanta_vendas_runtime
with check (public.vendas_runtime_empresa_liberada(company_id));
create policy commercial_policies_runtime_update on fiscal_private.commercial_policies
for update to avanta_vendas_runtime
using (public.vendas_runtime_empresa_liberada(company_id))
with check (public.vendas_runtime_empresa_liberada(company_id));
commit;
