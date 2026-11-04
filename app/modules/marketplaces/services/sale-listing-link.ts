import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mlRequest, saveListing, type SellerConnection } from './mercadolivre-management';
import { listingIdIsValid, objectValue } from './listing-model';
import { MarketplaceError } from './management-access';

/** O mesmo título/EAN não prova estoque compartilhado: exige identidade do produto no ML. */
const userProduct = (value: unknown): value is string => typeof value === 'string' && /^MLB[A-Z]?\d+$/.test(value);
const relationIds = (item: Record<string, unknown>) => (Array.isArray(item.item_relations) ? item.item_relations : [])
  .map(objectValue).filter(row => listingIdIsValid(row.id) && row.variation_id == null && row.stock_relation === 1).map(row => String(row.id));
const eligible = (item: Record<string, unknown>, seller: string) => listingIdIsValid(item.id)
  && String(item.seller_id) === seller && Array.isArray(item.variations) && item.variations.length === 0;
export function sameRemoteStockProduct(item: Record<string, unknown>, anchor: Record<string, unknown>, seller: string) {
  return eligible(item, seller) && eligible(anchor, seller)
    && ((userProduct(item.user_product_id) && item.user_product_id === anchor.user_product_id)
      || (relationIds(item).includes(String(anchor.id)) && relationIds(anchor).includes(String(item.id))));
}

/** Recupera o vínculo do anúncio de venda/catálogo sem criar produto ou copiar saldo remoto. */
export async function resolveSaleListingLink(db: SupabaseClient, connection: SellerConnection, id: string, deadline = Infinity) {
  if (!listingIdIsValid(id)) return false;
  const links = () => db.from('marketplace_product_links').select('product_id,provider_listing_id,source_snapshot,updated_at')
    .eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).eq('provider', 'mercado_livre');
  const known = await links().eq('provider_listing_id', id).maybeSingle();
  if (known.error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível conferir o vínculo da venda.');
  const prior = objectValue(known.data?.source_snapshot);
  // Vínculos já publicados/manual/provados não precisam de nova consulta.
  // Importação antiga sem evidência pode ser conferida, nunca remapeada.
  if (known.data && (objectValue(prior.relationEvidence).anchorListingId || typeof prior.local_registration_preserved !== 'boolean')) return true;
  const read = async (path: string) => {
    if (Date.now() > deadline - 8_000) throw new MarketplaceError(409, 'worker_time_limit', 'O vínculo continuará em conferência.');
    return objectValue(await mlRequest(db, connection, path));
  };
  const item = await read(`/items/${id}`);
  if (item.id !== id || !eligible(item, connection.seller_reference)) return false;
  let ids = [id, ...relationIds(item)];
  if (userProduct(item.user_product_id)) {
    const associated = await read(`/users/${connection.seller_reference}/items/search?${new URLSearchParams({ user_product_id: item.user_product_id, limit: '100' })}`);
    const results = associated.results;
    if (!Array.isArray(results) || !results.length || results.length > 100 || !results.every(listingIdIsValid)
      || new Set(results).size !== results.length || objectValue(associated.paging).total !== results.length || !results.includes(id)) return false;
    ids = [...new Set([...ids, ...results])];
  }
  if (ids.length < 2 || ids.length > 100) return false;
  const related = await links().in('provider_listing_id', ids);
  if (related.error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível conferir os anúncios relacionados.');
  const rows = (related.data || []).filter(row => row.provider_listing_id !== id);
  if (!rows.length || new Set(rows.map(row => row.product_id)).size !== 1) return false;
  const productId = rows[0].product_id;
  if (known.data && known.data.product_id !== productId) return false;
  const product = await db.from('marketplace_products').select('id').eq('empresa_id', connection.empresa_id).eq('id', productId).is('archived_at', null).maybeSingle();
  if (product.error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível conferir o cadastro da venda.');
  if (!product.data) return false;
  const anchor = await read(`/items/${rows[0].provider_listing_id}`);
  if (anchor.id !== rows[0].provider_listing_id || !sameRemoteStockProduct(item, anchor, connection.seller_reference)) return false;
  // Conflito concorrente não sobrescreve vínculo manual. A baixa é feita exclusivamente pela RPC idempotente.
  const evidence = { model: userProduct(item.user_product_id) && item.user_product_id === anchor.user_product_id ? 'user_product' : 'catalog_stock_relation', userProductId: item.user_product_id ?? null,
    anchorListingId: anchor.id, sellerId: connection.seller_reference, checkedAt: new Date().toISOString(),
    availableQuantity: item.available_quantity, soldQuantity: item.sold_quantity, initialQuantity: item.initial_quantity };
  const saved = await db.from('marketplace_product_links').upsert({ empresa_id: connection.empresa_id,
    connection_id: connection.id, provider: 'mercado_livre', provider_listing_id: id, product_id: productId,
    title: typeof item.title === 'string' ? item.title.slice(0, 500) : 'Produto', status: typeof item.status === 'string' ? item.status : 'unknown',
    reported_stock: Number.isSafeInteger(item.available_quantity) && Number(item.available_quantity) >= 0 ? item.available_quantity : null,
    source_snapshot: { relationEvidence: evidence },
  }, { onConflict: 'empresa_id,connection_id,provider_listing_id', ignoreDuplicates: true });
  if (saved.error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível salvar o vínculo confirmado pelo Mercado Livre.');
  const verified = await links().eq('provider_listing_id', id).maybeSingle();
  if (verified.error) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível confirmar o vínculo salvo.');
  if (verified.data?.product_id !== productId) return false;
  if (known.data) {
    const proof = await db.from('marketplace_product_links').update({ source_snapshot: { ...prior, relationEvidence: evidence } })
      .eq('empresa_id', connection.empresa_id).eq('connection_id', connection.id).eq('provider_listing_id', id)
      .eq('product_id', productId).eq('updated_at', known.data.updated_at).select('product_id').maybeSingle();
    if (proof.error || !proof.data) return false;
  }
  // O trigger importador encontra o vínculo já provado e preserva a confirmação física.
  await saveListing(db, connection, item, false);
  return true;
}
