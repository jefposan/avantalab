import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {uuidIsValid} from './listing-model';

/** Uma leitura por página, restrita aos cadastros vinculados da empresa autorizada. */
export async function withListingPriceReferences<T extends {productId:string|null}>(db:SupabaseClient,companyId:string,groups:T[],signal?:AbortSignal):Promise<(T&{referencePriceCents:number|null})[]>{
 const empty=groups.map(group=>({...group,referencePriceCents:null}));
 const ids=[...new Set(groups.map(group=>group.productId).filter((id):id is string=>uuidIsValid(id)))];
 if(!ids.length)return empty;
 try{
  let query=db.from('marketplace_products').select('id,price_cents').eq('empresa_id',companyId).in('id',ids).is('archived_at',null);
  if(signal)query=query.abortSignal(signal);
  const {data,error}=await query;
  if(error)return empty;
  const references=new Map<string,number>();
  for(const row of data||[])if(ids.includes(row.id)&&Number.isSafeInteger(row.price_cents)&&row.price_cents>0)references.set(row.id,row.price_cents);
  return groups.map(group=>({...group,referencePriceCents:group.productId?references.get(group.productId)??null:null}));
 }catch{return empty;}
}
