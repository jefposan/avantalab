import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isMagaluPublicationForm, magaluCategoryFields, magaluPublicationBodies, magaluPublicationErrors, MAGALU_CHANNEL_ID } from '../magalu-publication-model';
import { MarketplaceError } from './management-access';
import { safeText } from './catalog-publication';
import { getLocalProduct } from './local-products';
import { loadMagaluCatalogConnection, magaluCatalogRequest, type MagaluConnection } from './magalu-request';
import { objectValue, uuidIsValid } from './listing-model';

type Stage = 'sku_submitting' | 'sku_accepted' | 'sku_confirmed' | 'price_submitting' | 'price_accepted' | 'price_confirmed' | 'stock_submitting' | 'stock_accepted';
type Summary = { stage: Stage; sku: string; title: string; local_product_id: string; sku_body: unknown; price_body: unknown; stock_body: unknown;
  sku_trace?: string; price_trace?: string; stock_trace?: string; error_code?: string };
type PublicationRow = { id: string; empresa_id: string; connection_id: string; idempotency_key: string; provider_listing_id: string; status: string; response_summary: Summary; created_by: string | null };

const skuPath = (sku: string) => `/seller/v1/portfolios/skus/${encodeURIComponent(sku)}`;
const pricePath = (sku: string) => `/seller/v1/portfolios/prices/${encodeURIComponent(sku)}`;
const stockPath = (sku: string) => `/seller/v1/portfolios/stocks/${encodeURIComponent(sku)}`;

export async function searchMagaluCategories(db: SupabaseClient, connection: MagaluConnection, name: unknown) {
  const query = safeText(name, 70);
  if (query.length < 3) throw new MarketplaceError(400, 'category_query', 'Digite pelo menos 3 caracteres para pesquisar a categoria.');
  const result = await magaluCatalogRequest(db, connection, 'GET', `/seller/v1/portfolios/category?${new URLSearchParams({ name: query })}`);
  if (!Array.isArray(result.data)) throw new MarketplaceError(503, 'magalu_categories', 'O Magalu não retornou categorias reconhecíveis.');
  return result.data.slice(0, 30).flatMap(value => {
    const row = objectValue(value), id = safeText(row.id, 50), path = safeText(row.path, 250), label = safeText(row.name, 120);
    return uuidIsValid(id) && label ? [{ id, name: label, path: path || label }] : [];
  });
}

export async function magaluCategoryTemplate(db: SupabaseClient, connection: MagaluConnection, categoryId: unknown) {
  if (!uuidIsValid(categoryId)) throw new MarketplaceError(400, 'category_invalid', 'Selecione uma categoria Magalu válida.');
  const id = String(categoryId);
  const [category, children, attributes, datasheet] = await Promise.all([
    magaluCatalogRequest(db, connection, 'GET', `/seller/v1/portfolios/category?${new URLSearchParams({ id })}`),
    magaluCatalogRequest(db, connection, 'GET', `/seller/v1/portfolios/category/hierarchy?${new URLSearchParams({ parent_id: id, _limit: '1' })}`),
    magaluCatalogRequest(db, connection, 'GET', `/seller/v1/portfolios/category/${id}/attributes?_limit=100`),
    magaluCatalogRequest(db, connection, 'GET', `/seller/v1/portfolios/category/${id}/datasheet?_limit=100`),
  ]);
  const categoryRow = objectValue(category.data), childrenRows = objectValue(children.data).results;
  if (categoryRow.id !== id || !Array.isArray(childrenRows)) throw new MarketplaceError(503, 'category_unconfirmed', 'Não foi possível confirmar a categoria selecionada.');
  if (childrenRows.length) throw new MarketplaceError(400, 'category_not_leaf', 'Escolha a categoria mais específica, no fim da hierarquia do Magalu.');
  const hasNext = (value: unknown) => {
    const root = objectValue(value);
    return Boolean(objectValue(root.links).next || objectValue(objectValue(root.meta).links).next);
  };
  if (hasNext(attributes.data) || hasNext(datasheet.data)) {
    throw new MarketplaceError(503, 'category_fields_incomplete', 'A categoria possui mais campos do que o AvantaLab consegue confirmar nesta consulta. Escolha outra categoria ou avise o suporte.');
  }
  try { return { id, name: safeText(categoryRow.path, 250) || safeText(categoryRow.name, 120),
    attributes: magaluCategoryFields(attributes.data, true), datasheet: magaluCategoryFields(datasheet.data, false) }; }
  catch { throw new MarketplaceError(503, 'category_fields', 'O Magalu não retornou todos os campos da categoria.'); }
}

function publicProgress(row: PublicationRow) {
  return { requestKey: row.idempotency_key, sku: row.provider_listing_id, title: row.response_summary.title,
    status: row.status, stage: row.response_summary.stage, errorCode: row.response_summary.error_code || null };
}

async function updateStage(db: SupabaseClient, row: PublicationRow, stage: Stage, extra: Partial<Summary> = {}) {
  const next = { ...row.response_summary, ...extra, stage };
  const { data, error } = await db.from('marketplace_publications').update({ response_summary: next, updated_at: new Date().toISOString() })
    .eq('id', row.id).eq('empresa_id', row.empresa_id).eq('connection_id', row.connection_id).eq('status', 'publishing')
    .filter('response_summary', 'eq', JSON.stringify(row.response_summary)).select('id').maybeSingle();
  if (error) throw new MarketplaceError(503, 'publication_audit', 'Não foi possível salvar a etapa do envio. Confira o SKU antes de tentar novamente.');
  if (!data) throw new MarketplaceError(409, 'publication_busy', 'Outra verificação está em andamento. Atualize a situação em instantes.');
  return { ...row, response_summary: next };
}

async function markFailure(db: SupabaseClient, row: PublicationRow, error: unknown) {
  const code = error instanceof MarketplaceError ? error.code : 'magalu_integration';
  await db.from('marketplace_publications').update({ status: 'failed', response_summary: { ...row.response_summary, error_code: code }, updated_at: new Date().toISOString() })
    .eq('id', row.id).eq('empresa_id', row.empresa_id).eq('connection_id', row.connection_id).eq('status', 'publishing');
}

async function verifySku(db: SupabaseClient, connection: MagaluConnection, row: PublicationRow) {
  const result = await magaluCatalogRequest(db, connection, 'GET', skuPath(row.provider_listing_id));
  if (result.status === 404) return null;
  const data = objectValue(result.data);
  if (data.sku !== row.provider_listing_id || !Array.isArray(data.channels) || !data.channels.some(value => objectValue(value).id === MAGALU_CHANNEL_ID)) {
    throw new MarketplaceError(409, 'sku_mismatch', 'O SKU retornado pelo Magalu não corresponde à loja ou ao canal esperado. Envio interrompido.');
  }
  return data;
}

async function verifyPrice(db: SupabaseClient, connection: MagaluConnection, row: PublicationRow) {
  const result = await magaluCatalogRequest(db, connection, 'GET', pricePath(row.provider_listing_id));
  if (result.status === 404) return false;
  const data = objectValue(result.data), expected = objectValue(row.response_summary.price_body);
  const prices = Array.isArray(data.results) ? data.results.map(objectValue) : [data];
  if (!prices.some(value => objectValue(value.channel).id === MAGALU_CHANNEL_ID && value.price === expected.price && value.currency === 'BRL')) {
    throw new MarketplaceError(409, 'price_mismatch', 'O preço do SKU no Magalu não corresponde ao envio. Confira no portal antes de continuar.');
  }
  return true;
}

async function verifyStock(db: SupabaseClient, connection: MagaluConnection, row: PublicationRow) {
  const result = await magaluCatalogRequest(db, connection, 'GET', stockPath(row.provider_listing_id));
  if (result.status === 404) return false;
  const data = objectValue(result.data), expected = objectValue(row.response_summary.stock_body);
  if (!Array.isArray(data.results)) throw new MarketplaceError(503, 'stock_response', 'O Magalu não confirmou o estoque do SKU.');
  if (!data.results.map(objectValue).some(value => objectValue(value.channel).id === MAGALU_CHANNEL_ID && value.type === 'AVAILABLE' && value.quantity === expected.quantity)) {
    throw new MarketplaceError(409, 'stock_mismatch', 'O estoque do SKU no Magalu não corresponde ao envio. Confira antes de continuar.');
  }
  return true;
}

/** Uma chamada avança no máximo uma escrita. Respostas 202 permanecem em análise até GET confirmar. */
export async function advanceMagaluPublication(db: SupabaseClient, connection: MagaluConnection, row: PublicationRow) {
  if (row.status !== 'publishing') return publicProgress(row);
  let current = row;
  const stage = current.response_summary.stage;
  try {
    if (stage === 'sku_submitting' || stage === 'sku_accepted') {
      const sku = await verifySku(db, connection, current);
      if (!sku) return publicProgress(current);
      current = await updateStage(db, current, 'sku_confirmed');
    }
    if (current.response_summary.stage === 'sku_confirmed') {
      current = await updateStage(db, current, 'price_submitting');
      const response = await magaluCatalogRequest(db, connection, 'POST', pricePath(current.provider_listing_id), current.response_summary.price_body);
      current = await updateStage(db, current, 'price_accepted', { price_trace: safeText(objectValue(response.data).trace_id, 100) });
      return publicProgress(current);
    }
    if (stage === 'price_submitting' || stage === 'price_accepted') {
      if (!(await verifyPrice(db, connection, current))) return publicProgress(current);
      current = await updateStage(db, current, 'price_confirmed');
    }
    if (current.response_summary.stage === 'price_confirmed') {
      current = await updateStage(db, current, 'stock_submitting');
      const response = await magaluCatalogRequest(db, connection, 'POST', stockPath(current.provider_listing_id), current.response_summary.stock_body);
      current = await updateStage(db, current, 'stock_accepted', { stock_trace: safeText(objectValue(response.data).trace_id, 100) });
      return publicProgress(current);
    }
    if (stage === 'stock_submitting' || stage === 'stock_accepted') {
      if (!(await verifyStock(db, connection, current))) return publicProgress(current);
      const sku = await verifySku(db, connection, current);
      if (!sku || sku.status !== 'PUBLISHED') return publicProgress(current);
      const { error } = await db.from('marketplace_publications').update({ status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', current.id).eq('empresa_id', current.empresa_id).eq('connection_id', current.connection_id).eq('status', 'publishing');
      if (error) throw new MarketplaceError(503, 'publication_audit', 'O anúncio está no Magalu, mas não foi possível confirmar o registro local.');
      return { ...publicProgress(current), status: 'published' };
    }
    return publicProgress(current);
  } catch (error) {
    if (!(error instanceof MarketplaceError && ['magalu_catalog_validation', 'sku_mismatch', 'price_mismatch', 'stock_mismatch'].includes(error.code))) throw error;
    await markFailure(db, current, error);
    throw error;
  }
}

export async function createMagaluPublication(db: SupabaseClient, companyId: string, connectionId: unknown, actor: string, requestKey: unknown, raw: unknown) {
  if (!uuidIsValid(requestKey)) throw new MarketplaceError(400, 'invalid_request', 'Atualize o formulário e tente novamente.');
  const connection = await loadMagaluCatalogConnection(db, companyId, connectionId);
  if (!isMagaluPublicationForm(raw)) throw new MarketplaceError(400, 'invalid_form', 'Revise os dados da publicação.');
  const form = raw;
  const product = await getLocalProduct(db, companyId, form.productId);
  if (product.revision !== form.revision) throw new MarketplaceError(409, 'product_changed', 'O cadastro local mudou. Reabra a ficha e confira os dados.');
  const category = await magaluCategoryTemplate(db, connection, form.categoryId);
  const errors = magaluPublicationErrors(form, product, category.attributes, category.datasheet);
  if (Object.keys(errors).length) throw new MarketplaceError(400, 'invalid_fields', 'Revise os campos indicados.', errors);
  const bodies = magaluPublicationBodies(form, category.attributes, category.datasheet);
  const previous = await magaluCatalogRequest(db, connection, 'GET', skuPath(form.sku));
  if (previous.status !== 404) throw new MarketplaceError(409, 'sku_exists', 'Este SKU já existe no Magalu. Confira-o antes de criar outro anúncio.');
  const summary: Summary = { stage: 'sku_submitting', sku: form.sku, title: form.title.trim(), local_product_id: product.id,
    sku_body: bodies.sku, price_body: bodies.price, stock_body: bodies.stock };
  const { data, error } = await db.from('marketplace_publications').insert({ empresa_id: companyId, connection_id: connection.id, provider: 'magalu',
    ean: form.ean, price_cents: form.priceCents, status: 'publishing', idempotency_key: requestKey,
    provider_listing_id: form.sku, created_by: actor, response_summary: summary }).select('*').maybeSingle();
  if (error || !data) throw new MarketplaceError(error?.code === '23505' ? 409 : 503, error?.code === '23505' ? 'duplicate_publish' : 'publication_audit',
    error?.code === '23505' ? 'Já existe um envio em andamento nesta loja ou este SKU foi publicado. Confira o andamento antes de repetir.' : 'Não foi possível registrar o envio. Nada foi enviado ao Magalu.');
  const row = data as PublicationRow;
  try {
    const response = await magaluCatalogRequest(db, connection, 'POST', '/seller/v1/portfolios/skus', bodies.sku);
    const accepted = await updateStage(db, row, 'sku_accepted', { sku_trace: safeText(objectValue(response.data).trace_id, 100) });
    return publicProgress(accepted);
  } catch (failure) {
    if (failure instanceof MarketplaceError && ['magalu_catalog_validation', 'magalu_catalog_denied', 'magalu_catalog_locked'].includes(failure.code)) await markFailure(db, row, failure);
    throw failure;
  }
}

export async function latestMagaluPublication(db: SupabaseClient, companyId: string, connectionId: unknown) {
  const connection = await loadMagaluCatalogConnection(db, companyId, connectionId);
  const { data, error } = await db.from('marketplace_publications').select('*').eq('empresa_id', companyId).eq('connection_id', connection.id)
    .eq('provider', 'magalu').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new MarketplaceError(503, 'publication_audit', 'Não foi possível consultar a publicação Magalu.');
  return data ? publicProgress(data as PublicationRow) : null;
}

export async function continueMagaluPublication(db: SupabaseClient, companyId: string, connectionId: unknown, requestKey: unknown) {
  if (!uuidIsValid(requestKey)) throw new MarketplaceError(400, 'invalid_request', 'Publicação inválida.');
  const connection = await loadMagaluCatalogConnection(db, companyId, connectionId);
  const { data, error } = await db.from('marketplace_publications').select('*').eq('empresa_id', companyId).eq('connection_id', connection.id)
    .eq('provider', 'magalu').eq('idempotency_key', requestKey).maybeSingle();
  if (error || !data) throw new MarketplaceError(404, 'publication_missing', 'Publicação não encontrada nesta loja.');
  return advanceMagaluPublication(db, connection, data as PublicationRow);
}
