-- Mantém parcelas e reservas canceladas como histórico de ciclos anteriores.
-- Não altera valores, saldos, pedidos ou permissões existentes.
begin;
set local lock_timeout='5s';
alter table public.vendas_contas_receber
  drop constraint vendas_contas_receber_empresa_id_operacao_id_parcela_key;
create unique index vendas_contas_receber_parcela_vigente_uidx
  on public.vendas_contas_receber(empresa_id,operacao_id,parcela)
  where situacao <> 'cancelado';

alter table public.vendas_estoque_reservas drop constraint vendas_estoque_reservas_origem_check;
alter table public.vendas_estoque_reservas add constraint vendas_estoque_reservas_origem_check check (
  (operacao_item_id is not null and os_material_id is null)
  or (operacao_item_id is null and os_material_id is not null)
  or (operacao_item_id is null and os_material_id is null and situacao in ('liberada','devolvida')
      and item_origem_retrato is not null and jsonb_typeof(item_origem_retrato)='object'
      and item_origem_retrato ? 'id' and item_origem_retrato ? 'produto_id')
);
commit;
