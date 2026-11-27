begin;

-- O papel da API já usa RLS em public.empresas, por empresa com Vendas ativo.
grant update (vendas_estoque_controle_ativo) on public.empresas to avanta_vendas_runtime;

commit;
