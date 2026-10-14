import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadMagaluCatalogConnection } from '@/app/modules/marketplaces/services/magalu-request';
import { magaluCategoryTemplate, searchMagaluCategories } from '@/app/modules/marketplaces/services/magalu-publication';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'), 'manage');
    const connection = await loadMagaluCatalogConnection(db, empresaId, params.get('connectionId'));
    const result = params.has('categoryId')
      ? { category: await magaluCategoryTemplate(db, connection, params.get('categoryId')) }
      : { categories: await searchMagaluCategories(db, connection, params.get('name')) };
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
