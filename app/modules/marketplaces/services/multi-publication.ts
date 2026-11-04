import 'server-only';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {getLocalProduct} from './local-products';
import {loadConnection,mlRequest,recordPublishedListing} from './mercadolivre-management';
import {prepareMercadoLivrePublication,publishMercadoLivreCatalog} from './mercadolivre-publication';
import {publicationErrors,warrantyDuration,type PublicationForm} from './catalog-publication';
import {objectValue,uuidIsValid,normalizeListing} from './listing-model';
import {sharedPublicationIdentity,sharedPublicationContent,existingDestination,commercialPublicationKey,type PublicationDestination} from '../multi-publication';
import {readMercadoLivreEditor} from './mercadolivre-editor';

export async function multiPublicationContext(db:SupabaseClient,company:string,productId:unknown){
 const product=await getLocalProduct(db,company,productId);
 const linked=await db.from('marketplace_product_links').select('connection_id,provider_listing_id,status,provider').eq('empresa_id',company).eq('product_id',product.id);
 if(linked.error)throw new MarketplaceError(503,'publication_links','Não foi possível conferir as contas já anunciadas. Tente novamente antes de publicar.');
 return{product,links:(linked.data||[]).map(link=>({connectionId:link.connection_id,listingId:link.provider_listing_id,status:link.status,provider:link.provider}))};
}
export function destinationRequestKey(batch:string,connection:string,action:string){
 if(!uuidIsValid(batch)||!uuidIsValid(connection))throw new MarketplaceError(400,'invalid_request','Tentativa inválida. Reabra a preparação.');
 const hex=createHash('sha256').update(`multi-publication:${batch}:${connection}:${action}`).digest('hex');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
async function previousAttempt(db:SupabaseClient,company:string,connection:string,key:string){
 const previous=await db.from('marketplace_publications').select('status,provider_listing_id,response_summary').eq('empresa_id',company).eq('connection_id',connection).eq('idempotency_key',key).maybeSingle();
 if(previous.error)throw new MarketplaceError(503,'publication_audit','Não foi possível conferir a tentativa anterior. Nada foi reenviado.');
 return previous.data;
}
export async function reserveDestinationKey(db:SupabaseClient,company:string,productId:string,connectionId:string){
 const target=await db.from('marketplace_multi_publication_targets').upsert({empresa_id:company,product_id:productId,connection_id:connectionId},{onConflict:'empresa_id,product_id,connection_id',ignoreDuplicates:true});
 if(target.error)throw new MarketplaceError(503,'multi_publication_setup','Não foi possível reservar a publicação desta conta. Nenhum anúncio foi enviado.');
 const stored=await db.from('marketplace_multi_publication_targets').select('request_key').eq('empresa_id',company).eq('product_id',productId).eq('connection_id',connectionId).single();
 if(stored.error||!stored.data)throw new MarketplaceError(503,'multi_publication_setup','Não foi possível conferir a tentativa desta conta.');
 return String(stored.data.request_key);
}
export async function reviewMultiDestination(db:SupabaseClient,company:string,connectionId:unknown,raw:unknown){
 const form=objectValue(raw) as unknown as PublicationForm;
 const context=await multiPublicationContext(db,company,form.localProductId);
 const settings=await db.from('marketplace_inventory_settings').select('enabled').eq('empresa_id',company).maybeSingle();
 if(settings.error||!settings.data?.enabled)throw new MarketplaceError(409,'inventory_disabled','Ative a sincronização de estoque do perfil antes de anunciar o mesmo saldo em várias contas.');
 try{sharedPublicationIdentity(form,context.product);sharedPublicationContent(form,context.product);}catch(error){throw new MarketplaceError(409,'shared_identity',String((error as Error).message));}
 const connection=await loadConnection(db,company,connectionId);
 if(existingDestination(context.links,connection.id))throw new MarketplaceError(409,'already_announced','Esta conta já tem anúncio deste produto e permanece marcada. Não será criado outro.');
 const prepared=await prepareMercadoLivrePublication(db,connection,form);
 const reviewed={...form,productId:prepared.product?.id||form.productId,ean:context.product.ean||'',stock:context.product.stock_quantity!};
 const errors=publicationErrors(reviewed,prepared);
 if(prepared.status!=='found'||prepared.blockingIssues?.length)errors.form=prepared.blockingIssues?.map(issue=>issue.message).join(' ')||'A conta não confirmou os dados do produto.';
 return{form:reviewed,prepared,errors};
}
export async function publishMultiDestination(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>){
 const form=objectValue(input.form) as unknown as PublicationForm;
 const context=await multiPublicationContext(db,company,form.localProductId);
 const connection=await loadConnection(db,company,input.connectionId);
 destinationRequestKey(String(input.batchKey),connection.id,'create');
 const target=await db.from('marketplace_multi_publication_targets').upsert({empresa_id:company,product_id:context.product.id,connection_id:connection.id},{onConflict:'empresa_id,product_id,connection_id',ignoreDuplicates:true});
 if(target.error)throw new MarketplaceError(503,'multi_publication_setup','Não foi possível reservar a publicação desta conta. Nenhum anúncio foi enviado.');
 const stored=await db.from('marketplace_multi_publication_targets').select('request_key').eq('empresa_id',company).eq('product_id',context.product.id).eq('connection_id',connection.id).single();
 if(stored.error||!stored.data)throw new MarketplaceError(503,'multi_publication_setup','Não foi possível conferir a tentativa desta conta.');
 const key=stored.data.request_key;
 const previous=await previousAttempt(db,company,connection.id,key);
 if(previous?.status==='published'&&previous.provider_listing_id)return{status:'published',listing:{id:previous.provider_listing_id},localProductId:context.product.id,replayed:true};
 if(previous)throw new MarketplaceError(409,'publication_uncertain','Esta tentativa já foi enviada. Confira Anunciados; não será reenviada automaticamente.');
 // A proteção permanece válida mesmo após fechar/reabrir o formulário.
 if(existingDestination(context.links,connection.id))throw new MarketplaceError(409,'already_announced','A conta já possui anúncio vinculado. Atualize a preparação para conferir.');
 const settings=await db.from('marketplace_inventory_settings').select('enabled').eq('empresa_id',company).maybeSingle();
 if(settings.error||!settings.data?.enabled)throw new MarketplaceError(409,'inventory_disabled','Ative a sincronização de estoque antes de publicar o saldo compartilhado.');
 const pending=await db.from('marketplace_publications').select('id,status,response_summary').eq('empresa_id',company).eq('connection_id',connection.id).contains('response_summary',{local_product_id:context.product.id}).in('status',['publishing','failed']);
 if(pending.error)throw new MarketplaceError(503,'publication_audit','Não foi possível conferir envios anteriores.');
 if(pending.data?.some(row=>row.status==='publishing'||!['provider_400','provider_403','invalid_fields'].includes(String(objectValue(row.response_summary).error_code))))throw new MarketplaceError(409,'publication_uncertain','Há um envio anterior sem confirmação nesta conta. Confira Anunciados antes de criar outro.');
 try{sharedPublicationIdentity(form,context.product);sharedPublicationContent(form,context.product);}catch(error){throw new MarketplaceError(409,'shared_identity',(error as Error).message);}
 try{return await publishMercadoLivreCatalog(db,connection,actor,key,form);}
 catch(error){
  // Apenas recusa explícita, sem item criado, libera uma nova tentativa.
  const rejected=await previousAttempt(db,company,connection.id,key);
  if(rejected?.status==='failed'&&!rejected.provider_listing_id&&['provider_400','provider_403'].includes(String(objectValue(rejected.response_summary).error_code)))await db.from('marketplace_multi_publication_targets').update({request_key:crypto.randomUUID()}).eq('empresa_id',company).eq('product_id',context.product.id).eq('connection_id',connection.id).eq('request_key',key);
  throw error;
 }
}

/** Altera somente o preço escolhido; nunca conteúdo, EAN, saldo, status ou vínculo. */
export async function updateExistingDestination(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>){
 const form=objectValue(input.form) as unknown as PublicationForm;
 const {product,links}=await multiPublicationContext(db,company,form.localProductId);
 const link=links.find(link=>link.connectionId===input.connectionId&&link.listingId===input.listingId&&link.provider==='mercado_livre');
 if(!link||input.confirmUpdate!==true)throw new MarketplaceError(400,'update_confirmation','Confirme o anúncio existente que receberá as alterações.');
 if(form.ean!==(product.ean||''))throw new MarketplaceError(409,'shared_identity','O EAN não pode variar entre contas.');
 const fields=Array.isArray(input.fields)?input.fields:[];
 if(fields.length!==1||fields[0]!=='price')throw new MarketplaceError(400,'invalid_fields','Somente o preço pode ser atualizado entre anúncios do mesmo cadastro.');
 if(fields.includes('price')&&(!Number.isFinite(form.price)||form.price<=0))throw new MarketplaceError(400,'invalid_fields','Informe um preço válido.');
 const connection=await loadConnection(db,company,link.connectionId);
 const key=destinationRequestKey(String(input.batchKey),connection.id,`update:${link.listingId}:${JSON.stringify(fields)}:${commercialPublicationKey(form)}`);
 const old=await db.from('marketplace_listing_actions').select('id,status').eq('empresa_id',company).eq('connection_id',connection.id).eq('request_key',key).maybeSingle();
 if(old.error)throw new MarketplaceError(503,'edit_audit','Não foi possível conferir a edição anterior.');
 if(old.data)return{status:old.data.status==='succeeded'?'updated':'pending',listing:{id:link.listingId},replayed:true};
 const item=objectValue(await mlRequest(db,connection,`/items/${link.listingId}`));normalizeListing(item,connection.seller_reference);
 if(!['active','paused'].includes(String(item.status)))throw new MarketplaceError(409,'invalid_state','Este anúncio não aceita edição na situação atual.');
 const editor=await readMercadoLivreEditor(db,connection,link.listingId);
 if(editor.values.price!==form.price&&!editor.fields.price.editable)throw new MarketplaceError(409,'edit_blocked',editor.fields.price.reason||'A plataforma não permite alterar o preço deste anúncio.');
 const body:Record<string,unknown>={};
 if(fields.includes('price'))body.price=form.price;
 const inserted=await db.from('marketplace_listing_actions').insert({empresa_id:company,connection_id:connection.id,provider_listing_id:link.listingId,action:'edit',request_key:key,actor_id:actor,request_payload:{multi_account:true,fields}}).select('id').single();
 if(inserted.error||!inserted.data)throw new MarketplaceError(409,'edit_busy','Outra edição está em andamento. Nada foi reenviado.');
 let sent=false;
 try{
  if(Object.keys(body).length){sent=true;await mlRequest(db,connection,`/items/${link.listingId}`,'PUT',body);}
  if(fields.includes('description')){sent=true;await mlRequest(db,connection,`/items/${link.listingId}/description?api_version=2`,'PUT',{plain_text:form.description});}
  const fresh=objectValue(await mlRequest(db,connection,`/items/${link.listingId}`));normalizeListing(fresh,connection.seller_reference);
  if(fields.includes('price')&&fresh.price!==form.price)throw Error('Preço não confirmado');
  await recordPublishedListing(db,connection,link.listingId);
  const recorded=await db.from('marketplace_listing_actions').update({status:'succeeded',error_code:null}).eq('empresa_id',company).eq('id',inserted.data.id);if(recorded.error)throw recorded.error;
  return{status:'updated',listing:{id:link.listingId}};
 }catch(error){
  const rejected=error instanceof MarketplaceError&&['provider_400','provider_403'].includes(error.code);
  await db.from('marketplace_listing_actions').update({status:sent&&!rejected?'uncertain':'failed',error_code:rejected?(error as MarketplaceError).code:'multi_update_pending'}).eq('empresa_id',company).eq('id',inserted.data.id);
  if(rejected)throw error;
  throw new MarketplaceError(409,'edit_uncertain','A atualização não foi confirmada integralmente. Confira este anúncio antes de repetir; os demais não foram revertidos.');
 }
}
