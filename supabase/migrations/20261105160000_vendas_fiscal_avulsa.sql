-- Origem fiscal independente: sem pedido, contas a receber ou efeitos de estoque.
begin;
set local lock_timeout='5s';
alter table public.vendas_fiscal_rascunhos alter column operacao_id drop not null;
alter table public.vendas_fiscal_rascunhos drop constraint vendas_fiscal_rascunhos_origem_tipo_check;
alter table public.vendas_fiscal_rascunhos add constraint vendas_fiscal_rascunhos_origem_tipo_check
  check (origem_tipo in ('pedido','ordem_servico','avulsa'));
alter table public.vendas_fiscal_rascunhos add constraint vendas_fiscal_rascunhos_origem_vinculo_check
  check ((origem_tipo='avulsa' and operacao_id is null) or (origem_tipo<>'avulsa' and operacao_id is not null));
comment on table public.vendas_fiscal_rascunhos is 'Retrato fiscal imutável de pedido, serviço ou nota avulsa. Não gera faturamento, recebimento ou estoque nem transmite automaticamente.';
commit;
