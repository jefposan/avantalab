import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { safeHttpsImage, safeText, validEan } from './catalog-publication';
import { canonicalProductAttributes, sourceUrl } from './web-product-facts';
import { uuidIsValid, objectValue } from './listing-model';
import { getLocalProduct, productCommand } from './local-products';
import { priceStockState } from '../price-stock-state';
import {enqueueConfirmedZero} from './zero-stock';

export async function registerConsultedProduct(db: SupabaseClient, empresaId: string, actor: string, input: { id: string; name: string; description?: string; image?: string | null; pictures?:string[]; attributes?: unknown; sources?:string[] }, ean?: string | null, price?: number) {
  const pictures=[...new Set([input.image,...input.pictures||[]].map(safeHttpsImage).filter((url):url is string=>!!url))].slice(0,12);
  const { data, error } = await db.rpc(pictures.length>1?'marketplace_price_product_register_gallery':'marketplace_price_product_register', {
    p_empresa_id: empresaId, p_actor_id: actor, p_source_key: `mercado_livre:${safeText(input.id, 220)}`,
    p_data: { name: safeText(input.name, 220), ean: validEan(ean) || null, description: safeText(input.description, 50000), image: safeHttpsImage(input.image), pictures, attributes: canonicalProductAttributes(input.attributes), sources:(input.sources||[]).slice(0,20).map(sourceUrl).filter(Boolean), price_cents: typeof price === 'number' && Number.isFinite(price) && price > 0 ? Math.round(price * 100) : null },
  });
  if (error || !uuidIsValid(data)) throw new MarketplaceError(error?.code === 'P0001' ? 409 : 503, 'price_product_unavailable', error?.code === 'P0001' ? error.message : 'Não foi possível vincular o produto ao cadastro. Confira se o banco está atualizado e tente novamente.');
  return String(data);
}

export async function priceStockProduct(db: SupabaseClient, empresaId: string, input: unknown) {
  const body = objectValue(input);
  let productId = body.productId;
  if (body.historyId != null) {
    if (!uuidIsValid(body.historyId)) throw new MarketplaceError(400, 'invalid_history', 'Selecione um produto do histórico.');
    const { data, error } = await db.from('marketplace_price_consultations').select('local_product_id').eq('empresa_id', empresaId).eq('id', body.historyId).maybeSingle();
    if (error) throw new MarketplaceError(503, 'price_product_unavailable', 'Não foi possível consultar o cadastro vinculado.');
    if (!data) throw new MarketplaceError(404, 'history_missing', 'Consulta não encontrada nesta empresa.');
    productId = data.local_product_id;
    if (!productId) {
      const linked = await db.rpc('marketplace_price_history_product_ensure', { p_empresa_id: empresaId, p_history_id: body.historyId });
      if (linked.error) throw new MarketplaceError(linked.error.code === 'P0001' ? 409 : 503, 'price_product_pending', linked.error.code === 'P0001' ? linked.error.message : 'Não foi possível vincular este histórico. Confira a atualização do banco.');
      productId = linked.data;
    }
  }
  if (!uuidIsValid(productId)) throw new MarketplaceError(409, 'price_product_pending', 'Este histórico ainda não foi vinculado a um produto. Confira a atualização do banco ou possíveis EANs duplicados em Produtos e estoque.');
  return getLocalProduct(db, empresaId, productId);
}

export function stockSummary(product: Awaited<ReturnType<typeof getLocalProduct>>, canManage: boolean) {
  return { productId: product.id, quantity: product.stock_quantity, confirmed: product.stock_confirmed_at != null, revision: product.revision, canManage, ...(product.listing_stock_review_at ? {importStockReview:true} : {}) };
}

export async function setConsultedProductStock(db: SupabaseClient, empresaId: string, actor: string, input: unknown) {
  const body = objectValue(input), product = await priceStockProduct(db, empresaId, body);
  const state = priceStockState({ confirmed: product.stock_confirmed_at != null, quantity: product.stock_quantity });
  // Uma edição para zero pode já ter sido gravada sem chegar ao navegador.
  // A revisão anterior deve alcançar a proteção idempotente do comando: mesma
  // chave recupera o recibo; chave diferente é recusada por revisão obsoleta.
  const replayOfZero = product.stock_confirmed_at != null && body.quantity === 0 && Number.isSafeInteger(body.revision) && Number(body.revision) >= 1 && Number(body.revision) < product.revision;
  if (!Number.isSafeInteger(body.quantity) || Number(body.quantity) < (replayOfZero ? 0 : state.minimum) || Number(body.quantity) > 99999 || !Number.isSafeInteger(body.revision) || Number(body.revision) < 1) throw new MarketplaceError(400, 'invalid_stock', 'Informe o saldo final de 0 a 99.999 unidades.');
  await productCommand(db, empresaId, actor, 'confirm_stock', { product_id: product.id, revision: body.revision, quantity: body.quantity, physical_confirmation: true, note: 'Saldo físico confirmado pelo AvantaPreços.' }, body.requestKey);
  const latest=await getLocalProduct(db,empresaId,product.id);
  if(body.quantity===0)await enqueueConfirmedZero(db,empresaId,latest);
  return stockSummary(latest,true);
}
