import {NextResponse} from 'next/server';
import {authorizePriceConsultation} from '@/app/modules/marketplaces/services/price-access';
import {authorizeMarketplace,MarketplaceError,managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {directSalePermission} from '@/app/modules/marketplaces/services/direct-sales';
import {priceStockProduct} from '@/app/modules/marketplaces/services/price-product-stock';
import {warehouseContext} from '@/app/modules/marketplaces/services/warehouses';
import {listReservations,reservationCommand,reservationSyncStatus} from '@/app/modules/marketplaces/services/stock-reservations';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 try{
  const b=await request.json(),a=await authorizePriceConsultation(request,b.empresaId);
  if(!a.dedicated)await authorizeMarketplace(request,a.empresaId,b.action==='context'?'view':'manage');
  const canReserve=await directSalePermission(a.db,a.empresaId,a.usuario.id,a.perfil);
  if(!canReserve)throw new MarketplaceError(403,'forbidden','Solicite ao gestor a permissão de registrar vendas para administrar reservas.');
  if(b.action==='context'){
   const product=await priceStockProduct(a.db,a.empresaId,b);
   return NextResponse.json({actorId:a.usuario.id,canReserve,productId:product.id,sync:await reservationSyncStatus(a.db,a.empresaId,product.id),reservations:await listReservations(a.db,a.empresaId,product.id),...await warehouseContext(a.db,a.empresaId,product.id)},{headers});
  }
  return NextResponse.json({result:await reservationCommand(a.db,a.empresaId,a.usuario.id,b)},{headers});
 }catch(e){
  if(e instanceof MarketplaceError&&[400,409].includes(e.status))return NextResponse.json({rejected:true,message:e.message},{headers});
  return managementFailure(e);
 }
}
