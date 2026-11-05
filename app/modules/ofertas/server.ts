import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {unstable_cache} from 'next/cache';
import {readPriceSettings} from '../marketplaces/services/price-settings';
import {OFFERS_COMPANY,projectOffers,type CatalogRows} from './catalog';
// This is a public, read-only projection for ONE explicitly authorized storefront.
// No caller can supply a company, table, select expression or storage path.
async function load(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('catalog_unavailable');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const access=await db.from('empresa_modulos').select('ativo,expira_em').eq('empresa_id',OFFERS_COMPANY).eq('modulo_id','marketplaces').abortSignal(AbortSignal.timeout(12000)).maybeSingle();
 if(access.error)throw new Error('catalog_unavailable');
 if(!access.data?.ativo||(access.data.expira_em&&new Date(access.data.expira_em).getTime()<=Date.now()))return {offers:[],updatedAt:new Date().toISOString()};
 async function read(table:string,columns:string,order='id'){
  const rows:Record<string,unknown>[]=[];
  for(let offset=0;offset<10000;offset+=500){
   const r=await db.from(table).select(columns).eq('empresa_id',OFFERS_COMPANY).order(order).order(table==='marketplace_warehouse_balances'?'warehouse_id':order).range(offset,offset+499).abortSignal(AbortSignal.timeout(12000));
   if(r.error)throw new Error('catalog_unavailable');
   rows.push(...r.data as unknown as Record<string,unknown>[]);if(r.data.length<500)return rows;
  }
  throw new Error('catalog_capacity'); // Never silently truncate inventory.
 }
 const [products,warehouses,balances,posts,links,listings,accounts,priceSettings]=await Promise.all([
  read('marketplace_products','id,empresa_id,name,pictures,price_cents,archived_at'),
  read('marketplace_warehouses','id,empresa_id,is_online,archived_at'),
  read('marketplace_warehouse_balances','empresa_id,warehouse_id,product_id,quantity','product_id'),
  read('marketplace_product_posts','id,empresa_id,product_id,revision,draft'),
  read('marketplace_product_links','id,empresa_id,product_id,connection_id,provider,provider_listing_id,status'),
  read('marketplace_listings','id,empresa_id,connection_id,provider,provider_listing_id,status,snapshot'),
  read('marketplace_connections','id,empresa_id,provider,status'),
  readPriceSettings(db,OFFERS_COMPANY),
 ]);
 return {offers:projectOffers({products,warehouses,balances,posts,links,listings,accounts} satisfies CatalogRows,priceSettings.percentages),updatedAt:new Date().toISOString()};
}
// Shared cache avoids repeating batch DB reads for every visitor. No stale offline copy.
export const readPublicOffers=unstable_cache(load,['saldao-aline-public-v3'],{revalidate:15,tags:['saldao-aline-offers']});
