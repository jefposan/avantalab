import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { getLocalProduct } from './local-products';
import { validEan } from './catalog-publication';
import { objectValue, uuidIsValid } from './listing-model';
import { calculatePriceSuggestions, type PriceConsultationResult } from './mercadolivre-price-consultation';
import { readPriceSettings } from './price-settings';
import { sourceUrl } from './web-product-facts';
import { readPersistedReference } from './price-persistence';

/** Primeiro o cadastro canônico; consultar um EAN existente não pesquisa nem soma estoque. */
export async function consultLocalPrice(db: SupabaseClient, companyId: string, actor: string, input: { ean?: unknown; productId?: unknown }): Promise<PriceConsultationResult | null> {
  let id = input.productId;
  if (!id) {
    const ean = validEan(input.ean);
    if (!ean) throw new MarketplaceError(400, 'invalid_ean', 'Informe um EAN válido.');
    const key = ean.replace(/^0+/, '');
    const variants = [...new Set([key, ...[8,12,13,14].filter(n=>n>=key.length).map(n=>key.padStart(n,'0'))])];
    const { data, error } = await db.from('marketplace_products').select('id').eq('empresa_id', companyId).is('archived_at', null).in('ean', variants).limit(2);
    if (error) throw new MarketplaceError(503, 'products_database', 'Não foi possível conferir o cadastro do produto.');
    if ((data?.length || 0) > 1) throw new MarketplaceError(409, 'ambiguous_product', 'Há mais de um cadastro com este EAN. Unifique os produtos antes de continuar.');
    id = data?.[0]?.id;
    if (!id) return null;
  }
  const product = await getLocalProduct(db, companyId, id);
  const prices = product.price_cents ? calculatePriceSuggestions([product.price_cents], (await readPriceSettings(db, companyId)).percentages) : undefined;
  let historyId: string | undefined;
  if (prices) {
    const source = `LOCAL:${product.id}`;
    const { data: previous, error } = await db.from('marketplace_price_consultations').select('id,product_name,product_description,image_url,ean,minimum_price_cents,medium_price_cents,ideal_price_cents').eq('empresa_id', companyId).eq('local_product_id', product.id).eq('market_price_cents', product.price_cents).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível conferir a referência salva.');
    historyId = previous && previous.product_name === product.name && (previous.product_description || '') === product.description && previous.image_url === (product.pictures[0] || null) && previous.ean === product.ean && previous.minimum_price_cents === Math.round(prices.minimum*100) && previous.medium_price_cents === Math.round(prices.medium*100) && previous.ideal_price_cents === Math.round(prices.ideal*100) ? previous.id : undefined;
    if (!historyId) {
      const { data: saved, error: failure } = await db.from('marketplace_price_consultations').insert({
        empresa_id: companyId, created_by: actor, input_type: product.ean ? 'ean' : 'text', input_value: product.ean || product.name.slice(0,180), ean: product.ean,
        provider_product_id: source, product_name: product.name, product_description: product.description || null, image_url: product.pictures[0] || null,
        market_price_cents: product.price_cents, minimum_price_cents: Math.max(1,Math.round(prices.minimum*100)), medium_price_cents: Math.max(1,Math.round(prices.medium*100)), ideal_price_cents: Math.max(1,Math.round(prices.ideal*100)),
        sample_count: 1, sample_min_cents: product.price_cents, sample_max_cents: product.price_cents, sample_source: 'local_reference', source_offers: [],
      }).select('id').single();
      if (failure || !saved) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível registrar a referência deste cadastro.');
      historyId = saved.id;
    }
  }
  const researchSources=objectValue(product.publication_form).web_research_sources;
  return { status: 'found', ean: product.ean, query: null, localProductId: product.id, localProductRevision: product.revision, historyId,
    product: { id: `LOCAL:${product.id}`, name: product.name, description: product.description, image: product.pictures[0] || null, attributes: product.attributes, sources:(Array.isArray(researchSources)?researchSources:[]).slice(0,20).map(sourceUrl).filter((url):url is string=>Boolean(url)) }, prices,
    referenceStatus: prices ? 'saved' : 'missing',
    ...(prices ? { sample: { count: 1, minimum: prices.market, maximum: prices.market, source: 'local_reference' as const } } : {}), notice: prices ? 'Referência salva no cadastro e conferida no servidor. Nenhuma pesquisa externa ou entrada de estoque foi feita.' : 'Produto cadastrado sem preço. Informe uma referência manual ou use Atualizar preço para pesquisar novamente.' };
}

export async function editLocalReference(db: SupabaseClient, companyId: string, actor: string, raw: unknown) {
  const body = objectValue(raw), amount = typeof body.marketPrice === 'string' ? Number(body.marketPrice.trim().replace(/\./g,'').replace(',','.')) : body.marketPrice;
  if (!uuidIsValid(body.productId) || !Number.isSafeInteger(body.revision) || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount >= 100000000 || Math.abs(Math.round(amount*100)-amount*100)>0.00001) throw new MarketplaceError(400, 'invalid_reference', 'Informe uma referência válida com até duas casas decimais.');
  const product = await getLocalProduct(db, companyId, body.productId);
  if (product.revision !== body.revision) throw new MarketplaceError(409, 'product_conflict', 'O cadastro foi atualizado. Reabra o produto antes de alterar o preço.');
  if (product.price_cents === Math.round(amount*100)) return product.id;
  if (!uuidIsValid(body.requestKey)) throw new MarketplaceError(400, 'invalid_reference', 'Atualize o produto antes de salvar a referência.');
  const { error } = await db.rpc('marketplace_price_reference_edit', { p_empresa_id: companyId, p_actor_id: actor, p_product_id: product.id, p_revision: body.revision, p_price_cents: Math.round(amount*100), p_request_key: body.requestKey });
  if (error) throw new MarketplaceError(error.code === 'P0001' ? 409 : 503, 'reference_update_failed', error.code === 'P0001' ? 'O cadastro ou seu acesso mudou. Reabra o produto antes de alterar o preço.' : 'Não foi possível salvar a referência. Confira o valor antes de tentar novamente.');
  await readPersistedReference(db, companyId, product.id, Math.round(amount*100));
  return product.id;
}
