import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection, mlRequest } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { diagnoseMercadoLivrePrices, priceDiagnosticInput } from '@/app/modules/marketplaces/services/mercadolivre-price-diagnostic';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId, 'connections');
    const input = priceDiagnosticInput(body);
    const connection = await loadConnection(db, empresaId, body.connectionId);
    const result = await diagnoseMercadoLivrePrices(input, path => mlRequest(db, connection, path, 'GET'));
    return NextResponse.json({ account: { id: connection.id, name: connection.seller_name }, result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
