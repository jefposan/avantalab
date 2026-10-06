import { NextResponse } from 'next/server';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';
import { resolveMercadoLivreConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { consultMercadoLivrePrice } from '@/app/modules/marketplaces/services/mercadolivre-price-consultation';
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
  connectionId: string;
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
      || typeof parsed.empresaId !== 'string' || typeof parsed.connectionId !== 'string'
      || typeof parsed.taskId !== 'string' || !/^[0-9a-f-]{20,}$/i.test(parsed.taskId)) return null;
    return parsed;
  } catch {
    return null;
  }
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
      }).select('id,created_at').single();
      if (error || !saved) throw new MarketplaceError(503, 'history_unavailable', 'A consulta foi concluída, mas não foi possível salvar o histórico. Tente novamente.');
      return NextResponse.json({ result: { ...result, historyId: saved.id, consultedAt: saved.created_at } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
