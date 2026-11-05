import {NextResponse} from 'next/server';
import {authorizePriceConsultation} from '@/app/modules/marketplaces/services/price-access';
import {managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {postProduct,readProductPost,postForClient,saveProductPost} from '@/app/modules/marketplaces/services/product-posts';
import {warehouseContext} from '@/app/modules/marketplaces/services/warehouses';
export const runtime='nodejs';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store'};
export async function GET(request:Request){
 try{
  const q=new URL(request.url).searchParams,{db,empresaId}=await authorizePriceConsultation(request,q.get('empresaId'));
  const product=await postProduct(db,empresaId,{productId:q.get('productId'),historyId:q.get('historyId')});
  const [row,stock]=await Promise.all([readProductPost(db,empresaId,product.id),warehouseContext(db,empresaId,product.id)]);
  return NextResponse.json({post:row?await postForClient(db,row):null,stock},{headers});
 }catch(e){return managementFailure(e);}
}
export async function POST(request:Request){
 try{
  if(Number(request.headers.get('content-length')||0)>4_000_000)throw new MarketplaceError(413,'post_too_large','Escolha uma foto menor e gere novamente.');
  const form=await request.formData();
  const {db,empresaId,usuario}=await authorizePriceConsultation(request,form.get('empresaId'));
  const product=await postProduct(db,empresaId,{productId:form.get('productId'),historyId:form.get('historyId')});
  const raw=form.get('draft'),image=form.get('image'),source=form.get('source');
  if(typeof raw!=='string'||raw.length>12000||!(image instanceof File)||!(source instanceof File))throw new MarketplaceError(400,'invalid_post','Gere novamente o post antes de salvar.');
  let draft:unknown;try{draft=JSON.parse(raw);}catch{throw new MarketplaceError(400,'invalid_post','Confira os dados do post.');}
  const row=await saveProductPost(db,empresaId,product.id,usuario.id,{draft,image,source,requestKey:form.get('requestKey'),revision:Number(form.get('revision'))});
  return NextResponse.json({id:row.id,productId:row.product_id,revision:row.revision},{headers});
 }catch(e){return managementFailure(e);}
}
