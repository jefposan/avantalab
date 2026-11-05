import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mercadoLivrePictures, validProductPictures } from '../product-photos';
import { MarketplaceError } from './management-access';
import { loadConnection, mlRequest } from './mercadolivre-management';
import { listingIdIsValid, objectValue } from './listing-model';
import { validEan } from './catalog-publication';

/** Somente leitura do anúncio já vinculado. Não consulta catálogos por semelhança. */
export async function readImportedProductPictures(db: SupabaseClient, companyId: string, source: {
  provider: string; connection_id: string; provider_listing_id: string; snapshot?: unknown;
}, ean?: string | null) {
  const saved = validProductPictures(objectValue(source.snapshot).pictures, source.provider === 'mercado_livre');
  if (saved.length) return saved;
  if (source.provider !== 'mercado_livre' || !listingIdIsValid(source.provider_listing_id)) return [];
  const connection = await loadConnection(db, companyId, source.connection_id);
  const item = objectValue(await mlRequest(db, connection, `/items/${source.provider_listing_id}`));
  if (item.id !== source.provider_listing_id || String(item.seller_id) !== connection.seller_reference) throw new MarketplaceError(409, 'photo_identity', 'Não foi possível confirmar o anúncio de origem das fotos.');
  if (Array.isArray(item.variations) && item.variations.length) throw new MarketplaceError(409, 'photo_variations', 'Este anúncio tem variações; confira a foto da variação no cadastro.');
  const gtin = (Array.isArray(item.attributes) ? item.attributes : []).map(objectValue).find(row => row.id === 'GTIN');
  const sourceEan = validEan(gtin?.value_name);
  if (ean && sourceEan && ean !== sourceEan) throw new MarketplaceError(409, 'photo_identity', 'O EAN do anúncio de origem mudou. Confira o cadastro antes de recuperar a foto.');
  return mercadoLivrePictures(item);
}
