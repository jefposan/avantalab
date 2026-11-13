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
  return notices.filter(notice => !hidden.has(JSON.stringify([notice.connectionId, inventoryNoticeDismissKey(notice)])));
}
