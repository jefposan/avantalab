import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { prepareMercadoLivreCatalog } from '@/app/modules/marketplaces/services/mercadolivre-publication';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const connection = await loadConnection(db, empresaId, body.connectionId);
    const result = await prepareMercadoLivreCatalog(db, connection, { ean: body.ean, query: body.query, productId: body.productId, categoryId: body.categoryId });
    return NextResponse.json({ result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
