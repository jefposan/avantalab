import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import type { ProductInternalNotes } from '../product-internal-notes';

export async function readProductInternalNotes(db: SupabaseClient, companyId: string, ids: string[]) {
  const result = new Map<string, ProductInternalNotes>();
  if (!ids.length) return result;
  const { data, error } = await db.from('marketplace_product_internal_notes')
    .select('product_id,notes,revision').eq('empresa_id', companyId).in('product_id', ids).abortSignal(AbortSignal.timeout(20_000));
  const unavailable = error && ['42P01', 'PGRST205'].includes(error.code);
  if (error && !unavailable) throw new MarketplaceError(503, 'product_notes_unavailable', 'Não foi possível conferir as observações internas. Atualize antes de editar.');
  for (const id of ids) {
    const row = data?.find(item => item.product_id === id);
    result.set(id, { internalNotes: row?.notes || '', internalNotesRevision: row?.revision || 0, internalNotesAvailable: !unavailable });
  }
  return result;
}
