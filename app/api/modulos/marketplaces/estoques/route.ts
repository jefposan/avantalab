import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { listWarehouses, warehouseCommand, warehouseProducts } from '@/app/modules/marketplaces/services/warehouses';
export const runtime='nodejs';
export const maxDuration=60;
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request) {
  try {
    const params=new URL(request.url).searchParams;
    const {db,empresaId}=await authorizeMarketplace(request,params.get('empresaId'));
    if(params.has('warehouseId')) return NextResponse.json(await warehouseProducts(db,empresaId,params.get('warehouseId'),Math.max(1,Math.min(10000,Math.trunc(Number(params.get('page'))||1)))),{headers});
    return NextResponse.json({warehouses:await listWarehouses(db,empresaId)},{headers});
  } catch(error) {return managementFailure(error);}
}
export async function POST(request:Request) {
  try {
    const body=await request.json();
    const {db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');
    return NextResponse.json(await warehouseCommand(db,empresaId,usuario.id,body),{headers});
  } catch(error) {return managementFailure(error);}
}
