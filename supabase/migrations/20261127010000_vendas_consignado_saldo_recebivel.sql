-- Recupera somente cobranças suspensas pela conversão antiga para consignado.
-- A auditoria e o timestamp da conversão comprovam a origem do cancelamento.
-- Não reabre cancelamentos posteriores nem altera valores, vencimentos ou eventos.
with recuperadas as (
  update public.vendas_contas_receber r
     set situacao='aberto'
    from public.vendas_operacoes o
   where o.empresa_id=r.empresa_id and o.id=r.operacao_id
     and o.situacao in ('faturado','concluido')
     and o.pagamento_retrato->>'method'='consignado'
     and r.situacao='cancelado' and r.meio_pagamento='consignado'
     and r.saldo_aberto>0 and r.valor_recebido=0 and r.valor_estornado=0
     and exists (
       select 1 from public.vendas_eventos e
        where e.empresa_id=r.empresa_id
          and e.evento='condicoes_pagamento_alteradas'
          and e.metadados->>'operationId'=r.operacao_id::text
          and e.metadados->>'method'='consignado'
          and e.criado_em=r.atualizado_em
          and exists (select 1 from jsonb_array_elements(e.metadados->'before') b
                       where b->>'id'=r.id::text
                         and b->>'status' not in ('cancelado','estornado'))
     )
  returning r.empresa_id,r.id,r.operacao_id
)
insert into public.vendas_eventos(empresa_id,recurso_tipo,recurso_id,evento,resumo,metadados,chave_idempotencia)
select empresa_id,'conta_receber',id,'saldo_consignado_restaurado',
       'Saldo consignado disponível para recebimento sem vencimento',
       jsonb_build_object('operationId',operacao_id,'migration','20261127010000'),
       'consignado-saldo-20261127010000:'||id::text
  from recuperadas;
