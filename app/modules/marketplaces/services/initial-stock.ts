import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { getLocalProduct, productCommand } from './local-products';
import { listingIdIsValid, objectValue, uuidIsValid } from './listing-model';
import { physicalQuantity } from './local-product-model';
import { loadConnection, mlRequest } from './mercadolivre-management';
import { initialListingQuantity, type InitialStockRow, type InitialStockSource } from './initial-stock-model';

function configured() {
  if (!process.env.MARKETPLACE_SECRETS_KEY) throw new MarketplaceError(503, 'local_integration_not_configured', 'A consulta ao Mercado Livre não está configurada neste ambiente. As contas continuam conectadas; não é necessário reconectá-las.');
}

async function readSource(db: SupabaseClient, empresaId: string, connectionId: unknown, listingId: unknown): Promise<InitialStockSource | null> {
  if (!uuidIsValid(connectionId) || !listingIdIsValid(listingId)) throw new MarketplaceError(400, 'invalid_item', 'Selecione um anúncio vinculado válido.');
  const connection = await loadConnection(db, empresaId, connectionId);
  const item = objectValue(await mlRequest(db, connection, `/items/${listingId}`));
  if (item.id !== listingId || String(item.seller_id) !== connection.seller_reference) throw new MarketplaceError(404, 'listing_not_found', 'O anúncio não pertence à conta selecionada.');
  if (typeof item.status !== 'string' || physicalQuantity(item.available_quantity) == null || !Array.isArray(item.variations)
    || (item.sub_status != null && !Array.isArray(item.sub_status))) throw new MarketplaceError(503, 'invalid_response', 'A quantidade ou a situação do anúncio não foi confirmada. Consulte novamente.');
  const quantity = initialListingQuantity(item);
  if (quantity == null) return null;
  return { connectionId, listingId, accountName: connection.seller_name || connection.seller_reference, quantity, checkedAt: new Date().toISOString() };
}

/** Revisão somente de leitura, em lotes pequenos e com cursor estável. */
export async function previewInitialStock(db: SupabaseClient, empresaId: string, cursor: unknown) {
  configured();
  if (cursor != null && !uuidIsValid(cursor)) throw new MarketplaceError(400, 'invalid_cursor', 'Reinicie a consulta de estoque.');
  let query = db.from('marketplace_products').select('id,name,revision').eq('empresa_id', empresaId).is('archived_at', null).is('stock_quantity', null).order('id').limit(4);
  if (cursor != null) query = query.gt('id', cursor);
  const result = await query;
  if (result.error) throw new MarketplaceError(503, 'products_database', 'Não foi possível consultar os cadastros locais.');
  const products = (result.data || []).slice(0, 3);
  const rows: InitialStockRow[] = await Promise.all(products.map(async product => {
    const row: InitialStockRow = { productId: product.id, name: product.name, revision: product.revision, sources: [] };
    const links = await db.from('marketplace_product_links').select('connection_id,provider_listing_id').eq('empresa_id', empresaId).eq('product_id', product.id).eq('provider', 'mercado_livre').order('id').limit(11);
    if (links.error) { row.warning = 'Não foi possível conferir os anúncios vinculados.'; return row; }
    if ((links.data || []).length > 10) { row.warning = 'Este cadastro tem muitos anúncios vinculados. Confira os vínculos antes da carga inicial.'; return row; }
    // Não usa status/quantidade do cache como confirmação de estoque atual.
    const sources = await Promise.all((links.data || []).map(async link => {
      try { return await readSource(db, empresaId, link.connection_id, link.provider_listing_id); }
      catch { row.warning = 'Parte dos anúncios não pôde ser consultada. Confira a conta e consulte novamente.'; return null; }
    }));
    row.sources = sources.filter((source): source is InitialStockSource => source != null);
    return row;
  }));
  return { rows, nextCursor: (result.data || []).length > 3 ? products[products.length - 1].id : null };
}

/** Uma única origem revisada, relida antes da gravação. Nunca altera o ML. */
export async function applyInitialStock(db: SupabaseClient, empresaId: string, actor: string, raw: unknown) {
  const input = objectValue(raw);
  if (!uuidIsValid(input.requestKey) || !Number.isSafeInteger(input.revision) || Number(input.revision) < 1
    || physicalQuantity(input.quantity) == null || Number(input.quantity) === 0
    || input.confirmation !== true) throw new MarketplaceError(400, 'invalid_stock_review', 'Revise e confirme a carga inicial antes de salvar.');
  const product = await getLocalProduct(db, empresaId, input.productId);
  if (product.stock_quantity != null) return { status: 'preserved' as const, productId: product.id };
  if (product.revision !== input.revision) throw new MarketplaceError(409, 'product_changed', 'O cadastro mudou. Consulte o estoque novamente antes de salvar.');
  if (!uuidIsValid(input.connectionId) || !listingIdIsValid(input.listingId)) throw new MarketplaceError(400, 'invalid_item', 'Selecione um anúncio vinculado válido.');
  const link = await db.from('marketplace_product_links').select('id').eq('empresa_id', empresaId).eq('product_id', product.id)
    .eq('connection_id', input.connectionId).eq('provider', 'mercado_livre').eq('provider_listing_id', input.listingId).maybeSingle();
  if (link.error || !link.data) throw new MarketplaceError(404, 'listing_missing', 'O anúncio não está vinculado a este produto da empresa.');
  configured();
  const source = await readSource(db, empresaId, input.connectionId, input.listingId);
  if (!source) throw new MarketplaceError(409, 'listing_not_eligible', 'O anúncio está inativo, zerado ou possui variações. O estoque local não foi alterado.');
  if (source.quantity !== input.quantity) throw new MarketplaceError(409, 'stock_changed', 'A quantidade do anúncio mudou. Consulte novamente para revisar o saldo atual.');
  await productCommand(db, empresaId, actor, 'confirm_stock', {
    product_id: product.id, revision: product.revision, quantity: source.quantity, physical_confirmation: true,
    note: `Carga inicial do anúncio ${source.listingId} · ${source.accountName}, consultado em ${source.checkedAt}. Quantidade de uma única conta; sem soma.`,
  }, input.requestKey);
  return { status: 'loaded' as const, productId: product.id, quantity: source.quantity };
}
