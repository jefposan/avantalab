import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { mlRequest, saveListing, type SellerConnection } from './mercadolivre-management';
import { objectValue, listingIdIsValid } from './listing-model';

/** Mudança de anúncio atualiza o retrato, nunca vira uma segunda baixa por diferença de quantidade. */
export async function observeInventoryListing(db: SupabaseClient, connection: SellerConnection, id: string) {
  if (!listingIdIsValid(id)) throw new MarketplaceError(400, 'invalid_listing', 'Anúncio inválido.');
  const item = objectValue(await mlRequest(db, connection, `/items/${id}`));
  if (item.id !== id || String(item.seller_id) !== connection.seller_reference) throw new MarketplaceError(503, 'invalid_listing', 'O anúncio não foi confirmado nesta conta.');
  await saveListing(db, connection, item, false);
  const result = await db.rpc('marketplace_observe_listing', { p_empresa: connection.empresa_id, p_connection: connection.id, p_listing: id,
    p_quantity: typeof item.available_quantity === 'number' && Number.isSafeInteger(item.available_quantity) && item.available_quantity >= 0 ? item.available_quantity : null,
    p_status: typeof item.status === 'string' ? item.status : 'unknown' });
  if (result.error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível conferir o vínculo de estoque deste anúncio.');
}
