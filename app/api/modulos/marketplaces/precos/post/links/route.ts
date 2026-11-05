import {NextResponse} from 'next/server';
import {authorizePriceConsultation} from '@/app/modules/marketplaces/services/price-access';
import {managementFailure} from '@/app/modules/marketplaces/services/management-access';
import {postProduct,readProductPost} from '@/app/modules/marketplaces/services/product-posts';
import {readProductInternalNotes} from '@/app/modules/marketplaces/services/product-internal-notes';
import {postSummary} from '@/app/modules/marketplaces/product-post';
import {warehouseContext} from '@/app/modules/marketplaces/services/warehouses';
import {readProductShoppingLinks,readPostMarketReference} from '@/app/modules/marketplaces/services/product-shopping-links';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(request:Request){
 try{
  const q=new URL(request.url).searchParams,{db,empresaId}=await authorizePriceConsultation(request,q.get('empresaId'));
  const product=await postProduct(db,empresaId,{productId:q.get('productId'),historyId:q.get('historyId')});
  const stock=await warehouseContext(db,empresaId,product.id);
  if(!stock.warehousesReady||!stock.warehouses.some(w=>w.is_online&&w.quantity!==null&&w.quantity>0))return NextResponse.json({stock,links:[],referencePriceCents:null},{headers:{'Cache-Control':'private, no-store'}});
  const [links,referencePriceCents,saved,notes]=await Promise.all([readProductShoppingLinks(db,empresaId,product.id),readPostMarketReference(db,empresaId,product.id),readProductPost(db,empresaId,product.id),readProductInternalNotes(db,empresaId,[product.id])]);
  const caption={description:saved?.draft.description||postSummary(product.name),details:saved?.draft.details||saved?.draft.damage||notes.get(product.id)?.internalNotes||''};
  return NextResponse.json({stock,links,referencePriceCents,caption},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return managementFailure(error);}
}
