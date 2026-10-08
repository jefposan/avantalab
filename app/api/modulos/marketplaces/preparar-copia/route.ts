import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { prepareMercadoLivreListingCopy } from '@/app/modules/marketplaces/services/mercadolivre-publication';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const source = await loadConnection(db, empresaId, body.sourceConnectionId);
    const target = await loadConnection(db, empresaId, body.targetConnectionId);
    return NextResponse.json(await prepareMercadoLivreListingCopy(db, source, target, body.listingId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
