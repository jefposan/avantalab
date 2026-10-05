import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { resolveMercadoLivreConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { consultMercadoLivrePrice } from '@/app/modules/marketplaces/services/mercadolivre-price-consultation';

export const runtime = 'nodejs';
export const maxDuration = 60;

function cents(value: number) {
  return Math.round(value * 100);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'view');
    const connection = await resolveMercadoLivreConnection(db, empresaId, body.connectionId);
    const result = await consultMercadoLivrePrice(db, connection, {
      ean: body.ean,
      query: body.query,
      productId: body.productId,
    });

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
