import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { listingEditAdapter } from '@/app/modules/marketplaces/services/listing-edit-adapters';
export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'), 'manage');
    const connection = await loadConnection(db, empresaId, params.get('connectionId'));
    return NextResponse.json(await listingEditAdapter('mercado_livre').read(db, connection, params.get('id')), { headers });
  } catch (error) { return managementFailure(error); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const connection = await loadConnection(db, empresaId, body.connectionId);
    return NextResponse.json(await listingEditAdapter('mercado_livre').save(db, connection, usuario.id, { id: body.id, revision: body.revision, requestKey: body.requestKey, changes: body.changes }), { headers });
  } catch (error) { return managementFailure(error); }
}
