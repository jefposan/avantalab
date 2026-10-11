import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { objectValue, uuidIsValid, type ListingSnapshot } from './listing-model';
import { localProductData, physicalQuantity, productFromSnapshot, type LocalProduct } from './local-product-model';
import { safeHttpsImage, safeText } from './catalog-publication';

const columns = 'id,empresa_id,sku,name,ean,description,pictures,category_id,catalog_product_id,attributes,publication_form,price_cents,stock_quantity,stock_confirmed_at,revision,created_at,updated_at';
export async function productCommand(db: SupabaseClient, empresaId: string, actor: string, action: string, data: unknown, requestKey: unknown) {
  if (!uuidIsValid(requestKey)) throw new MarketplaceError(400, 'invalid_request', 'Atualize o formulário e tente novamente.');
  const result = await db.rpc('marketplace_product_command', { p_empresa_id: empresaId, p_actor_id: actor, p_action: action, p_data: data, p_request_key: requestKey });
  if (result.error) {
    if (result.error.code === 'P0001') throw new MarketplaceError(409, 'product_conflict', result.error.message);
    throw new MarketplaceError(503, 'products_database', 'Não foi possível salvar o cadastro. Confira se o banco está atualizado.');
  }
  return result.data as { product_id: string; created: boolean };
}

export async function getLocalProduct(db: SupabaseClient, empresaId: string, id: unknown): Promise<LocalProduct> {
  if (!uuidIsValid(id)) throw new MarketplaceError(400, 'invalid_product', 'Produto inválido.');
  const { data, error } = await db.from('marketplace_products').select(columns).eq('empresa_id', empresaId).eq('id', id).is('archived_at', null).maybeSingle();
  if (error) throw new MarketplaceError(503, 'products_database', 'Não foi possível consultar o cadastro.');
  if (!data) throw new MarketplaceError(404, 'product_missing', 'Produto não encontrado nesta empresa.');
  return { ...data, links: [] } as LocalProduct;
}

export async function listLocalProducts(db: SupabaseClient, empresaId: string, search: string, page: number) {
  let query = db.from('marketplace_products').select(columns, { count: 'exact' }).eq('empresa_id', empresaId).is('archived_at', null);
  const term = search.slice(0, 120).replace(/[^\p{L}\p{N}\s-]/gu, '').trim();
  if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,ean.ilike.%${term}%`);
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id').range((page - 1) * 25, page * 25 - 1);
  if (error) throw new MarketplaceError(503, 'products_database', 'Não foi possível carregar produtos e estoque.');
  const ids = (data || []).map(row => row.id);
  const links = ids.length ? await db.from('marketplace_product_links').select('id,product_id,connection_id,provider,provider_listing_id,title,reported_stock,status,source_snapshot,updated_at').eq('empresa_id', empresaId).in('product_id', ids) : { data: [], error: null };
  if (links.error) throw new MarketplaceError(503, 'products_database', 'Não foi possível consultar os anúncios vinculados.');
  return { products: (data || []).map(row => ({ ...row, links: (links.data || []).filter(link => link.product_id === row.id) })), total: count || 0, page };
}

export async function importLocalListing(db: SupabaseClient, empresaId: string, actor: string, connectionId: unknown, listingId: unknown) {
  const { data, error } = await db.from('marketplace_listings').select('connection_id,provider,provider_listing_id,snapshot,status').eq('empresa_id', empresaId).eq('connection_id', connectionId).eq('provider_listing_id', listingId).maybeSingle();
  if (error || !data) throw new MarketplaceError(404, 'listing_missing', 'Sincronize este anúncio antes de importar.');
  const snapshot = data.snapshot as ListingSnapshot;
  if (snapshot.variations?.length) throw new MarketplaceError(409, 'variants_pending', 'Este anúncio tem variações. O cadastro por variação ainda precisa ser estruturado; nenhuma quantidade foi confirmada.');
  const link = { connection_id: data.connection_id, provider: data.provider, provider_listing_id: data.provider_listing_id, reported_stock: physicalQuantity(snapshot.stock), status: data.status, title: snapshot.title,
    // Apenas dados do produto; sem dados pessoais, tokens ou retorno arbitrário do provedor.
    source_snapshot: productFromSnapshot(snapshot).publication_form };
  const audit = await db.from('marketplace_publications').select('response_summary').eq('empresa_id', empresaId).eq('connection_id', connectionId).eq('provider_listing_id', listingId).maybeSingle();
  if (audit.error) throw new MarketplaceError(503, 'products_database', 'Não foi possível conferir a origem deste anúncio.');
  const canonicalId = objectValue(audit.data?.response_summary).local_product_id;
  if (uuidIsValid(canonicalId)) return productCommand(db, empresaId, actor, 'link', { ...link, product_id: canonicalId }, crypto.randomUUID());
  return productCommand(db, empresaId, actor, 'import', { ...productFromSnapshot(snapshot), ...link }, crypto.randomUUID());
}

export async function manageLocalProduct(db: SupabaseClient, empresaId: string, actor: string, raw: unknown) {
  const input = objectValue(raw), action = input.action;
  if (action === 'import') {
    const offset = typeof input.offset === 'number' && Number.isSafeInteger(input.offset) && input.offset >= 0 ? input.offset : 0;
    const { data, error } = await db.from('marketplace_listings').select('connection_id,provider_listing_id,snapshot').eq('empresa_id', empresaId).order('id').range(offset, offset + 24);
    if (error) throw new MarketplaceError(503, 'products_database', 'Não foi possível consultar os anúncios salvos.');
    let created = 0, skippedVariants = 0;
    for (const listing of data || []) {
      if ((listing.snapshot as ListingSnapshot).variations?.length) { skippedVariants++; continue; }
      if ((await importLocalListing(db, empresaId, actor, listing.connection_id, listing.provider_listing_id)).created) created++;
    }
    return { created, skippedVariants, nextOffset: (data || []).length === 25 ? offset + 25 : null };
  }
  if (!['create', 'update', 'confirm_stock', 'merge'].includes(String(action))) throw new MarketplaceError(400, 'invalid_action', 'Operação inválida.');
  let data: Record<string, unknown>;
  if (action === 'create' || action === 'update') {
    const values = localProductData(input);
    if (!values.name || values.invalidEan) throw new MarketplaceError(400, 'invalid_product', values.invalidEan ? 'Confira o EAN informado ou deixe em branco.' : 'Informe o nome do produto.');
    if (input.price != null && values.price_cents == null) throw new MarketplaceError(400, 'invalid_product', 'Confira o preço informado ou deixe em branco.');
    if (safeText(input.categoryId, 30) && !values.category_id) throw new MarketplaceError(400, 'invalid_product', 'Confira o código da categoria do Mercado Livre.');
    if (!Array.isArray(input.pictures) || input.pictures.length > 12 || input.pictures.some(value => !safeHttpsImage(value))) throw new MarketplaceError(400, 'invalid_product', 'Informe até 12 fotos com endereços HTTPS válidos.');
    data = { name: values.name, sku: values.sku, ean: values.ean, description: values.description, pictures: values.pictures, price_cents: values.price_cents, category_id: values.category_id, catalog_product_id: values.catalog_product_id, attributes: values.attributes };
    if (action === 'create' && input.stockQuantity != null) {
      const quantity = physicalQuantity(input.stockQuantity);
      if (quantity == null || input.physicalConfirmation !== true) throw new MarketplaceError(400, 'confirm_stock', 'Confira e confirme a quantidade física.');
      data.stock_quantity = quantity; data.physical_confirmation = true;
    }
  } else data = {};
  if (action !== 'create') {
    if (!uuidIsValid(input.productId) || !Number.isSafeInteger(input.revision) || Number(input.revision) < 1) throw new MarketplaceError(400, 'invalid_product', 'Atualize o produto antes de salvar.');
    data.product_id = input.productId; data.revision = input.revision;
  }
  if (action === 'confirm_stock') {
    const quantity = physicalQuantity(input.quantity);
    if (quantity == null || input.physicalConfirmation !== true) throw new MarketplaceError(400, 'confirm_stock', 'Confira e confirme a quantidade física de 0 a 99.999.');
    data.quantity = quantity; data.physical_confirmation = true; data.note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '';
  }
  if (action === 'merge') {
    if (!uuidIsValid(input.targetId) || !Number.isSafeInteger(input.targetRevision) || input.sameProduct !== true) throw new MarketplaceError(400, 'confirm_product', 'Confirme que os anúncios são do mesmo produto físico.');
    data.target_id = input.targetId; data.target_revision = input.targetRevision;
  }
  return productCommand(db, empresaId, actor, String(action), data, input.requestKey);
}
