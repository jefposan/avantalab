-- Desativa, de forma idempotente e sem apagar dados, o acoplamento indevido
-- entre a precificação interna da Gestão e o catálogo/pedidos do AvantaVendas.
-- Colunas que possam ter sido criadas por uma implantação anterior permanecem
-- preservadas no banco, mas deixam de ser lidas, gravadas ou automatizadas.
begin;

drop trigger if exists vendas_mobile_clientes_validar_tabela_preco on public.vendas_mobile_clientes;
drop trigger if exists vendas_mobile_pedidos_tabela_preco on public.vendas_mobile_pedidos;
drop trigger if exists vendas_mobile_pedido_itens_preco_referencia on public.vendas_mobile_pedido_itens;

drop function if exists public.validar_tabela_preco_cliente_vendas_mobile();
drop function if exists public.preencher_tabela_preco_pedido_vendas_mobile();
drop function if exists public.preencher_preco_referencia_item_vendas_mobile();
drop function if exists public.vendas_mobile_listar_precos_rpc(uuid);

drop policy if exists custos_tabelas_preco_leitura on public.custos_tabelas_preco;
create policy custos_tabelas_preco_leitura on public.custos_tabelas_preco
  for select to authenticated
  using (public.custos_pode_acessar_empresa(empresa_id, false));

drop policy if exists custos_tabela_preco_itens_leitura on public.custos_tabela_preco_itens;
create policy custos_tabela_preco_itens_leitura on public.custos_tabela_preco_itens
  for select to authenticated
  using (
    exists (
      select 1
        from public.custos_tabelas_preco tabela
       where tabela.id = tabela_preco_id
         and public.custos_pode_acessar_empresa(tabela.empresa_id, false)
    )
  );

commit;
