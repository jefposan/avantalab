import { NextResponse } from 'next/server';
import { authorizeMarketplace, MarketplaceError, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { listProductCleanup, reviewProductCleanup, executeProductCleanup } from '@/app/modules/marketplaces/services/product-cleanup';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'connections');
    const result = body.action === 'list' ? await listProductCleanup(db, empresaId, usuario.id)
      : body.action === 'review' ? await reviewProductCleanup(db, empresaId, usuario.id, body.productIds)
      : body.action === 'execute' ? await executeProductCleanup(db, empresaId, usuario.id, body)
      : (() => { throw new MarketplaceError(400, 'invalid_product_cleanup_action', 'Selecione uma ação válida.'); })();
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
