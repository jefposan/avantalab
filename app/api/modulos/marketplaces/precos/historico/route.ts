import { NextResponse } from 'next/server';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('empresaId');
    const { db } = await authorizePriceConsultation(request, empresaId);
    const { data, error } = await db.from('marketplace_price_consultations')
      .select('id,ean,input_type,input_value,provider_product_id,product_name,product_description,image_url,currency,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents,sample_count,sample_min_cents,sample_max_cents,sample_source,created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw new MarketplaceError(503, 'history_unavailable', 'Não foi possível carregar as últimas consultas.');
    return NextResponse.json({ history: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
