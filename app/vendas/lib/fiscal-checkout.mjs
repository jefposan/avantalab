export const FISCAL_CHECKOUT_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CHECKOUT_V1';
export const FISCAL_CHECKOUT_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CHECKOUT_RESULT_V1';

/** Interrupção local da preparação não é cancelamento fiscal. */
export function canResumeFiscalDraft(draft, remote) {
  if (!draft || remote?.authorized === true) return false;
  const state = remote?.state || draft.remoteState || '';
  return ['', 'draft', 'prepared', 'number_reserved', 'signed'].includes(state);
}

export function fiscalDraftForReview(draft, remote) {
  if (draft?.status !== 'Cancelado' || !canResumeFiscalDraft(draft, remote)) return draft;
  return { ...draft, status: (draft.checks || []).some(check => !check.ready) ? 'Com pendências' : 'Pronto para homologação' };
}
