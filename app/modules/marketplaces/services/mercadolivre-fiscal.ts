import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { mlRequest, mlBinaryRequest, loadConnection, type SellerConnection } from './mercadolivre-management';
import { objectValue, uuidIsValid } from './listing-model';
import { FiscalProviderError } from './fiscal-provider-error';
import { dceFromProvider, nfeFromProvider, fiscalId, fiscalCode, mergeFiscalConfirmation, type FiscalState, type FiscalQuery } from '../fiscal-state';
import { fiscalHistory, saveFiscalStatus, reserveFiscalOperation, finishFiscalOperation, type FiscalScope } from './fiscal-history';
import { inspectNfeXml } from './nfe-xml';

const numericId = (v: unknown) => /^\d{1,24}$/.test(String(v)) ? String(v) : '';
export function fiscalQueryFailure(error: unknown, checkedAt: string): FiscalQuery {
  return { checkedAt, ok: false, ...(error instanceof FiscalProviderError ? { httpStatus: error.httpStatus, code: error.providerCode || error.code, correlation: error.correlation }
    : { code: error instanceof MarketplaceError ? fiscalCode(error.code) : 'provider_unavailable', ...(error instanceof MarketplaceError && /^provider_\d{3}$/.test(error.code) ? { httpStatus: Number(error.code.slice(-3)) } : {}) }) };
}
export async function queryDce(db: SupabaseClient, connection: SellerConnection, orderId: string, previous: FiscalState): Promise<FiscalState> {
  const checkedAt = new Date().toISOString();
  try { return mergeFiscalConfirmation(previous, dceFromProvider(await mlRequest(db, connection, `/mlb/order/${orderId}/dce/info`), checkedAt)); }
  catch (error) { return { ...previous, query: fiscalQueryFailure(error, checkedAt) }; }
}
export async function reconcileFiscal(db: SupabaseClient, connection: SellerConnection, sale: FiscalScope, shipmentId?: string | null) {
  const previous = await fiscalHistory(db, sale);
  const checkedAt = new Date().toISOString();
  const [dce, invoice, imported, profile] = await Promise.all([
    queryDce(db, connection, sale.provider_order_id, previous.dce),
    (async () => {
      try {
        const invoice = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}/invoices/orders/${sale.provider_order_id}`));
        if (numericId(objectValue(invoice.issuer).user_id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_invoice', 'O emitente da nota fiscal não corresponde à conta deste pedido.');
        return nfeFromProvider(invoice, checkedAt);
      }
      catch (error) { return { ...previous.nfe, query: fiscalQueryFailure(error, checkedAt) }; }
    })(),
    (async () => {
      if (!shipmentId) return null;
      try {
        const info = objectValue(await mlRequest(db, connection, `/shipments/${shipmentId}/invoice_data?siteId=MLB`));
        if (numericId(info.sender_id) !== connection.seller_reference || numericId(info.shipment_id) !== shipmentId) throw new MarketplaceError(503, 'invalid_invoice', 'A nota fiscal não corresponde ao envio desta conta.');
        return { id: fiscalId(info.id), approved: info.status === 'approved', keyHash: /^\d{44}$/.test(String(info.fiscal_key)) ? createHash('sha256').update(String(info.fiscal_key)).digest('hex') : '', query: { checkedAt, ok: true } as FiscalQuery };
      } catch (error) { return { id: '', approved: false, keyHash: '', query: fiscalQueryFailure(error, checkedAt) }; }
    })(),
    (async () => {
      if (previous.profile?.query.ok && Date.now() - new Date(previous.profile.query.checkedAt).getTime() < 600_000) return previous.profile;
      try {
        const seller = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}`));
        if (numericId(seller.id) !== connection.seller_reference) throw new MarketplaceError(503, 'seller_mismatch', 'A identidade fiscal da conta não foi confirmada.');
        const type = objectValue(seller.identification).type;
        return { kind: type === 'CPF' ? 'pf' as const : type === 'CNPJ' ? 'pj' as const : 'unknown' as const, query: { checkedAt, ok: true } };
      } catch (error) { return { kind: 'unknown' as const, query: fiscalQueryFailure(error, checkedAt) }; }
    })(),
  ]);
  const nfe: FiscalState = { ...mergeFiscalConfirmation(previous.nfe, invoice), ...(imported ? { importQuery: imported.query } : {}) };
  if (imported?.id) {
    nfe.importedInvoiceId = imported.id;
    if (imported.approved && nfe.status !== 'completed') nfe.status = 'completed';
  }
  await saveFiscalStatus(db, sale, { dce, nfe, profile });
  // Só um retorno fiscal definitivo encerra a espera. Falha de leitura não destrava reenvio.
  for (const [type, state] of [['dce', dce], ['nfe', nfe]] as const) {
    if (!['completed', 'rejected', 'cancelled'].includes(state.status) || !(state.query?.ok || (type === 'nfe' && state.importQuery?.ok && state.importedInvoiceId))) continue;
    const result = await db.from('marketplace_fiscal_operations').update({ state: state.status === 'completed' ? 'completed' : 'rejected', updated_at: new Date().toISOString() })
      .eq('empresa_id', sale.empresa_id).eq('connection_id', sale.connection_id).eq('sale_id', sale.id).eq('document_type', type).in('action', ['issue', 'legacy']).in('state', ['requested', 'uncertain']);
    if (result.error) throw new MarketplaceError(503, 'fiscal_history_unavailable', 'A consulta chegou, mas o histórico fiscal não foi atualizado. Consulte novamente.');
  }
  if (imported?.approved && imported.keyHash) {
    const importedResult = await db.from('marketplace_fiscal_operations').update({ state: 'completed', updated_at: new Date().toISOString() })
      .eq('empresa_id', sale.empresa_id).eq('connection_id', sale.connection_id).eq('sale_id', sale.id).eq('document_type', 'nfe').in('action', ['import', 'replace'])
      .eq('expected_key_hash', imported.keyHash).in('state', ['requested', 'uncertain']);
    if (importedResult.error) throw new MarketplaceError(503, 'fiscal_history_unavailable', 'A confirmação da NF-e importada ainda não foi salva. Consulte novamente.');
  }
  return fiscalHistory(db, sale);
}
export async function loadFiscalSale(db: SupabaseClient, companyId: string, connectionId: unknown, saleId: unknown) {
  if (!uuidIsValid(saleId)) throw new MarketplaceError(400, 'invalid_sale', 'Pedido inválido.');
  const connection = await loadConnection(db, companyId, connectionId);
  const result = await db.from('marketplace_sales').select('*').eq('empresa_id', companyId).eq('connection_id', connection.id).eq('provider', 'mercado_livre').eq('id', saleId).maybeSingle();
  if (result.error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar a venda.');
  if (!result.data || !numericId(result.data.provider_order_id)) throw new MarketplaceError(404, 'sale_not_found', 'Venda não encontrada nesta conta.');
  const sale = result.data as FiscalScope;
  const order = objectValue(await mlRequest(db, connection, `/orders/${sale.provider_order_id}`));
  if (numericId(order.id) !== sale.provider_order_id || numericId(objectValue(order.seller).id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_order', 'O Mercado Livre não confirmou o pedido desta conta.');
  return { sale, connection, order, shipmentId: numericId(objectValue(order.shipping).id) };
}
export async function fiscalPendingShipment(db: SupabaseClient, connection: SellerConnection, order: Record<string, unknown>, shipmentId: string, type: 'dce' | 'nfe', replace = false) {
  if (!['paid', 'confirmed', 'partially_refunded'].includes(String(order.status)) || !shipmentId) throw new MarketplaceError(409, 'fiscal_unavailable', 'Este pedido não está liberado para documento fiscal.');
  const shipment = objectValue(await mlRequest(db, connection, `/shipments/${shipmentId}`));
  if (numericId(shipment.id) !== shipmentId) throw new MarketplaceError(503, 'invalid_shipment', 'O envio desta conta não foi confirmado.');
  const logistics = objectValue(shipment.logistic), logisticsType = String(logistics.type || logistics.logistic_type || shipment.logistic_type);
  const types = type === 'dce' ? ['drop_off', 'xd_drop_off', 'cross_docking'] : ['drop_off', 'xd_drop_off', 'cross_docking', 'xd_same_day'];
  if (String(logistics.mode || shipment.mode) !== 'me2' || !types.includes(logisticsType) || shipment.status !== 'ready_to_ship' || !(replace ? ['invoice_pending', 'ready_to_print'] : ['invoice_pending']).includes(String(shipment.substatus))) throw new MarketplaceError(409, 'fiscal_unavailable', replace ? 'A nota não pode ser substituída após a impressão da etiqueta ou o avanço do envio.' : 'O documento só pode ser solicitado quando o Mercado Livre confirmar a pendência fiscal deste envio.');
  return shipment;
}
export async function sendFiscalCommand(db: SupabaseClient, sale: FiscalScope, shipmentId: string, type: 'dce' | 'nfe', action: 'issue' | 'import' | 'replace', send: () => Promise<unknown>, actorId?: string, contentHash?: string, expectedKeyHash?: string) {
  const reserved = await reserveFiscalOperation(db, sale, shipmentId, type, action, actorId, contentHash, expectedKeyHash);
  let response: Record<string, unknown>;
  try {
    response = objectValue(await send());
    if (!response.id && fiscalCode(response.error_code)) throw new FiscalProviderError(200, fiscalCode(response.error_code));
  }
  catch (error) {
    // 409 pode significar processamento concorrente. 5xx/timeouts não comprovam recusa.
    const rejected = error instanceof FiscalProviderError && [200, 400, 401, 403, 404, 422, 429].includes(error.httpStatus)
      && !['shipment_already_being_processed', 'shipment_invoice_already_saved', 'nf_already_generated'].includes(error.providerCode || '');
    await finishFiscalOperation(db, sale, reserved.id, { state: rejected ? 'rejected' : 'uncertain', error_code: error instanceof FiscalProviderError ? error.providerCode || error.code : error instanceof MarketplaceError ? error.code : 'mutation_uncertain',
      ...(error instanceof FiscalProviderError ? { http_status: error.httpStatus, correlation: error.correlation || null } : {}) });
    if (rejected) throw error;
    throw new MarketplaceError(503, 'dce_uncertain', 'A solicitação fiscal está registrada, mas o Mercado Livre não confirmou o resultado. Consulte a situação; não repita a emissão.');
  }
  const receiptId = fiscalId(response.id);
  await finishFiscalOperation(db, sale, reserved.id, { state: receiptId ? 'requested' : 'uncertain', receipt_id: receiptId || null });
  if (!receiptId) throw new MarketplaceError(503, 'dce_confirmation_missing', 'O Mercado Livre respondeu sem protocolo. A solicitação permanece registrada; consulte antes de repetir.');
  return { emissionId: receiptId, alreadyRequested: false, completed: false };
}
/** Perfil declarado é registrado no comando, sem inferir IE ou adesão ao Faturador por um scope OAuth. */
export async function issueNfeForSale(db: SupabaseClient, companyId: string, connectionId: unknown, saleId: unknown, configured: boolean, actorId?: string) {
  if (!configured) throw new MarketplaceError(400, 'faturador_confirmation_required', 'Confirme que esta conta é PJ contribuinte e possui Faturador, certificado A1 e dados fiscais configurados.');
  const { sale, connection, order, shipmentId } = await loadFiscalSale(db, companyId, connectionId, saleId);
  await fiscalPendingShipment(db, connection, order, shipmentId, 'nfe');
  const current = await reconcileFiscal(db, connection, sale, shipmentId);
  if (current.dce.requestedAt || current.dce.receiptId || (current.dce.status !== 'unknown' && !current.dce.retryAllowed) || current.nfe.requestedAt || current.nfe.receiptId || current.nfe.importedInvoiceId) throw new MarketplaceError(409, 'fiscal_review_required', 'Já existe documento ou solicitação fiscal para este pedido. Consulte antes de emitir outra nota.');
  assertNfeQueries(current.nfe);
  const seller = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}`));
  if (numericId(seller.id) !== connection.seller_reference || objectValue(seller.identification).type !== 'CNPJ') throw new MarketplaceError(409, 'fiscal_profile_unconfirmed', 'A API não confirmou o perfil CNPJ desta conta. Confira o cadastro fiscal no Mercado Livre.');
  // Conferir o carrinho inteiro: nunca enviar orders de outro seller ao Faturador.
  let ids = [sale.provider_order_id];
  if (order.pack_id) {
    const packId = numericId(order.pack_id);
    if (!packId) throw new MarketplaceError(409, 'invalid_pack', 'O carrinho não foi confirmado.');
    const pack = objectValue(await mlRequest(db, connection, `/packs/${packId}`));
    const packOrders = Array.isArray(pack.orders) ? pack.orders.map(objectValue).map(o => numericId(o.id)) : [];
    if (numericId(pack.id) !== packId || !packOrders.includes(sale.provider_order_id) || packOrders.length > 30 || packOrders.some(id => !id)) throw new MarketplaceError(409, 'invalid_pack', 'Não foi possível conferir todos os pedidos deste carrinho.');
    const orders = await Promise.all([...new Set(packOrders)].map(async id => id === sale.provider_order_id ? order : objectValue(await mlRequest(db, connection, `/orders/${id}`))));
    ids = orders.filter(o => numericId(objectValue(o.seller).id) === connection.seller_reference).map(o => {
      if (numericId(o.pack_id) !== packId || numericId(objectValue(o.shipping).id) !== shipmentId || !['paid', 'confirmed', 'partially_refunded'].includes(String(o.status)) || !numericId(o.id)) throw new MarketplaceError(409, 'invalid_pack', 'As vendas do carrinho não estão todas aptas para este envio.');
      return numericId(o.id);
    });
  }
  const orders = ids.map(Number);
  if (!orders.length || orders.some(id => !Number.isSafeInteger(id))) throw new MarketplaceError(409, 'invalid_order', 'O identificador não pode ser enviado ao Faturador com segurança.');
  return sendFiscalCommand(db, sale, shipmentId, 'nfe', 'issue', () => mlRequest(db, connection, `/users/${connection.seller_reference}/invoices/orders`, 'POST', { orders }), actorId);
}
export async function importNfeForSale(db: SupabaseClient, companyId: string, connectionId: unknown, saleId: unknown, xml: unknown, replaceInvoiceId?: unknown, actorId?: string) {
  let inspected: ReturnType<typeof inspectNfeXml>;
  try { inspected = inspectNfeXml(xml); } catch (error) { throw new MarketplaceError(400, 'invalid_nfe_xml', error instanceof Error ? error.message : 'XML inválido.'); }
  const { sale, connection, order, shipmentId } = await loadFiscalSale(db, companyId, connectionId, saleId);
  const replace = !!replaceInvoiceId;
  await fiscalPendingShipment(db, connection, order, shipmentId, 'nfe', replace);
  const current = await reconcileFiscal(db, connection, sale, shipmentId);
  assertNfeQueries(current.nfe);
  if (current.dce.requestedAt || current.dce.receiptId || current.nfe.status === 'uncertain' || ['requested', 'pending'].includes(current.nfe.status)) throw new MarketplaceError(409, 'fiscal_review_required', 'Já existe uma solicitação fiscal neste envio. Consulte antes de importar.');
  if (replace ? !fiscalId(replaceInvoiceId) || current.nfe.importedInvoiceId !== replaceInvoiceId : current.nfe.importedInvoiceId || current.nfe.receiptId) throw new MarketplaceError(409, 'invoice_changed', 'A nota deste envio mudou. Consulte o pedido e confira o documento atual.');
  const seller = objectValue(await mlRequest(db, connection, `/users/${connection.seller_reference}`)), identification = objectValue(seller.identification);
  if (numericId(seller.id) !== connection.seller_reference || identification.type !== 'CNPJ' || String(identification.number || '').replace(/\D/g, '') !== inspected.issuer) throw new MarketplaceError(409, 'invoice_issuer_mismatch', 'O emitente do XML não foi confirmado como titular desta conta. Confira o cadastro fiscal no Mercado Livre.');
  const path = replace ? `/shipment_invoice/${fiscalId(replaceInvoiceId)}/?siteId=MLB` : `/shipments/${shipmentId}/invoice_data/?siteId=MLB`;
  return sendFiscalCommand(db, sale, shipmentId, 'nfe', replace ? 'replace' : 'import', () => mlRequest(db, connection, path, replace ? 'PUT' : 'POST', undefined, { xml: xml as string }), actorId, createHash('sha256').update(xml as string).digest('hex'), createHash('sha256').update(inspected.key).digest('hex'));
}
function assertNfeQueries(state: FiscalState) {
  if ([state.query, state.importQuery].some(q => q && !q.ok && q.httpStatus !== 404)) throw new MarketplaceError(409, 'fiscal_query_failed', 'Não foi possível conferir as notas existentes deste envio. Resolva o erro de consulta ou permissão antes de enviar outro documento.');
}
export async function fiscalDocumentForSale(db: SupabaseClient, companyId: string, connectionId: unknown, saleId: unknown, kind: unknown, documentId: unknown, format: unknown) {
  if (!['dce', 'nfe'].includes(String(kind)) || !['pdf', 'xml', 'json'].includes(String(format)) || !fiscalId(documentId)) throw new MarketplaceError(400, 'invalid_document', 'Documento ou formato inválido.');
  const { sale, connection, shipmentId } = await loadFiscalSale(db, companyId, connectionId, saleId);
  const state = await reconcileFiscal(db, connection, sale, shipmentId);
  const fiscal = kind === 'dce' ? state.dce : state.nfe;
  const doc = fiscal.documents.find(d => d.id === documentId && d.formats.includes(format as 'pdf' | 'xml' | 'json'));
  if (!doc || !['authorized', 'issued'].includes(doc.status)) throw new MarketplaceError(409, 'document_unavailable', 'O documento ainda não foi autorizado ou não oferece este formato.');
  // Nunca seguir location/URL arbitrária nem receber caminho de API do cliente.
  const path = kind === 'dce' ? `/mlb/order/${sale.provider_order_id}/dce/info/${doc.id}?doctype=${format}`
    : format === 'pdf' ? `/users/${connection.seller_reference}/invoices/sites/MLB/documents/danfe/${doc.id}` : `/users/${connection.seller_reference}/invoices/documents/xml/${doc.id}/authorized`;
  if (kind === 'nfe' && format === 'json') throw new MarketplaceError(400, 'invalid_format', 'Use XML ou DANFE para NF-e.');
  return { bytes: await mlBinaryRequest(db, connection, path, format as 'pdf' | 'xml' | 'json'), format: format as 'pdf' | 'xml' | 'json' };
}
