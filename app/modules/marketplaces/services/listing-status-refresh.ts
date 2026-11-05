import 'server-only';
import {randomUUID} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {mlRequest,saveListing,type SellerConnection} from './mercadolivre-management';
import {MarketplaceError} from './management-access';
import {objectValue} from './listing-model';

/** Só GET no marketplace: ausência na busca/404 nunca é prova de exclusão. */
export async function refreshKnownListingStatuses(db:SupabaseClient,connection:SellerConnection,deadline=Date.now()+35_000){
 const owner=randomUUID(),now=new Date().toISOString();
 const lock=await db.from('marketplace_connections').update({sync_lock_owner:owner,sync_lock_until:new Date(Date.now()+60_000).toISOString(),last_checked_at:now})
  .eq('empresa_id',connection.empresa_id).eq('id',connection.id).eq('provider','mercado_livre').eq('status','connected')
  .or(`sync_lock_until.is.null,sync_lock_until.lt.${now}`).select('id').maybeSingle();
 if(lock.error)throw new MarketplaceError(503,'database','Não foi possível iniciar a conferência dos anúncios.');
 if(!lock.data)return{count:0,complete:false,busy:true};
 try{
  const saved=await db.from('marketplace_listing_status_checks').select('*').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).maybeSingle();
  if(saved.error)throw new MarketplaceError(503,'database','Não foi possível consultar o progresso dos anúncios.');
  const state=saved.data;
  let query=db.from('marketplace_listings').select('id,provider_listing_id').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('provider','mercado_livre').order('id').limit(8);
  if(state?.cursor)query=query.gt('id',state.cursor);
  const page=await query;
  if(page.error)throw new MarketplaceError(503,'database','Não foi possível consultar os anúncios cadastrados.');
  let cursor=state?.cursor||null,count=0,cycleFailed=state?.cursor?!!state.cycle_failed:false;
  let issue:string|null=state?.issue||null;
  for(const row of page.data||[]){
   if(Date.now()>deadline-10_000)break;
   try{
    const item=objectValue(await mlRequest(db,connection,`/items/${row.provider_listing_id}`));
    if(item.id!==row.provider_listing_id||String(item.seller_id)!==connection.seller_reference)throw new Error('Identidade divergente');
    await saveListing(db,connection,item,false);count++;
   }catch{cycleFailed=true;issue='listing_refresh_partial';}
   // Falha isolada não trava os demais; este ID será tentado no próximo ciclo.
   cursor=row.id;
  }
  const rows=page.data||[],finishedPage=!rows.length||cursor===rows[rows.length-1].id;
  const complete=finishedPage&&rows.length<8;
  const progress=await db.from('marketplace_listing_status_checks').upsert({empresa_id:connection.empresa_id,connection_id:connection.id,
   cursor:complete?null:cursor,checked_at:new Date().toISOString(),cycle_failed:cycleFailed,
   last_completed_at:complete&&!cycleFailed?new Date().toISOString():state?.last_completed_at||null,
   issue:complete&&!cycleFailed?null:issue},{onConflict:'connection_id'});
  if(progress.error)throw new MarketplaceError(503,'database','Não foi possível salvar o progresso da conferência.');
  return{count,complete,partial:cycleFailed};
 }finally{
  const released=await db.from('marketplace_connections').update({sync_lock_owner:null,sync_lock_until:null})
   .eq('empresa_id',connection.empresa_id).eq('id',connection.id).eq('sync_lock_owner',owner);
  if(released.error)throw new MarketplaceError(503,'database','Não foi possível encerrar a conferência.');
 }
}
