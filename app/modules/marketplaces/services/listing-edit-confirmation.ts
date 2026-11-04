import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {objectValue} from './listing-model';

/** Somente valores relidos do marketplace. Nunca confirma só pelo aceite do envio. */
export async function reconcileListingEdits(db:SupabaseClient,company:string,connection:string,id:string,values:Record<string,unknown>){
 for(const status of ['requested','uncertain']){
  const pending=await db.from('marketplace_listing_actions').select('id,request_payload').eq('empresa_id',company).eq('connection_id',connection).eq('provider_listing_id',id).eq('action','edit').eq('status',status);
  if(pending.error)throw new MarketplaceError(503,'audit_database','Não foi possível conferir a alteração pendente.');
  for(const row of pending.data||[]){
   const changes=objectValue(objectValue(row.request_payload).changes),entries=Object.entries(changes);
   if(!entries.length||entries.some(([key,value])=>!['title','description','price','stock','listingType'].includes(key)||values[key]!==value))continue;
   const saved=await db.from('marketplace_listing_actions').update({status:'succeeded',error_code:null}).eq('empresa_id',company).eq('connection_id',connection).eq('provider_listing_id',id).eq('id',row.id).eq('status',status);
   if(saved.error)throw new MarketplaceError(503,'audit_database','Os dados foram conferidos, mas a confirmação ainda não foi registrada.');
  }
 }
}
