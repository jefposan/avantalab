-- Dados necessários para rentabilidade histórica e aniversários dos clientes.

alter table public.vendas_mobile_clientes
  add column if not exists data_nascimento date;

alter table public.vendas_mobile_pedido_itens
  add column if not exists preco_custo numeric(12,2)
  check (preco_custo is null or preco_custo >= 0);

-- Versões anteriores guardavam o custo apenas nos metadados do produto.
update public.vendas_mobile_produtos
set preco_custo = replace(metadados->>'preco_custo', ',', '.')::numeric
where coalesce(preco_custo, 0) = 0
  and coalesce(metadados->>'preco_custo', '') ~ '^\d+([.,]\d+)?$'
  and replace(metadados->>'preco_custo', ',', '.')::numeric > 0;
