import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {uuidIsValid,objectValue,listingIdIsValid} from './listing-model';
import {marketplaceCapabilities} from '../integration-contract';
/** Única seleção de conector: conta, empresa e permissão nunca vêm do snapshot do navegador. */
export async function integrationAdapter(db:SupabaseClient,company:string,connectionId:unknown){
 if(!uuidIsValid(connectionId))throw new MarketplaceError(400,'select_account','Selecione uma conta.');
 const found=await db.from('marketplace_connections').select('provider').eq('empresa_id',company).eq('id',connectionId).maybeSingle();
 if(found.error)throw new MarketplaceError(503,'database','Não foi possível conferir a conexão.');
 if(!found.data)throw new MarketplaceError(404,'account_not_found','Conta não encontrada neste perfil.');
 const provider=String(found.data.provider),capabilities=marketplaceCapabilities(provider);
 if(provider==='mercado_livre'){
  const ml=await import('./mercadolivre-management'),connection=await ml.loadConnection(db,company,connectionId);
  const readLink=async(id:string)=>{
   if(!listingIdIsValid(id))throw new MarketplaceError(400,'invalid_item','Identificador de anúncio inválido.');
   const item=objectValue(await ml.mlRequest(db,connection,`/items/${id}`));
   if(item.id!==id||String(item.seller_id)!==connection.seller_reference)throw new MarketplaceError(403,'seller_mismatch','Não foi possível confirmar o anúncio nesta conta.');
   return {id,permalink:item.permalink};
  };
  const {listingEditAdapter}=await import('./listing-edit-adapters'),editor=listingEditAdapter('mercado_livre');
  return{provider,capabilities,readLink,editor:(id:unknown)=>editor.read(db,connection,id),saveEditor:(actor:string,input:Record<string,unknown>)=>editor.save(db,connection,actor,{id:input.id,revision:input.revision,requestKey:input.requestKey,changes:input.changes}),sync:()=>ml.synchronizeListings(db,connection),read:(id:string)=>ml.recordPublishedListing(db,connection,id),mutate:(actor:string,input:Record<string,unknown>)=>input.action==='edit'?editor.save(db,connection,actor,{id:input.id,revision:input.revision,requestKey:input.requestKey,changes:input.changes}):ml.manageListing(db,connection,actor,{id:input.id,action:input.action,requestKey:input.requestKey,confirmation:input.confirmation})};
 }
 if(provider==='magalu'){
  const magalu=await import('./magalu-listings'),connection=await magalu.loadMagaluConnection(db,company,connectionId);
  const readLink=async(id:string)=>{const {listing}=await magalu.readMagaluListing(db,connection,id);return {id:listing.id,permalink:listing.permalink};};
  const {listingEditAdapter}=await import('./listing-edit-adapters'),editor=listingEditAdapter('magalu');
  return{provider,capabilities,readLink,editor:(id:unknown)=>editor.read(db,connection,id),saveEditor:(actor:string,input:Record<string,unknown>)=>editor.save(db,connection,actor,{id:input.id,revision:input.revision,requestKey:input.requestKey,changes:input.changes}),sync:()=>magalu.synchronizeMagaluListings(db,connection),read:async(id:string)=>{const current=await magalu.readMagaluListing(db,connection,id);await magalu.reconcileMagaluActions(db,connection,current.listing);return magalu.saveMagaluListing(db,connection,current.listing);},mutate:(actor:string,input:Record<string,unknown>)=>['edit','price'].includes(String(input.action))?editor.save(db,connection,actor,{id:input.id,revision:input.revision,requestKey:input.requestKey,changes:input.changes}):magalu.manageMagaluListing(db,connection,actor,objectValue(input))};
 }
 throw new MarketplaceError(501,'provider_not_supported','Este marketplace ainda não possui adaptador homologado para estas operações.');
}
