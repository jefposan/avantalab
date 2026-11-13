import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inventoryNoticeDismissKey, type InventoryNotice } from '../live-feed';
import { inventoryRows } from './inventory-read';

export async function filterAccountCleanupNotices(db: SupabaseClient, companyId: string, notices: InventoryNotice[]) {
  if (!notices.length) return notices;
  const signal = AbortSignal.timeout(4_000);
  const rows = await inventoryRows(async (from, to) => {
    const result = await db.from('marketplace_account_hidden_notices').select('connection_id,notice_key')
      .eq('empresa_id', companyId).order('connection_id').order('notice_key').range(from, to).abortSignal(signal);
    // Antes da migração, continua valendo a política de avisos existente.
    if (['42P01', 'PGRST205'].includes(result.error?.code || '')) return { data: [], error: null };
    return result;
  });
  const hidden = new Set(rows.map(row => JSON.stringify([row.connection_id, row.notice_key])));
  // A limpeza dispensa o evento de venda atual, mesmo se a rotina revisar seu motivo.
  // O vínculo removido pode transformar stock_not_confirmed em product_not_linked.
  const hiddenSales = new Set<string>();
  for (const row of rows) {
    try {
      const key: unknown = JSON.parse(String(row.notice_key));
      if (Array.isArray(key) && key.length === 2 && typeof key[0] === 'string'
        && typeof key[1] === 'string' && key[0].startsWith('sale:')) {
        hiddenSales.add(JSON.stringify([row.connection_id, key[0]]));
      }
    } catch { /* Uma chave antiga inválida não dispensa outros avisos. */ }
  }
  return notices.filter(notice => !hidden.has(JSON.stringify([notice.connectionId, inventoryNoticeDismissKey(notice)]))
    && !(notice.source === 'sale' && hiddenSales.has(JSON.stringify([notice.connectionId, notice.id]))));
}
