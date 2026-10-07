import { NextResponse } from 'next/server';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';
import { resolveMercadoLivreConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { calculatePriceSuggestions, consultMercadoLivrePrice, type PriceConsultationResult } from '@/app/modules/marketplaces/services/mercadolivre-price-consultation';
import { consultGoogleShoppingPrices } from '@/app/modules/marketplaces/services/dataforseo-google-shopping';
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
  sample_source: 'manual_reference' | 'google_shopping';
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
    sample: { count: row.sample_count, minimum: row.sample_min_cents / 100, maximum: row.sample_max_cents / 100, source: row.sample_source },
    historyId: row.id,
    consultedAt: row.last_researched_at || row.created_at,
    ...(notice ? { notice } : {}),
  };
}

async function refreshHistoryPrice(db: Awaited<ReturnType<typeof authorizePriceConsultation>>['db'], empresaId: string, historyId: string, pendingTaskId?: string) {
  const { data: row, error } = await db.from('marketplace_price_consultations')
    .select('id,ean,input_type,input_value,provider_product_id,product_name,product_description,image_url,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents,sample_count,sample_min_cents,sample_max_cents,sample_source,created_at,last_researched_at')
    .eq('id', historyId).eq('empresa_id', empresaId).maybeSingle();
  if (error) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível consultar o histórico agora.');
  if (!row) throw new MarketplaceError(404, 'history_not_found', 'Esta consulta não está disponível para esta empresa.');
  const stored = row as HistoryRecord;
  const lookup = await consultGoogleShoppingPrices({ ean: stored.ean, productName: stored.product_name }, pendingTaskId);
  if (lookup.status === 'pending') return { result: { ...historyToResult(stored, 'Estamos consultando novamente as ofertas públicas.'), pendingPriceTaskId: lookup.taskId }, historyId };
  if (!lookup.sample) return { result: historyToResult(stored, 'Não foram encontradas ofertas comparáveis agora. Mantivemos o valor registrado anteriormente.'), historyId };
  const prices = calculatePriceSuggestions(lookup.sample.pricesInCents);
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await db.from('marketplace_price_consultations').update({
    market_price_cents: cents(prices.market),
    minimum_price_cents: cents(prices.minimum),
    medium_price_cents: cents(prices.medium),
    ideal_price_cents: cents(prices.ideal),
    sample_count: lookup.sample.count,
    sample_min_cents: cents(lookup.sample.minimum),
    sample_max_cents: cents(lookup.sample.maximum),
    sample_source: 'google_shopping',
    updated_at: now,
    last_researched_at: now,
  }).eq('id', historyId).eq('empresa_id', empresaId).select('id,ean,input_type,input_value,provider_product_id,product_name,product_description,image_url,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents,sample_count,sample_min_cents,sample_max_cents,sample_source,created_at,last_researched_at').single();
  if (updateError || !updated) throw new MarketplaceError(503, 'history_unavailable', 'A nova pesquisa foi concluída, mas não foi possível atualizar o histórico.');
  return { result: historyToResult(updated as HistoryRecord, `Referência atualizada com ${lookup.sample.count} menor${lookup.sample.count === 1 ? '' : 'es'} oferta${lookup.sample.count === 1 ? '' : 's'} comparável${lookup.sample.count === 1 ? '' : 'is'} no Google Shopping.`), historyId };
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
    if (input.historyId) {
      const refreshed = await refreshHistoryPrice(db, empresaId, input.historyId, resumed?.taskId);
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
    const result = await consultMercadoLivrePrice(db, connection, {
      ean: input.ean,
      query: input.query,
      productId: input.productId,
      manualPrice: body.manualPrice,
      pendingPriceTaskId: resumed?.taskId,
    });

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
        updated_at: new Date().toISOString(),
        last_researched_at: new Date().toISOString(),
      }).select('id,created_at,last_researched_at').single();
      if (error || !saved) throw new MarketplaceError(503, 'history_unavailable', 'A consulta foi concluída, mas não foi possível salvar o histórico. Tente novamente.');
      return NextResponse.json({ result: { ...result, historyId: saved.id, consultedAt: saved.last_researched_at || saved.created_at } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
