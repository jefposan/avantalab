/** Contrato público: confirmação fiscal e falha da última consulta são independentes. */
export type FiscalQuery = { checkedAt: string; ok: boolean; httpStatus?: number; code?: string; correlation?: string };
export type FiscalDocument = { id: string; type: string; status: string; errorCode?: string; formats: Array<'pdf' | 'xml' | 'json'> };
export type FiscalState = {
  status: 'unknown' | 'requested' | 'pending' | 'completed' | 'rejected' | 'cancelled' | 'uncertain';
  requestedAt?: string; receiptId?: string; substatus?: string; documents: FiscalDocument[];
  query?: FiscalQuery; importQuery?: FiscalQuery; importedInvoiceId?: string; errorCode?: string; retryAllowed?: boolean;
};
export type SaleFiscal = { dce: FiscalState; nfe: FiscalState; profile?: { kind: 'pf' | 'pj' | 'unknown'; query: FiscalQuery } };
export const emptyFiscal = (): FiscalState => ({ status: 'unknown', documents: [] });
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
export const fiscalCode = (v: unknown) => /^[a-zA-Z0-9_.:-]{1,100}$/.test(String(v || '')) ? String(v) : undefined;
export const fiscalId = (v: unknown) => /^[a-zA-Z0-9_-]{1,160}$/.test(String(v || '')) ? String(v) : '';
const state = (value: unknown): FiscalState => {
  const v = obj(value);
  return { ...v, status: ['requested', 'pending', 'completed', 'rejected', 'cancelled', 'uncertain'].includes(String(v.status)) ? v.status : 'unknown', documents: Array.isArray(v.documents) ? v.documents : [] } as FiscalState;
};
export function legacyDce(value: unknown): FiscalState {
  const v = obj(value);
  return { documents: [], status: v.status === 'completed' ? 'completed' : v.emissionId || v.status === 'pending' ? 'requested' : v.requestedAt ? 'uncertain' : 'unknown',
    ...(typeof v.requestedAt === 'string' ? { requestedAt: v.requestedAt } : {}), ...(fiscalId(v.emissionId) ? { receiptId: fiscalId(v.emissionId) } : {}) };
}
export function mergeFiscalConfirmation(previous: unknown, received: FiscalState): FiscalState {
  const saved = state(previous);
  // Um GET inconclusivo nunca revoga um protocolo ou documento conhecido.
  if (received.status === 'unknown') return { ...saved, query: received.query, importQuery: received.importQuery || saved.importQuery };
  if (saved.status === 'completed' && ['pending', 'requested'].includes(received.status)) return { ...saved, query: received.query };
  return { ...saved, ...received, requestedAt: saved.requestedAt || received.requestedAt, receiptId: received.receiptId || saved.receiptId };
}
export function dceFromProvider(value: unknown, checkedAt: string): FiscalState {
  const info = obj(value);
  const documents: FiscalDocument[] = (Array.isArray(info.documents) ? info.documents : []).slice(0, 100).map(obj).flatMap(doc => {
    const id = fiscalId(doc.dce_key);
    if (!id) return [];
    const formats = (Array.isArray(doc.files) ? doc.files : []).map(obj).map(f => f.format).filter((f): f is 'pdf' | 'xml' | 'json' => ['pdf', 'xml', 'json'].includes(String(f)));
    return [{ id, type: String(doc.document_type || 'DC-e').slice(0, 40), status: String(doc.status || 'unknown').slice(0, 40), errorCode: fiscalCode(obj(doc.error).code), formats: [...new Set(formats)] }];
  });
  const rejected = documents.some(d => d.status === 'rejected');
  return { status: info.status === 'error' || rejected ? 'rejected' : info.status === 'completed' ? 'completed' : info.status === 'pending' ? 'pending' : 'unknown',
    substatus: fiscalCode(info.sub_status), documents, query: { checkedAt, ok: true } };
}
export function nfeFromProvider(value: unknown, checkedAt: string): FiscalState {
  const invoice = obj(value), attributes = obj(invoice.attributes);
  const id = fiscalId(invoice.id), status = String(invoice.status || invoice.transaction_status || '').toLowerCase();
  const formats: FiscalDocument['formats'] = [];
  if (status === 'authorized') {
    if (typeof attributes.danfe_location === 'string') formats.push('pdf');
    if (typeof attributes.xml_location === 'string') formats.push('xml');
  }
  const errorCode = fiscalCode((Array.isArray(invoice.errors) ? obj(invoice.errors[0]).code : null) || invoice.error_code || (status === 'rejected' ? attributes.status_code : null));
  return { status: status === 'authorized' ? 'completed' : ['rejected', 'error'].includes(status) || errorCode ? 'rejected' : ['cancelled', 'canceled', 'annulled', 'voided'].includes(status) ? 'cancelled' : id ? 'pending' : 'unknown',
    receiptId: id || undefined, errorCode, documents: id ? [{ id, type: 'NF-e', status: status || 'unknown', errorCode, formats }] : [], query: { checkedAt, ok: true } };
}
export function fiscalWithOperation(previous: unknown, operation?: Record<string, unknown> | null): FiscalState {
  const saved = state(previous);
  if (!operation) return saved;
  const o = operation;
  if (['import', 'replace'].includes(String(o.action)) && ['sending', 'requested', 'uncertain'].includes(String(o.state))) return { ...saved, status: o.receipt_id ? 'pending' : 'uncertain', requestedAt: String(o.created_at) };
  if (o.state === 'rejected' && !o.receipt_id && [200, 400, 401, 403, 404, 422, 429].includes(Number(o.http_status))) return { ...saved, status: saved.status === 'completed' ? 'completed' : 'rejected', errorCode: fiscalCode(o.error_code), retryAllowed: true, requestedAt: undefined, receiptId: undefined };
  if (o.state === 'rejected') return saved.status === 'unknown' ? { ...saved, status: 'rejected', errorCode: fiscalCode(o.error_code), retryAllowed: false } : saved;
  const active = ['sending', 'requested', 'uncertain'].includes(String(o.state));
  const confirmedAfter = saved.status === 'completed' && saved.query?.ok && new Date(saved.query.checkedAt).getTime() >= new Date(String(o.created_at)).getTime();
  return { ...saved, status: active && !confirmedAfter ? o.receipt_id ? 'requested' : 'uncertain' : saved.status !== 'unknown' ? saved.status : o.state === 'completed' ? 'completed' : o.receipt_id ? 'requested' : 'uncertain', retryAllowed: false,
    requestedAt: saved.requestedAt || String(o.created_at), receiptId: saved.receiptId || fiscalId(o.receipt_id) || undefined };
}
export function fiscalStateText(label: string, fiscal: FiscalState): string {
  const labels: Record<FiscalState['status'], string> = { unknown: 'situação ainda não confirmada', requested: 'solicitação aceita', pending: 'em processamento', completed: 'documento emitido', rejected: 'rejeição fiscal; confira o documento antes de tentar novamente', cancelled: 'documento cancelado', uncertain: 'solicitação registrada, aguardando confirmação do Mercado Livre' };
  const failure = fiscal.query && !fiscal.query.ok ? ` Última consulta: ${fiscal.query.httpStatus === 404 ? 'recurso não localizado; isso não comprova ausência de emissão' : fiscal.query.httpStatus === 403 ? 'acesso recusado; confira as permissões desta conta' : 'indisponível'}.` : '';
  return `${label}: ${labels[fiscal.status]}${fiscal.errorCode ? ` (código ${fiscal.errorCode})` : ''}.${failure}`;
}
