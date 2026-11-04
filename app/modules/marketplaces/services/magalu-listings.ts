import 'server-only';
import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import type {SupabaseClient} from '@supabase/supabase-js';
import {normalizarTexto} from '@/app/lib/formatters';
import {MarketplaceError} from './management-access';
import {loadMagaluConnection,magaluCatalogRequest,type MagaluConnection} from './magalu-request';
import {magaluSku,magaluListingPage,normalizeMagaluListing} from '../magalu-listing-model';
import {MAGALU_CHANNEL_ID} from '../magalu-publication-model';
import {objectValue,uuidIsValid,type ListingSnapshot} from './listing-model';
const path=(resource:string,sku:string)=>`/seller/v1/portfolios/${resource}/${encodeURIComponent(sku)}`;
export async function readMagaluListing(db:SupabaseClient,connection:MagaluConnection,sku:string){
 if(!magaluSku(sku))throw new MarketplaceError(400,'invalid_item','SKU Magalu inválido.');
 const skuResult=await magaluCatalogRequest(db,connection,'GET',path('skus',sku));
 if(skuResult.status===404)throw new MarketplaceError(404,'listing_missing','SKU não encontrado nesta loja Magalu.');
 const warnings:string[]=[];
 const read=async(resource:string)=>{try{const r=await magaluCatalogRequest(db,connection,'GET',path(resource,sku));if(r.status!==200)throw Error('not_found');return r.data;}catch{warnings.push(`${resource==='stocks'?'Estoque':'Preço'} não confirmado nesta consulta. Confira a permissão e atualize.`);return undefined;}};
 const [stock,price]=await Promise.all([read('stocks'),read('prices')]);
  try{const listing=normalizeMagaluListing(skuResult.data,sku,stock,price);listing.description=String(objectValue(skuResult.data).description||'').slice(0,7000);listing.warnings.push(...warnings);return{listing,raw:objectValue(skuResult.data)};}
 catch{throw new MarketplaceError(503,'magalu_listing_identity','O Magalu retornou um SKU ou canal diferente. Nenhum vínculo foi alterado.');}
}
export async function saveMagaluListing(db:SupabaseClient,connection:MagaluConnection,listing:ListingSnapshot){
 const saved=await db.from('marketplace_listings').upsert({empresa_id:connection.empresa_id,connection_id:connection.id,provider:'magalu',provider_listing_id:listing.id,title:listing.title,search_text:normalizarTexto([listing.title,listing.id,listing.ean,listing.sku].filter(Boolean).join(' ')),status:listing.status,snapshot:listing,synced_at:listing.syncedAt},{onConflict:'connection_id,provider_listing_id'});
 if(saved.error)throw new MarketplaceError(503,'magalu_catalog_database','Não foi possível salvar os anúncios Magalu. Confira a migração do conector.');
 const observed=await db.rpc('marketplace_observe_listing',{p_empresa:connection.empresa_id,p_connection:connection.id,p_listing:listing.id,p_quantity:listing.stock,p_status:listing.status});
 if(observed.error)throw new MarketplaceError(503,'database','Não foi possível conferir o saldo vinculado.');
 return listing;
}
export async function synchronizeMagaluListings(db:SupabaseClient,connection:MagaluConnection,deadline=Infinity){
 const owner=randomUUID(),now=new Date().toISOString();
 const lock=await db.from('marketplace_connections').update({sync_lock_owner:owner,sync_lock_until:new Date(Date.now()+60000).toISOString()}).eq('empresa_id',connection.empresa_id).eq('id',connection.id).eq('provider','magalu').or(`sync_lock_until.is.null,sync_lock_until.lt.${now}`).select('*').maybeSingle();
 if(lock.error)throw new MarketplaceError(503,'database','Não foi possível preparar a consulta de anúncios.');
 if(!lock.data)throw new MarketplaceError(409,'sync_busy','Esta conta já está sendo atualizada.');
 try{
  const cursor=typeof lock.data.sync_cursor==='string'&&lock.data.sync_cursor.startsWith('magalu:')?Number(lock.data.sync_cursor.slice(7)):0;
  if(!Number.isSafeInteger(cursor)||cursor<0)throw Error('cursor');
  const result=await magaluCatalogRequest(db,connection,'GET',`/seller/v1/portfolios/skus?${new URLSearchParams({_offset:String(cursor),_limit:'5',_sort:'sku:asc'})}`);
  let page;try{page=magaluListingPage(result.data,cursor,5);}catch{throw new MarketplaceError(503,'magalu_catalog_page','A paginação do catálogo Magalu está incompleta. A posição anterior foi preservada.');}
  // Valida identidade/canal de toda a página antes da primeira gravação.
  page.rows.forEach(row=>normalizeMagaluListing(row,String(row.sku)));
  if(page.rows.length&&Date.now()>deadline-26_000)throw new MarketplaceError(409,'worker_time_limit','A consulta do catálogo continuará no próximo ciclo, sem avançar a posição.');
  const listings=await Promise.all(page.rows.map(async row=>(await readMagaluListing(db,connection,String(row.sku))).listing));
  for(const listing of listings){await saveMagaluListing(db,connection,listing);await reconcileMagaluActions(db,connection,listing);}
  const progress=await db.from('marketplace_connections').update({sync_cursor:page.next==null?null:`magalu:${page.next}`,last_synced_at:now}).eq('empresa_id',connection.empresa_id).eq('id',connection.id).eq('sync_lock_owner',owner);
  if(progress.error)throw new MarketplaceError(503,'database','A lista foi salva, mas a posição precisa ser conferida. Atualize novamente.');
  return{count:listings.length,complete:page.next==null,phase:'enrich',discovered:listings.length};
 }finally{await db.from('marketplace_connections').update({sync_lock_owner:null,sync_lock_until:null}).eq('empresa_id',connection.empresa_id).eq('id',connection.id).eq('sync_lock_owner',owner);}
}
function matches(listing:ListingSnapshot,payload:Record<string,unknown>){
 if(payload.action==='pause')return listing.status==='paused';
 if(payload.action==='resume')return listing.status==='active';
 if(payload.action==='price')return listing.price!=null&&Math.round(listing.price*100)===payload.priceCents;
 return listing.title===payload.title&&(payload.description===undefined||listing.description===payload.description);
}
export async function reconcileMagaluActions(db:SupabaseClient,connection:MagaluConnection,listing:ListingSnapshot){
 const pending=await db.from('marketplace_listing_actions').select('id,request_payload').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('provider_listing_id',listing.id).in('status',['requested','uncertain']);
 if(pending.error)throw new MarketplaceError(503,'database','Não foi possível conferir as alterações pendentes.');
 for(const row of pending.data||[]){const payload=objectValue(row.request_payload);if(Object.keys(payload).length&&matches(listing,payload)){const r=await db.from('marketplace_listing_actions').update({status:'succeeded',error_code:null}).eq('id',row.id).eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id);if(r.error)throw new MarketplaceError(503,'database','Resultado ainda não registrado.');}}
}
export async function manageMagaluListing(db:SupabaseClient,connection:MagaluConnection,actor:string,input:Record<string,unknown>){
 if(!magaluSku(input.id)||!uuidIsValid(input.requestKey)||input.confirmation!==input.id||!['pause','resume','edit','price'].includes(String(input.action)))throw new MarketplaceError(400,'invalid_action','Confirme o SKU e uma ação suportada pelo Magalu.');
 const payload:Record<string,unknown>={id:input.id,action:input.action,...(input.editorChanges?{editorChanges:input.editorChanges}:{})};let resource='skus',body:Record<string,unknown>;
 if(input.action==='price'){
  if(!Number.isSafeInteger(input.priceCents)||(input.priceCents as number)<1||(input.priceCents as number)>99999999)throw new MarketplaceError(400,'invalid_price','Confira o valor do anúncio.');
  payload.priceCents=input.priceCents;resource='prices';body={channel:{id:MAGALU_CHANNEL_ID},currency:'BRL',normalizer:100,price:input.priceCents};
 }else if(input.action==='edit'){
  if(typeof input.title!=='string'||!input.title.trim()||input.title.trim().length>150)throw new MarketplaceError(400,'invalid_title','Informe título de até 150 caracteres.');
  payload.title=input.title.trim();body={title:payload.title};
  if(input.description!==undefined){if(typeof input.description!=='string'||!input.description.trim()||input.description.length>7000)throw new MarketplaceError(400,'invalid_description','Descrição deve ter de 1 a 7.000 caracteres.');payload.description=input.description.trim();body.description=payload.description;}
 }else body={active:input.action==='resume'};
 const existing=await db.from('marketplace_listing_actions').select('*').eq('empresa_id',connection.empresa_id).eq('request_key',input.requestKey).maybeSingle();
 if(existing.error)throw new MarketplaceError(503,'database','Não foi possível conferir a tentativa.');
 if(existing.data&&(existing.data.connection_id!==connection.id||existing.data.actor_id!==actor||!isDeepStrictEqual(existing.data.request_payload,payload)))throw new MarketplaceError(409,'duplicate_action','Tentativa já utilizada com outros dados.');
 const current=await readMagaluListing(db,connection,input.id);await saveMagaluListing(db,connection,current.listing);await reconcileMagaluActions(db,connection,current.listing);
 if(existing.data)return{listing:current.listing,pending:!matches(current.listing,payload),message:'Tentativa consultada, sem reenviar alteração.'};
 if(input.expectedRevision){const {magaluEditorSnapshot}=await import('./magalu-editor');if(magaluEditorSnapshot(connection,current.listing).revision!==input.expectedRevision)throw new MarketplaceError(409,'edit_conflict','O anúncio mudou durante a edição. Recarregue antes de salvar.');}
 if((input.action==='pause'&&current.listing.status!=='active')||(input.action==='resume'&&current.listing.status!=='paused'))throw new MarketplaceError(409,'listing_changed','A situação do anúncio mudou. Atualize antes de continuar.');
 if(input.action==='resume'){
  const link=await db.from('marketplace_product_links').select('product_id').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('provider_listing_id',input.id).maybeSingle();
  if(link.error||!link.data)throw new MarketplaceError(409,'product_not_linked','Vincule o anúncio ao cadastro e confirme o saldo Online antes de reativar.');
  const product=await db.from('marketplace_products').select('stock_quantity,listing_stock_review_at').eq('empresa_id',connection.empresa_id).eq('id',link.data.product_id).is('archived_at',null).maybeSingle();
  if(product.data?.listing_stock_review_at)throw new MarketplaceError(409,'import_stock_review','Confirme a quantidade física Online antes de reativar este anúncio.');
  if(product.error||!product.data||(product.data.stock_quantity??0)<=0||current.listing.stock==null||current.listing.stock<=0)throw new MarketplaceError(409,'no_stock','Sem estoque Online disponível e confirmado no anúncio. Sincronize antes de reativar.');
 }
 const prior=await db.from('marketplace_listing_actions').select('id').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('provider_listing_id',input.id).in('status',['requested','uncertain']).limit(1);
 if(prior.error||prior.data?.length)throw new MarketplaceError(409,'mutation_uncertain','Há alteração ainda não confirmada. Atualize o anúncio antes de outra mudança.');
 const audit=await db.from('marketplace_listing_actions').insert({empresa_id:connection.empresa_id,connection_id:connection.id,provider:'magalu',provider_listing_id:input.id,action:['pause','resume'].includes(String(input.action))?input.action:'edit',request_key:input.requestKey,actor_id:actor,request_payload:payload}).select('id').single();
 if(audit.error||!audit.data)throw new MarketplaceError(409,'duplicate_action','A tentativa não foi enviada. Confira as alterações pendentes.');
 try{
  await magaluCatalogRequest(db,connection,'PATCH',path(resource,input.id),body);
  const verified=await readMagaluListing(db,connection,input.id);await saveMagaluListing(db,connection,verified.listing);
  const pending=!matches(verified.listing,payload);
  const result=await db.from('marketplace_listing_actions').update({status:pending?'uncertain':'succeeded',error_code:pending?'magalu_processing':null}).eq('empresa_id',connection.empresa_id).eq('id',audit.data.id);if(result.error)throw Error('persistence');
  return{listing:verified.listing,success:!pending,pending,message:pending?'Magalu aceitou o envio; aguardando confirmação por consulta.':'Alteração confirmada pelo Magalu.'};
 }catch(error){await db.from('marketplace_listing_actions').update({status:'uncertain',error_code:error instanceof MarketplaceError?error.code:'magalu_write_uncertain'}).eq('empresa_id',connection.empresa_id).eq('id',audit.data.id);throw new MarketplaceError(409,'magalu_write_uncertain','O resultado pode estar em processamento. Atualize o anúncio; não repita com outra chave.');}
}
export {loadMagaluConnection};
