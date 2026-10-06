import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { readMercadoLivreListingTypeFee } from '@/app/modules/marketplaces/services/mercadolivre-editor';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'), 'manage');
    const connection = await loadConnection(db, empresaId, params.get('connectionId'));
    const price = Number(params.get('price'));
    return NextResponse.json(await readMercadoLivreListingTypeFee(db, connection, params.get('id'), params.get('listingType'), price), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return managementFailure(error);
  }
}
