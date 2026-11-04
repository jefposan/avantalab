import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {reviewProductRemoval,removeProduct,deleteRemovalListing} from '@/app/modules/marketplaces/services/product-removal';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 try{
  const body=await request.json();const {db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');
  if(!['review','remove','delete_listing'].includes(body.action))throw new MarketplaceError(400,'invalid_action','Selecione uma operação de exclusão válida.');
  const result=body.action==='review'?await reviewProductRemoval(db,empresaId,usuario.id,body.productId):body.action==='delete_listing'?await deleteRemovalListing(db,empresaId,usuario.id,body):await removeProduct(db,empresaId,usuario.id,body);
  return NextResponse.json({result},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return managementFailure(error);}
}
