import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { applyInitialStock, previewInitialStock } from '@/app/modules/marketplaces/services/initial-stock';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    if (!['preview', 'apply'].includes(body.action)) throw new MarketplaceError(400, 'invalid_action', 'Operação inválida.');
    const result = body.action === 'preview' ? await previewInitialStock(db, empresaId, body.cursor)
      : await applyInitialStock(db, empresaId, usuario.id, body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
