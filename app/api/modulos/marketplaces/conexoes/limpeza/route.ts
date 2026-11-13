import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { enableAccountImport, executeAccountCleanup, reviewAccountCleanup } from '@/app/modules/marketplaces/services/account-cleanup';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'connections');
    let result;
    if (body.action === 'review') result = await reviewAccountCleanup(db, empresaId, usuario.id, body.connectionId, body.options);
    else if (body.action === 'execute') result = await executeAccountCleanup(db, empresaId, usuario.id, body);
    else if (body.action === 'enable_import') result = await enableAccountImport(db, empresaId, usuario.id, body);
    else throw new MarketplaceError(400, 'invalid_cleanup_action', 'Selecione a ação da conta.');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
