// O documento avulso usa seu próprio ID como origem; nenhum pedido é criado.
export function fiscalDraftOriginReady(draft, { allowRejected = false, requireFiscalStatus = true } = {}) {
  if (draft?.originType === 'avulsa') return draft.operationId === draft.id;
  if (draft?.originType === 'pedido' && draft.totalsSnapshot?.independentIssuance === true) return ['confirmado', 'em_separacao', 'faturado'].includes(draft.operationStatus);
  return draft?.originType === 'pedido' && draft.operationStatus === 'faturado'
    && (!requireFiscalStatus || draft.operationFiscalStatus === 'rascunho_criado' || (allowRejected && draft.operationFiscalStatus === 'rejeitado'));
}
