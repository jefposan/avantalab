import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {loadMagaluCatalogConnection} from './magalu-request';
import {magaluCategoryTemplate,createMagaluPublication,continueMagaluPublication} from './magalu-publication';
import {magaluPublicationErrors,isMagaluPublicationForm} from '../magalu-publication-model';
import {existingDestination,sharedPublicationIdentity} from '../multi-publication';
import {multiPublicationContext,reserveDestinationKey,destinationRequestKey} from './multi-publication';
import {objectValue} from './listing-model';
import {integrationAdapter} from './integration-adapters';

export async function magaluMultiPublication(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>){
 if(!isMagaluPublicationForm(input.form))throw new MarketplaceError(400,'invalid_form','Revise os dados do anúncio.');
 const supplied=input.form,context=await multiPublicationContext(db,company,supplied.productId);
 const form={...supplied,revision:context.product.revision};
 const connection=await loadMagaluCatalogConnection(db,company,input.connectionId);
 const settings=await db.from('marketplace_inventory_settings').select('enabled').eq('empresa_id',company).maybeSingle();
 if(settings.error||!settings.data?.enabled)throw new MarketplaceError(409,'inventory_disabled','Ative a sincronização de estoque antes de anunciar o mesmo saldo em várias contas.');
 try{sharedPublicationIdentity({ean:form.ean,stock:form.stock},context.product);}catch(error){throw new MarketplaceError(409,'shared_identity',(error as Error).message);}
 if(input.action==='update_magalu'){
  const link=context.links.find(link=>link.provider==='magalu'&&link.connectionId===connection.id&&link.listingId===input.listingId);
  if(!link||input.confirmUpdate!==true)throw new MarketplaceError(400,'update_confirmation','Confirme a atualização do anúncio existente.');
  const adapter=await integrationAdapter(db,company,connection.id),editor=await adapter.editor(link.listingId);
  const changes:Record<string,unknown>={};
  if(Array.isArray(input.fields)&&input.fields.includes('price')&&editor.values.price!==form.priceCents/100)changes.price=form.priceCents/100;
  if(Array.isArray(input.fields)&&input.fields.includes('description')&&editor.values.description!==form.description)changes.description=form.description;
  if(!Object.keys(changes).length)return{status:'updated'};
  // O Magalu exige ficha e preço em operações distintas. Nunca reenviar uma edição pendente.
  for(const field of ['description','price'])if(changes[field]!==undefined){
   const current=await adapter.editor(link.listingId);
   const result=await adapter.saveEditor(actor,{id:link.listingId,revision:current.revision,changes:{[field]:changes[field]},requestKey:destinationRequestKey(String(input.batchKey),connection.id,`update:${link.listingId}:${field}:${String(changes[field])}`)});
   if(result.pending)return{status:'pending'};
  }
  return{status:'updated'};
 }
 if(input.action!=='advance_magalu'&&existingDestination(context.links,connection.id))throw new MarketplaceError(409,'already_announced','Esta conta já tem anúncio deste produto e permanece marcada.');
 if(input.action==='review_magalu'){
  const template=await magaluCategoryTemplate(db,connection,form.categoryId);
  return{errors:magaluPublicationErrors(form,context.product,template.attributes,template.datasheet)};
 }
 const key=await reserveDestinationKey(db,company,context.product.id,connection.id);
 const previous=await db.from('marketplace_publications').select('status,idempotency_key,response_summary,provider_listing_id').eq('empresa_id',company).eq('connection_id',connection.id).eq('idempotency_key',key).maybeSingle();
 if(previous.error)throw new MarketplaceError(503,'publication_audit','Não foi possível conferir a tentativa anterior.');
 if(previous.data){
  const summary=objectValue(previous.data.response_summary),publication={requestKey:key,sku:previous.data.provider_listing_id,title:summary.title,status:previous.data.status,stage:summary.stage,errorCode:summary.error_code||null};
  if(previous.data.status==='published')return{status:'published',publication};
  if(input.action==='advance_magalu')return{status:'pending',publication:await continueMagaluPublication(db,company,connection.id,key)};
  return{status:'pending',publication};
 }
 if(input.action!=='publish_magalu')throw new MarketplaceError(400,'invalid_action','Nenhuma publicação em andamento para conferir.');
 // O conector original relê cadastro, revisão, categoria, SKU e permissões antes de qualquer envio.
 const publication=await createMagaluPublication(db,company,connection.id,actor,key,form,{sharedStock:true});
 return{status:publication.status==='published'?'published':'pending',publication};
}
