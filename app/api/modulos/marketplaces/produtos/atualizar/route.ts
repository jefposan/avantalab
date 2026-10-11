import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { refreshLocalProductListing } from '@/app/modules/marketplaces/services/mercadolivre-publication';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    return NextResponse.json(await refreshLocalProductListing(db, empresaId, usuario.id, body.productId, body.connectionId, body.listingId, body.requestKey), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
