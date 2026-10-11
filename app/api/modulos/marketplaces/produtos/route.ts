import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { getLocalProduct, listLocalProducts, manageLocalProduct } from '@/app/modules/marketplaces/services/local-products';

export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    if (params.has('productId')) {
      const product = await getLocalProduct(db, empresaId, params.get('productId'));
      const { data, error } = await db.from('marketplace_stock_movements').select('id,kind,stock_before,stock_after,note,created_at').eq('empresa_id', empresaId).eq('product_id', product.id).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return NextResponse.json({ product, movements: data || [] }, { headers });
    }
    const page = Math.max(1, Math.min(10000, Math.trunc(Number(params.get('page')) || 1)));
    return NextResponse.json(await listLocalProducts(db, empresaId, params.get('q') || '', page), { headers });
  } catch (error) { return managementFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    return NextResponse.json(await manageLocalProduct(db, empresaId, usuario.id, body), { headers });
  } catch (error) { return managementFailure(error); }
}
