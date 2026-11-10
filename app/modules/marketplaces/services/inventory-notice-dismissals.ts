import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inventoryNoticeDismissAction, inventoryNoticeDismissCode, inventoryNoticeDismissKey, type InventoryNotice } from '../live-feed';
import { MarketplaceError } from './management-access';

const table = 'marketplace_inventory_notice_dismissals';

export async function visibleInventoryNotices(db: SupabaseClient, empresaId: string, userId: string, notices: InventoryNotice[]) {
  const ids = [...new Set(notices.filter(inventoryNoticeDismissAction).map(notice => notice.id))];
  const dismissed = new Set<string>();
  const signal = AbortSignal.timeout(4000);
  for (let offset = 0; offset < ids.length; offset += 50) {
    const { data, error } = await db.from(table)
      .select('notice_id,issue_code').eq('empresa_id', empresaId).eq('user_id', userId)
      .in('notice_id', ids.slice(offset, offset + 50)).abortSignal(signal);
    if (error || !data) {
      // Sem consultar o histórico, não é seguro reapresentar avisos dispensáveis.
      return { notices: notices.filter(notice => !inventoryNoticeDismissAction(notice)), noticeDismissalsUnavailable: true };
    }
    for (const row of data) dismissed.add(inventoryNoticeDismissKey({ id: row.notice_id, code: row.issue_code }));
  }
  return { notices: notices.filter(notice => !inventoryNoticeDismissAction(notice) || !dismissed.has(inventoryNoticeDismissKey(notice))), noticeDismissalsUnavailable: false };
}

export async function saveInventoryNoticeDismissal(
  db: SupabaseClient, empresaId: string, userId: string, notice: InventoryNotice,
) {
  const { error } = await db.from(table).upsert({
    empresa_id: empresaId, user_id: userId, notice_id: notice.id, issue_code: inventoryNoticeDismissCode(notice.code),
  }, { onConflict: 'empresa_id,user_id,notice_id,issue_code', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(4000));
  if (error) throw new MarketplaceError(503, 'dismissal_unavailable', 'Não foi possível dispensar o aviso. Tente novamente.');
}
