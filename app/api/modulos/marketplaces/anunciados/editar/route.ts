import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import {integrationAdapter} from '@/app/modules/marketplaces/services/integration-adapters';
export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'), 'manage');
    const adapter=await integrationAdapter(db,empresaId,params.get('connectionId'));
    return NextResponse.json(await adapter.editor(params.get('id')), { headers });
  } catch (error) { return managementFailure(error); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const adapter=await integrationAdapter(db,empresaId,body.connectionId);
    return NextResponse.json(await adapter.saveEditor(usuario.id,body), { headers });
  } catch (error) { return managementFailure(error); }
}
