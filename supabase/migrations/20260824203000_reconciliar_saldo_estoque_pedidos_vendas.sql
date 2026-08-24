-- Corrige os saldos que não receberam a reconciliação da av88 porque entradas
-- retroativas foram comparadas pela data de gravação no banco, e não pela data
-- real da movimentação. A diferença entre pedidos ativos e saídas já refletidas
-- torna esta operação idempotente e evita qualquer abatimento duplicado.

create temporary table vendas_mobile_estoque_reconciliacao_av94 on commit drop as
with referencias as (
  select
    produto.id as produto_id,
    produto.user_id,
    produto.conta_id,
    coalesce(produto.estoque, 0)::numeric(12,3) as saldo_anterior,
    ajuste.data_movimentacao as ajuste_data,
    ajuste.criado_em as ajuste_criado_em
  from public.vendas_mobile_produtos produto
  left join lateral (
    select movimento.data_movimentacao, movimento.criado_em
      from public.vendas_mobile_estoque_movimentos movimento
     where movimento.produto_id = produto.id
       and movimento.conta_id = produto.conta_id
       and movimento.tipo = 'ajuste'
     order by movimento.criado_em desc, movimento.id desc
     limit 1
  ) ajuste on true
  where produto.estoque_controlado = true
), diferencas as (
  select
    referencia.*,
    coalesce((
      select sum(item.quantidade)
        from public.vendas_mobile_pedido_itens item
        join public.vendas_mobile_pedidos pedido
          on pedido.id = item.pedido_id
         and pedido.conta_id = referencia.conta_id
       where item.produto_id = referencia.produto_id
         and lower(coalesce(pedido.status, '')) not in ('cancelada', 'cancelado')
         and (
           referencia.ajuste_data is null
           or (pedido.criado_em at time zone 'America/Sao_Paulo')::date > referencia.ajuste_data
           or (
             (pedido.criado_em at time zone 'America/Sao_Paulo')::date = referencia.ajuste_data
             and pedido.atualizado_em > referencia.ajuste_criado_em
           )
         )
    ), 0)::numeric(12,3) as quantidade_esperada,
    coalesce(-(
      select sum(movimento.quantidade)
        from public.vendas_mobile_estoque_movimentos movimento
       where movimento.produto_id = referencia.produto_id
         and movimento.conta_id = referencia.conta_id
         and movimento.tipo in ('venda', 'consignacao', 'retorno_consignacao', 'cancelamento')
         and (
           referencia.ajuste_criado_em is null
           or movimento.criado_em > referencia.ajuste_criado_em
         )
    ), 0)::numeric(12,3) as quantidade_refletida
  from referencias referencia
)
select
  produto_id,
  user_id,
  conta_id,
  (quantidade_esperada - quantidade_refletida)::numeric(12,3) as diferenca,
  saldo_anterior,
  (saldo_anterior - (quantidade_esperada - quantidade_refletida))::numeric(12,3) as saldo_final
from diferencas
where abs(quantidade_esperada - quantidade_refletida) > 0.0005;

update public.vendas_mobile_produtos produto
   set estoque = reconciliacao.saldo_final,
       atualizado_em = now()
  from vendas_mobile_estoque_reconciliacao_av94 reconciliacao
 where produto.id = reconciliacao.produto_id
   and produto.conta_id = reconciliacao.conta_id;

insert into public.vendas_mobile_estoque_movimentos (
  user_id, conta_id, produto_id, tipo, quantidade, saldo_anterior,
  saldo_final, observacao, data_movimentacao
)
select
  user_id,
  conta_id,
  produto_id,
  case when diferenca > 0 then 'venda' else 'cancelamento' end,
  -diferenca,
  saldo_anterior,
  saldo_final,
  'Reconciliação av94 das saídas de pedidos ainda não refletidas no estoque.',
  (now() at time zone 'America/Sao_Paulo')::date
from vendas_mobile_estoque_reconciliacao_av94;

notify pgrst, 'reload schema';
