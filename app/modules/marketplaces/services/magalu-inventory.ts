import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {readMagaluListing,saveMagaluListing,loadMagaluConnection} from './magalu-listings';
import {magaluCatalogRequest} from './magalu-request';
import {MAGALU_CHANNEL_ID} from '../magalu-publication-model';
import {stockIncreaseBlocker} from './inventory-product-guard';
type Job={link_id:string;empresa_id:string;product_id:string;desired_quantity:number;revision:number;generation:string;allow_increase:boolean;attempts:number};
type Link={id:string;connection_id:string;provider_listing_id:string};
export async function deliverMagaluStockJob(db:SupabaseClient,job:Job,link:Link,deadline=Infinity){
 let state='pending',issue:string|null=null;
 const assertCurrent=async()=>{const fresh=await db.from('marketplace_products').select('stock_quantity,revision,listing_stock_review_at').eq('empresa_id',job.empresa_id).eq('id',job.product_id).is('archived_at',null).maybeSingle();if(fresh.error||fresh.data?.listing_stock_review_at||fresh.data?.stock_quantity!==job.desired_quantity||fresh.data?.revision!==job.revision)throw new MarketplaceError(409,'stock_changed','O saldo mudou antes do envio; a nova revisão será conferida.');};
 try{
  const review=await db.from('marketplace_products').select('listing_stock_review_at').eq('empresa_id',job.empresa_id).eq('id',job.product_id).maybeSingle();
  if(review.error||!review.data)throw new MarketplaceError(503,'inventory_database','Não foi possível conferir o produto.');
  if(review.data.listing_stock_review_at)throw new MarketplaceError(409,'import_stock_review','Confirme o estoque físico antes de enviar saldo ao Magalu.');
  const connection=await loadMagaluConnection(db,job.empresa_id,link.connection_id);
  const current=await readMagaluListing(db,connection,link.provider_listing_id);
  if(current.raw.fulfillment!==false)throw new MarketplaceError(409,current.raw.fulfillment===true?'fulfillment':'unknown_stock_model','Modelo de estoque deve ser confirmado antes de ajustar quantidade.');
  if(current.listing.stock==null)throw new MarketplaceError(409,'magalu_stock_origin','O saldo do canal ou Multi-Origem não foi confirmado.');
  if(!['active','paused'].includes(current.listing.status))throw new MarketplaceError(409,'magalu_listing_blocked','Confira a moderação/situação do SKU.');
  const latest=await db.from('marketplace_products').select('stock_quantity,revision').eq('empresa_id',job.empresa_id).eq('id',job.product_id).is('archived_at',null).maybeSingle();
  if(latest.error||latest.data?.stock_quantity!==job.desired_quantity||latest.data?.revision!==job.revision)throw new MarketplaceError(409,'stock_changed','O saldo mudou durante a consulta.');
  const control=await db.from('marketplace_listing_stock_control').select('pause_requested_at,paused_by_system').eq('empresa_id',job.empresa_id).eq('link_id',link.id).maybeSingle();
  if(control.error)throw new MarketplaceError(503,'inventory_database','Não foi possível conferir a propriedade da pausa.');
  if(current.listing.stock!==job.desired_quantity){
   if(current.listing.stock<job.desired_quantity){if(!job.allow_increase)throw new MarketplaceError(409,'lower_remote_stock','Conferindo possível venda antes de repor.');const blocker=await stockIncreaseBlocker(db,job.empresa_id,job.product_id);if(blocker)throw new MarketplaceError(409,blocker,'Há venda aguardando conferência.');}
   if(Date.now()>deadline-14000)throw new MarketplaceError(409,'worker_time_limit','Atualização continuará no próximo ciclo.');
   await assertCurrent();
   await magaluCatalogRequest(db,connection,'PATCH',`/seller/v1/portfolios/stocks/${encodeURIComponent(link.provider_listing_id)}`,{channel:{id:MAGALU_CHANNEL_ID},quantity:job.desired_quantity,type:'AVAILABLE'});
   // 202 significa aceito, não aplicado. Uma nova execução relê antes de reenviar.
   throw new MarketplaceError(409,'magalu_stock_processing','Saldo aceito para processamento; aguardando releitura do Magalu.');
  }
  if(job.desired_quantity===0&&current.raw.active===true){
   if(Date.now()>deadline-14000)throw new MarketplaceError(409,'worker_time_limit','Pausa continuará no próximo ciclo.');
   await assertCurrent();
   const saved=await db.from('marketplace_listing_stock_control').upsert({link_id:link.id,empresa_id:job.empresa_id,product_id:job.product_id,pause_requested_at:new Date().toISOString(),paused_by_system:false,updated_at:new Date().toISOString()},{onConflict:'link_id'});if(saved.error)throw new MarketplaceError(503,'inventory_database','Intenção de pausa não registrada.');
   await magaluCatalogRequest(db,connection,'PATCH',`/seller/v1/portfolios/skus/${encodeURIComponent(link.provider_listing_id)}`,{active:false});
   throw new MarketplaceError(409,'magalu_pause_processing','Pausa enviada; aguardando active=false e saldo zero na releitura.');
  }
  if(job.desired_quantity===0&&current.raw.active!==false)throw new MarketplaceError(409,'pause_unconfirmed','Pausa não confirmada.');
  if(job.desired_quantity===0&&control.data?.pause_requested_at){const r=await db.from('marketplace_listing_stock_control').update({paused_by_system:true,pause_confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('empresa_id',job.empresa_id).eq('link_id',link.id);if(r.error)throw Error('audit');}
  await saveMagaluListing(db,connection,current.listing);state='synced';
 }catch(error){issue=error instanceof MarketplaceError?error.code:'inventory_database';}
 const result=await db.from('marketplace_inventory_outbox').update({state,issue,attempts:job.attempts+1,next_attempt_at:new Date(Date.now()+60000).toISOString(),synced_at:state==='synced'?new Date().toISOString():null}).eq('empresa_id',job.empresa_id).eq('link_id',job.link_id).eq('product_id',job.product_id).eq('revision',job.revision).eq('generation',job.generation);
 if(result.error)throw new MarketplaceError(503,'inventory_database','Não foi possível registrar o retorno do estoque.');
}
