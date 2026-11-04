import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {readListingQuality} from './listing-quality';
import {uuidIsValid} from './listing-model';
import {MarketplaceError} from './management-access';
export async function readProductQualityCache(db:SupabaseClient,company:string,product:unknown){
 if(!uuidIsValid(product))throw new MarketplaceError(400,'invalid_product','Produto inválido.');
 const links=await db.from('marketplace_product_links').select('connection_id,provider_listing_id,status').eq('empresa_id',company).eq('product_id',product).eq('provider','mercado_livre').limit(101);
 if(links.error||!Array.isArray(links.data)||links.data.length>100)throw new MarketplaceError(503,'quality_cache','Não foi possível carregar os objetivos salvos deste produto.');
 const active=links.data.filter(l=>!['closed','deleted','cancelled','canceled','excluded','unpublished'].includes(String(l.status).toLowerCase()));
 if(!active.length)return [];
 const keys=new Set(active.map(l=>`${l.connection_id}:${l.provider_listing_id}`));
 const rows=await db.from('marketplace_listing_quality').select('connection_id,listing_id,checked_at,issue,quality:result->quality').eq('empresa_id',company).in('connection_id',[...new Set(active.map(l=>l.connection_id))]).in('listing_id',[...new Set(active.map(l=>l.provider_listing_id))]);
 if(rows.error)throw new MarketplaceError(503,'quality_cache','Não foi possível carregar os objetivos salvos deste produto.');
 return (rows.data||[]).filter(r=>keys.has(`${r.connection_id}:${r.listing_id}`));
}
export async function readQualityCache(db:SupabaseClient,company:string){
 const records=[];
 for(let from=0;;from+=500){const r=await db.from('marketplace_listing_quality').select('connection_id,listing_id,score,checked_at,issue').eq('empresa_id',company).order('connection_id').order('listing_id').range(from,from+499);if(r.error)throw Error('Não foi possível carregar a qualidade salva.');records.push(...r.data);if(r.data.length<500)break;}
 return records;
}
export async function refreshQualityBatch(db:SupabaseClient,owner:string){
 const claim=await db.rpc('marketplace_quality_claim',{p_owner:owner});if(claim.error)throw Error('Não foi possível iniciar a atualização diária.');
 let updated=0,failed=0;
 const deadline=Date.now()+40000;
 for(const row of claim.data||[]){
  if(Date.now()>deadline)break;
  try{await readListingQuality(db,row.empresa_id,row.connection_id,row.listing_id);updated++;}
  catch{failed++;await db.from('marketplace_listing_quality').update({issue:'Consulta diária indisponível; última avaliação preservada.',next_check_at:new Date(Date.now()+3600000).toISOString()}).eq('empresa_id',row.empresa_id).eq('connection_id',row.connection_id).eq('listing_id',row.listing_id).eq('lease_owner',owner);}
  await db.from('marketplace_listing_quality').update({lease_owner:null,lease_until:null}).eq('empresa_id',row.empresa_id).eq('connection_id',row.connection_id).eq('listing_id',row.listing_id).eq('lease_owner',owner);
 }
 return {updated,failed};
}
