import { NextResponse } from 'next/server';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const empresaId = new URL(request.url).searchParams.get('empresaId');
    const { db } = await authorizePriceConsultation(request, empresaId);
    const { data, error } = await db.from('marketplace_connections')
      .select('id,status,seller_name,seller_reference')
      .eq('empresa_id', empresaId).eq('provider', 'mercado_livre').eq('status', 'connected').order('connected_at', { ascending: false });
    if (error) throw new MarketplaceError(503, 'database', 'Não foi possível validar a conexão do Mercado Livre.');
    return NextResponse.json({ accounts: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
