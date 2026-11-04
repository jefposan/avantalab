import {NextResponse} from 'next/server';
import {authorizeMarketplace,managementFailure,MarketplaceError} from '@/app/modules/marketplaces/services/management-access';
import {multiPublicationContext,reviewMultiDestination,publishMultiDestination,updateExistingDestination} from '@/app/modules/marketplaces/services/multi-publication';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 try{
  const body=await request.json();
  const {db,empresaId,usuario}=await authorizeMarketplace(request,body.empresaId,'manage');
  if(body.action==='source_magalu'){
   const {integrationAdapter}=await import('@/app/modules/marketplaces/services/integration-adapters');
   const adapter=await integrationAdapter(db,empresaId,body.connectionId);
   if(adapter.provider!=='magalu')throw new MarketplaceError(400,'invalid_provider','Selecione um anúncio Magalu.');
   const editor=await adapter.editor(body.listingId);
   const linked=await db.from('marketplace_product_links').select('product_id').eq('empresa_id',empresaId).eq('connection_id',body.connectionId).eq('provider_listing_id',body.listingId).maybeSingle();
   if(linked.error||!linked.data)throw new MarketplaceError(409,'product_link_required','Vincule este anúncio ao cadastro local antes de anunciar em outras contas.');
   return NextResponse.json({productId:linked.data.product_id,values:editor.values},{headers:{'Cache-Control':'no-store'}});
  }
  if(['review_magalu','publish_magalu','advance_magalu','update_magalu'].includes(body.action)){
   const {magaluMultiPublication}=await import('@/app/modules/marketplaces/services/magalu-multi-publication');
   return NextResponse.json(await magaluMultiPublication(db,empresaId,usuario.id,body),{headers:{'Cache-Control':'no-store'}});
  }
  const result=body.action==='context'?await multiPublicationContext(db,empresaId,body.productId):body.action==='review'?await reviewMultiDestination(db,empresaId,body.connectionId,body.form):body.action==='publish'?await publishMultiDestination(db,empresaId,usuario.id,body):body.action==='update'?await updateExistingDestination(db,empresaId,usuario.id,body):null;
  if(!result)throw new MarketplaceError(400,'invalid_action','Ação de publicação inválida.');
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(error){return managementFailure(error);}
}
