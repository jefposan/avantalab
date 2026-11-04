import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { getLocalProductPresentation, listLocalProducts, manageLocalProduct } from '@/app/modules/marketplaces/services/local-products';

export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    if (params.has('productId')) {
      const product = await getLocalProductPresentation(db, empresaId, params.get('productId'));
      const { data, error } = await db.from('marketplace_stock_movements').select('id,kind,stock_before,stock_after,note,created_at').eq('empresa_id', empresaId).eq('product_id', product.id).order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      const history=await db.from('marketplace_warehouse_movements').select('id,kind,warehouse_id,warehouse_name,destination_id,destination_name,quantity,stock_before,stock_after,destination_before,destination_after,note,created_at').eq('empresa_id',empresaId).eq('product_id',product.id).order('created_at',{ascending:false}).limit(30);
      return NextResponse.json({ product, movements: data || [],warehouseMovements:history.error?null:history.data || [] }, { headers });
    }
    const page = Math.max(1, Math.min(10000, Math.trunc(Number(params.get('page')) || 1)));
    return NextResponse.json(await listLocalProducts(db, empresaId, params.get('q') || '', page, request.signal, params.get('warehouseId'), params.get('publication'), params.get('countOnly') === '1', params.get('skipCount') === '1', params.get('connectionId')), { headers });
  } catch (error) { return managementFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    return NextResponse.json(await manageLocalProduct(db, empresaId, usuario.id, body), { headers });
  } catch (error) { return managementFailure(error); }
}
