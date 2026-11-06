-- Preserva a origem histórica ao substituir itens de pedidos reabertos para edição.
begin;
set local lock_timeout='5s';
alter table public.vendas_estoque_reservas add column if not exists item_origem_retrato jsonb;
alter table public.vendas_estoque_reservas drop constraint vendas_estoque_reservas_origem_check;
alter table public.vendas_estoque_reservas add constraint vendas_estoque_reservas_origem_check check (
  (operacao_item_id is not null and os_material_id is null)
  or (operacao_item_id is null and os_material_id is not null)
  or (operacao_item_id is null and os_material_id is null and situacao='liberada'
      and item_origem_retrato is not null and jsonb_typeof(item_origem_retrato)='object'
      and item_origem_retrato ? 'id' and item_origem_retrato ? 'produto_id')
);
commit;
