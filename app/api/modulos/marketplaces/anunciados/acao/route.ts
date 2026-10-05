import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection, manageListing } from '@/app/modules/marketplaces/services/mercadolivre-management';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const connection = await loadConnection(db, empresaId, body.connectionId);
    return NextResponse.json(await manageListing(db, connection, usuario.id, { id: body.id, action: body.action, requestKey: body.requestKey, confirmation: body.confirmation }));
  } catch (error) { return managementFailure(error); }
}
