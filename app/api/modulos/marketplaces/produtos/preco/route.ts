import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { researchLocalProductPrice } from '@/app/modules/marketplaces/services/local-product-price-research';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    return NextResponse.json(await researchLocalProductPrice(db, empresaId, usuario.id, body, request.signal), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
