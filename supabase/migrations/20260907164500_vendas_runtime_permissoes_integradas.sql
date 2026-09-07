-- Mantém a credencial server-side de Vendas alinhada às tabelas integradas
-- criadas depois do provisionamento inicial, sem ampliar o acesso além da
-- empresa piloto Tridium.
begin;

grant select, insert, update on table public.vendas_fornecedores
  to avanta_vendas_runtime;

drop policy if exists vendas_runtime_tridium on public.vendas_fornecedores;
create policy vendas_runtime_tridium on public.vendas_fornecedores
for all to avanta_vendas_runtime
using (empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid)
with check (empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid);

grant select, insert on table public.vendas_fiscal_rascunho_cancelamentos
  to avanta_vendas_runtime;

drop policy if exists vendas_runtime_tridium on public.vendas_fiscal_rascunho_cancelamentos;
create policy vendas_runtime_tridium on public.vendas_fiscal_rascunho_cancelamentos
for all to avanta_vendas_runtime
using (empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid)
with check (empresa_id = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e'::uuid);

commit;
