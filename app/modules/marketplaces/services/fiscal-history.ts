import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { emptyFiscal, fiscalWithOperation, legacyDce, mergeFiscalConfirmation, type FiscalState, type SaleFiscal } from '../fiscal-state';
import { objectValue } from './listing-model';

export type FiscalScope = { empresa_id: string; connection_id: string; id: string; provider_order_id: string; shipment_id?: string | null; snapshot?: unknown };
const databaseError = () => new MarketplaceError(503, 'fiscal_history_unavailable', 'O histórico fiscal não pôde ser conferido. Nenhum novo documento será solicitado; atualize o pedido.');
function scoped(db: SupabaseClient, table: string, sale: FiscalScope) {
  return db.from(table).select('*').eq('empresa_id', sale.empresa_id).eq('connection_id', sale.connection_id).eq('sale_id', sale.id);
}
export async function fiscalHistory(db: SupabaseClient, sale: FiscalScope): Promise<SaleFiscal> {
  const [status, operations] = await Promise.all([
    scoped(db, 'marketplace_fiscal_status', sale).maybeSingle(),
    scoped(db, 'marketplace_fiscal_operations', sale).order('created_at', { ascending: false }).limit(100),
  ]);
  if (status.error || operations.error) throw databaseError();
  const previous = status.data;
  const latest = (type: string) => operations.data?.find(o => o.document_type === type);
  return { dce: fiscalWithOperation(previous?.dce || legacyDce(objectValue(sale.snapshot).dceEmission), latest('dce')),
    nfe: fiscalWithOperation(previous?.nfe || emptyFiscal(), latest('nfe')), ...(previous?.profile ? { profile: previous.profile } : {}) };
}
export async function saveFiscalStatus(db: SupabaseClient, sale: FiscalScope, incoming: SaleFiscal): Promise<SaleFiscal> {
  // Reconciliar sob CAS: consultas concorrentes não substituem confirmação posterior.
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await scoped(db, 'marketplace_fiscal_status', sale).maybeSingle();
    if (existing.error) throw databaseError();
    const row = existing.data;
    const merge = (type: 'dce' | 'nfe') => {
      const current = row?.[type];
      if (current?.query?.checkedAt && incoming[type].query?.checkedAt && current.query.checkedAt > incoming[type].query!.checkedAt) return current as FiscalState;
      return mergeFiscalConfirmation(current, incoming[type]);
    };
    const merged = { dce: merge('dce'), nfe: merge('nfe'), profile: incoming.profile || row?.profile };
    const payload = { ...merged, updated_at: new Date().toISOString(), revision: (row?.revision || 0) + 1 };
    const result = row
      ? await db.from('marketplace_fiscal_status').update(payload).eq('empresa_id', sale.empresa_id).eq('connection_id', sale.connection_id).eq('sale_id', sale.id).eq('revision', row.revision).select('sale_id').maybeSingle()
      : await db.from('marketplace_fiscal_status').insert({ ...payload, empresa_id: sale.empresa_id, connection_id: sale.connection_id, sale_id: sale.id }).select('sale_id').maybeSingle();
    if (result.data) return merged;
    if (result.error && result.error.code !== '23505') throw databaseError();
  }
  throw new MarketplaceError(409, 'fiscal_changed', 'Uma atualização fiscal mais recente chegou. Consulte novamente.');
}
export async function reserveFiscalOperation(db: SupabaseClient, sale: FiscalScope, shipmentId: string, type: 'dce' | 'nfe', action: 'issue' | 'import' | 'replace', actorId?: string, contentHash?: string, expectedKeyHash?: string) {
  const result = await db.from('marketplace_fiscal_operations').insert({ empresa_id: sale.empresa_id, connection_id: sale.connection_id, sale_id: sale.id,
    order_id: sale.provider_order_id, shipment_id: shipmentId, document_type: type, action, state: 'sending', actor_id: actorId || null, content_hash: contentHash || null, expected_key_hash: expectedKeyHash || null }).select('id,created_at').single();
  if (result.error || !result.data) {
    if (result.error?.code === '23505') throw new MarketplaceError(409, 'fiscal_in_progress', 'Já existe uma solicitação fiscal para este envio. Consulte a situação antes de repetir.');
    throw databaseError();
  }
  return result.data as { id: string; created_at: string };
}
export async function finishFiscalOperation(db: SupabaseClient, sale: FiscalScope, id: string, update: Record<string, unknown>) {
  const result = await db.from('marketplace_fiscal_operations').update({ ...update, updated_at: new Date().toISOString() })
    .eq('empresa_id', sale.empresa_id).eq('connection_id', sale.connection_id).eq('sale_id', sale.id).eq('id', id).eq('state', 'sending').select('id').maybeSingle();
  if (result.error || !result.data) throw new MarketplaceError(503, 'dce_receipt_pending', 'A solicitação fiscal está registrada, mas o retorno ainda não pôde ser salvo. Consulte o pedido antes de repetir.');
}
export async function attachFiscalHistory<T extends { id: string; connectionId: string; provider?: string }>(db: SupabaseClient, companyId: string, sales: T[]): Promise<Array<T & { fiscal?: SaleFiscal; dceRequested?: boolean; dceStatus?: 'requested' | 'completed' | 'uncertain' | 'unknown' | 'rejected' | 'not_requested' }>> {
  const ids = sales.filter(s => !s.provider || s.provider === 'mercado_livre').map(s => s.id);
  if (!ids.length) return sales;
  const readAll = async (table: string) => {
    const rows: Record<string, unknown>[] = [];
    for (let index = 0; index < ids.length; index += 100) {
      for (let offset = 0; ; offset += 500) {
        const result = await db.from(table).select('*').eq('empresa_id', companyId).in('sale_id', ids.slice(index, index + 100))
          .order(table === 'marketplace_fiscal_operations' ? 'created_at' : 'sale_id', { ascending: false }).range(offset, offset + 499);
        if (result.error) throw databaseError();
        rows.push(...result.data || []);
        if (!result.data || result.data.length < 500) break;
      }
    }
    return rows;
  };
  const [states, operations] = await Promise.all([readAll('marketplace_fiscal_status'), readAll('marketplace_fiscal_operations')]);
  return sales.map(sale => {
    if (sale.provider && sale.provider !== 'mercado_livre') return sale;
    const saved = states.find(s => s.sale_id === sale.id && s.connection_id === sale.connectionId);
    const matching = operations.filter(o => o.sale_id === sale.id && o.connection_id === sale.connectionId);
    const previous = sale as T & { dceRequested?: boolean; dceStatus?: string };
    const fallback: FiscalState = { documents: [], status: previous.dceStatus === 'completed' ? 'completed' : previous.dceRequested ? previous.dceStatus === 'uncertain' ? 'uncertain' : 'requested' : 'unknown' };
    const fiscal: SaleFiscal = { dce: fiscalWithOperation(saved?.dce || fallback, matching.find(o => o.document_type === 'dce')), nfe: fiscalWithOperation(saved?.nfe, matching.find(o => o.document_type === 'nfe')), ...(saved?.profile ? { profile: saved.profile as SaleFiscal['profile'] } : {}) };
    const dce = fiscal.dce;
    return { ...sale, fiscal, dceRequested: !!dce.requestedAt || !!dce.receiptId || ['requested', 'pending', 'completed', 'uncertain'].includes(dce.status),
      dceStatus: dce.status === 'completed' ? 'completed' as const : dce.status === 'uncertain' ? 'uncertain' as const : ['pending', 'requested'].includes(dce.status) ? 'requested' as const : dce.status === 'rejected' ? 'rejected' as const : 'unknown' as const };
  });
}
