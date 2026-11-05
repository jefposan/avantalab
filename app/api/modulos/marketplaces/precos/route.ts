import { NextResponse } from 'next/server';
import {randomUUID} from 'node:crypto';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';
import { readPriceSettings } from '@/app/modules/marketplaces/services/price-settings';
import { registerConsultedProduct } from '@/app/modules/marketplaces/services/price-product-stock';
import { assertSavedPrices } from '@/app/modules/marketplaces/services/price-persistence';
import { confirmConsultationReference } from '@/app/modules/marketplaces/services/confirmed-price-consultation';
import { completeProductFacts } from '@/app/modules/marketplaces/services/web-product-facts';
import { consultLocalPrice } from '@/app/modules/marketplaces/services/local-price-consultation';
import {researchLocalProductPrice} from '@/app/modules/marketplaces/services/local-product-price-research';
import { resolveMercadoLivreConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { calculatePriceSuggestions, consultMercadoLivrePrice, type PriceConsultationResult } from '@/app/modules/marketplaces/services/mercadolivre-price-consultation';
import { consultOpenAIWebPrices, type WebPriceOffer } from '@/app/modules/marketplaces/services/openai-web-price-search';
import { openMarketplaceSecret, sealMarketplaceSecret, type SealedMarketplaceSecret } from '@/app/modules/marketplaces/services/secret-vault';

export const runtime = 'nodejs';
export const maxDuration = 60;

function cents(value: number) {
  return Math.round(value * 100);
}

type PendingPriceContinuation = {
  version: 1;
  expiresAt: number;
  empresaId: string;
  connectionId?: string;
  historyId?: string;
  ean?: string;
  query?: string;
  productId?: string;
  taskId: string;
};

function readPendingContinuation(value: unknown): PendingPriceContinuation | null {
  if (!value || typeof value !== 'object') return null;
  try {
    const parsed = JSON.parse(openMarketplaceSecret(value as SealedMarketplaceSecret)) as PendingPriceContinuation;
    if (parsed.version !== 1 || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()
      || typeof parsed.empresaId !== 'string' || (!parsed.connectionId && !parsed.historyId)
      || (parsed.connectionId !== undefined && typeof parsed.connectionId !== 'string')
      || (parsed.historyId !== undefined && typeof parsed.historyId !== 'string')
      || typeof parsed.taskId !== 'string'
      // A continuação protegida pode representar a etapa de produtos legada
      // (UUID puro), a etapa anterior `fase:UUID` ou o envelope atual, que
      // também preserva uma amostra de preços enquanto a ficha é processada.
      || !(/^(?:(?:products|product_info):)?[0-9a-f-]{20,}$/i.test(parsed.taskId)
        || /^v2\.[a-z0-9_-]{20,1200}$/i.test(parsed.taskId))) return null;
    return parsed;
  } catch {
    return null;
  }
}

type HistoryRecord = {
  local_product_id?: string | null;
  id: string;
  ean: string | null;
  input_type: 'ean' | 'text';
  input_value: string;
  provider_product_id: string;
  product_name: string;
  product_description: string | null;
  image_url: string | null;
  market_price_cents: number;
  minimum_price_cents: number;
  medium_price_cents: number;
  ideal_price_cents: number;
  sample_count: number;
  sample_min_cents: number;
  sample_max_cents: number;
  sample_source: 'manual_reference' | 'google_shopping' | 'openai_web_search';
  source_offers: WebPriceOffer[] | null;
  created_at: string;
  last_researched_at: string;
};

function historyToResult(row: HistoryRecord, notice?: string): PriceConsultationResult {
  return {
    status: 'found',
    ean: row.ean,
    query: row.input_type === 'text' ? row.input_value : null,
    product: { id: row.provider_product_id, name: row.product_name, description: row.product_description || '', image: row.image_url, attributes: [] },
    prices: { market: row.market_price_cents / 100, minimum: row.minimum_price_cents / 100, medium: row.medium_price_cents / 100, ideal: row.ideal_price_cents / 100 },
    sample: { count: row.sample_count, minimum: row.sample_min_cents / 100, maximum: row.sample_max_cents / 100, source: row.sample_source, ...(Array.isArray(row.source_offers) && row.source_offers.length ? { offers: row.source_offers } : {}) },
    historyId: row.id,
    localProductId: row.local_product_id || undefined,
    consultedAt: row.last_researched_at || row.created_at,
    ...(notice ? { notice } : {}),
  };
}

async function refreshHistoryPrice(db: Awaited<ReturnType<typeof authorizePriceConsultation>>['db'], empresaId: string, historyId: string, actor: string, signal?: AbortSignal, refreshPrice = false) {
  const { data: row, error } = await db.from('marketplace_price_consultations')
    .select('id,local_product_id,ean,input_type,input_value,provider_product_id,product_name,product_description,image_url,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents,sample_count,sample_min_cents,sample_max_cents,sample_source,source_offers,created_at,last_researched_at')
    .eq('id', historyId).eq('empresa_id', empresaId).maybeSingle();
  if (error) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível consultar o histórico agora.');
  if (!row) throw new MarketplaceError(404, 'history_not_found', 'Esta consulta não está disponível para esta empresa.');
  const stored = row as HistoryRecord;
  // Abrir uma consulta nunca autoriza pesquisa externa, mesmo com cache disponível.
  if (!refreshPrice) return { result: historyToResult(stored), historyId };
  const lookup = await consultOpenAIWebPrices({ ean: stored.ean, productName: stored.product_name }, { db, companyId: empresaId, actorId: actor, signal, includeFacts: !stored.local_product_id });
  const product=completeProductFacts({id:stored.local_product_id?`LOCAL:${stored.local_product_id}`:stored.provider_product_id,name:stored.product_name,description:stored.product_description||'',image:stored.image_url,attributes:[]},lookup.product);
  const ean=stored.ean||lookup.product?.ean||null;
  if(lookup.product)await registerConsultedProduct(db,empresaId,actor,product,ean);
  if (!lookup.sample && !lookup.product) return { result: historyToResult(stored, 'Não foram encontradas ofertas comparáveis agora. Mantivemos o valor registrado anteriormente.'), historyId };
  const prices = lookup.sample ? calculatePriceSuggestions(lookup.sample.pricesInCents, (await readPriceSettings(db, empresaId)).percentages) : null;
  const now = lookup.researchedAt || new Date().toISOString();
  const { data: updated, error: updateError } = await db.from('marketplace_price_consultations').update({
    ean,product_description:product.description||null,image_url:product.image,
    ...(prices && lookup.sample ? {
    market_price_cents: cents(prices.market),
    minimum_price_cents: cents(prices.minimum),
    medium_price_cents: cents(prices.medium),
    ideal_price_cents: cents(prices.ideal),
    sample_count: lookup.sample.count,
    sample_min_cents: cents(lookup.sample.minimum),
    sample_max_cents: cents(lookup.sample.maximum),
    sample_source: 'openai_web_search',
    source_offers: lookup.sample.offers,
    updated_at: now,
    last_researched_at: now,
    } : {}),
  }).eq('id', historyId).eq('empresa_id', empresaId).select('id,local_product_id,ean,input_type,input_value,provider_product_id,product_name,product_description,image_url,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents,sample_count,sample_min_cents,sample_max_cents,sample_source,source_offers,created_at,last_researched_at').single();
  if (updateError || !updated) throw new MarketplaceError(503, 'history_unavailable', 'A nova pesquisa foi concluída, mas não foi possível atualizar o histórico.');
  if (prices) assertSavedPrices(updated, prices);
  const result=historyToResult(updated as HistoryRecord,lookup.sample?`Referência atualizada com ${lookup.sample.count} oferta(s) com preço e disponibilidade conferidos na origem.`:'Dados encontrados completados. Sem oferta confirmada na origem; referência anterior mantida.');
  if(lookup.fromCache)result.notice=lookup.sample?'Preços e fontes da pesquisa recente reaproveitados, sem nova consulta paga.':'Pesquisa recente sem ofertas válidas. Referência anterior mantida; nenhuma nova consulta paga foi feita.';
  if(lookup.product&&result.product)result.product={...result.product,attributes:product.attributes,sources:lookup.product.sources};
  return {result,historyId};
}

function sealPendingContinuation(value: Omit<PendingPriceContinuation, 'version' | 'expiresAt'>) {
  return sealMarketplaceSecret(JSON.stringify({ ...value, version: 1, expiresAt: Date.now() + 60 * 60_000 } satisfies PendingPriceContinuation));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resumed = readPendingContinuation(body.continuation);
    if (body.continuation && !resumed) throw new MarketplaceError(400, 'invalid_price_continuation', 'A consulta pendente expirou. Faça uma nova consulta.');
    const input = resumed || body;
    const { db, empresaId, usuario } = await authorizePriceConsultation(request, input.empresaId);
    if (!resumed && !input.historyId && !input.productId && input.ean) {
      const local = await consultLocalPrice(db, empresaId, usuario.id, { ean: input.ean });
      if(local){
        if(local.prices)return NextResponse.json({result:local},{headers:{'Cache-Control':'no-store'}});
        // O gesto de consultar o EAN também pesquisa quando falta referência.
        // Reusa o cadastro e os limites/revisões da atualização explícita.
        const research=await researchLocalProductPrice(db,empresaId,usuario.id,{productId:local.localProductId,revision:local.localProductRevision,requestKey:randomUUID()},request.signal);
        const current=await consultLocalPrice(db,empresaId,usuario.id,{productId:local.localProductId});
        if(!current)throw new MarketplaceError(409,'price_product_changed','O cadastro mudou durante a pesquisa. Consulte novamente o produto.');
        return NextResponse.json({result:{...current,notice:research.message}},{headers:{'Cache-Control':'no-store'}});
      }
    }
    if (input.historyId) {
      const refreshed = await refreshHistoryPrice(db, empresaId, input.historyId, usuario.id, request.signal, body.refreshPrice === true);
      if (refreshed.result.pendingPriceTaskId) {
        const { pendingPriceTaskId, ...pendingResult } = refreshed.result;
        return NextResponse.json({
          result: pendingResult,
          continuation: sealPendingContinuation({ empresaId, historyId: refreshed.historyId, taskId: pendingPriceTaskId }),
        }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
      }
      return NextResponse.json({ result: refreshed.result }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const connection = await resolveMercadoLivreConnection(db, empresaId, input.connectionId);
    let result = await consultMercadoLivrePrice(db, connection, {
      ean: input.ean,
      query: input.query,
      productId: input.productId,
      manualPrice: body.manualPrice,
      pendingPriceTaskId: resumed?.taskId,
    }, (await readPriceSettings(db, empresaId)).percentages, { db, companyId: empresaId, actorId: usuario.id, signal: request.signal });

    // Produto identificado entra no cadastro mesmo enquanto a pesquisa de preços
    // está pendente/sem ofertas. Identificação ambígua não cria produto por suposição.
    if (result.status === 'found' && result.product) result.localProductId = await registerConsultedProduct(db, empresaId, usuario.id, result.product, result.ean, result.prices?.market);
    if (!result.pendingPriceTaskId) result = await confirmConsultationReference(db, empresaId, result, (await readPriceSettings(db, empresaId)).percentages);

    if (result.pendingPriceTaskId) {
      const { pendingPriceTaskId, ...pendingResult } = result;
      return NextResponse.json({
        result: pendingResult,
        continuation: sealPendingContinuation({
          empresaId,
          connectionId: connection.id,
          taskId: pendingPriceTaskId,
          ...(result.ean ? { ean: result.ean } : {}),
          ...(result.query ? { query: result.query } : {}),
          ...(result.product?.id ? { productId: result.product.id } : {}),
        }),
      }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
    }

    if (result.status === 'found' && result.product && result.prices && result.sample) {
      const { data: saved, error } = await db.from('marketplace_price_consultations').insert({
        empresa_id: empresaId,
        connection_id: connection.id,
        created_by: usuario.id,
        input_type: result.ean ? 'ean' : 'text',
        input_value: result.ean || result.query || result.product.name,
        ean: result.ean,
        provider_product_id: result.product.id,
        product_name: result.product.name,
        product_description: result.product.description || null,
        image_url: result.product.image,
        currency: 'BRL',
        market_price_cents: cents(result.prices.market),
        minimum_price_cents: cents(result.prices.minimum),
        medium_price_cents: cents(result.prices.medium),
        ideal_price_cents: cents(result.prices.ideal),
        sample_count: result.sample.count,
        sample_min_cents: cents(result.sample.minimum),
        sample_max_cents: cents(result.sample.maximum),
        sample_source: result.sample.source,
        source_offers: result.sample.offers || [],
        updated_at: new Date().toISOString(),
        last_researched_at: result.consultedAt || new Date().toISOString(),
      }).select('id,created_at,last_researched_at,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents').single();
      if (error || !saved) throw new MarketplaceError(503, 'history_unavailable', 'A consulta foi concluída, mas não foi possível salvar o histórico. Tente novamente.');
      assertSavedPrices(saved, result.prices);
      return NextResponse.json({ result: { ...result, historyId: saved.id, consultedAt: saved.last_researched_at || saved.created_at } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
