import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection, synchronizeListings } from '@/app/modules/marketplaces/services/mercadolivre-management';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId);
    const connection = await loadConnection(db, empresaId, body.connectionId);
    return NextResponse.json(await synchronizeListings(db, connection));
  } catch (error) { return managementFailure(error); }
}
