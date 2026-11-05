import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {productListingUrl} from '../product-listing-update';
import {objectValue} from './listing-model';
import type {ProductShoppingLink} from '../product-shopping-link';
import {accountDisplayName} from '@/app/marketplaces/account-identification';
import {validProductPostPrice} from '../product-shopping-link';
export async function readProductShoppingLinks(db:SupabaseClient,company:string,product:string):Promise<ProductShoppingLink[]>{
 const fail=()=>new MarketplaceError(503,'shopping_links_unavailable','Não foi possível consultar os anúncios para gerar o link. Tente novamente.');
 const links=await db.from('marketplace_product_links').select('connection_id,provider,provider_listing_id').eq('empresa_id',company).eq('product_id',product).eq('status','active').order('id').limit(501);
 if(links.error||(links.data?.length||0)>500)throw fail();
 if(!links.data?.length)return [];
 const ids=[...new Set(links.data.map(l=>l.connection_id))];
 const [accounts,listings,labels]=await Promise.all([
  db.from('marketplace_connections').select('id,provider,seller_name,seller_reference,status').eq('empresa_id',company).in('id',ids),
  db.from('marketplace_listings').select('connection_id,provider,provider_listing_id,status,snapshot').eq('empresa_id',company).in('connection_id',ids).in('provider_listing_id',links.data.map(l=>l.provider_listing_id)).order('id').limit(501),
  db.from('marketplace_connection_labels').select('connection_id,local_label').eq('empresa_id',company).in('connection_id',ids),
 ]);
 if(accounts.error||listings.error||labels.error||(listings.data?.length||0)>500)throw fail();
 const result:ProductShoppingLink[]=[];
 for(const link of links.data){
  const account=accounts.data?.find(a=>a.id===link.connection_id&&a.provider===link.provider&&a.status==='connected');
  const listing=listings.data?.find(l=>l.connection_id===link.connection_id&&l.provider===link.provider&&l.provider_listing_id===link.provider_listing_id&&l.status==='active');
  if(!account||!listing)continue;
  const snapshot=objectValue(listing.snapshot);
  if(snapshot.id!==link.provider_listing_id||snapshot.status!=='active'||Array.isArray(snapshot.substatus)&&snapshot.substatus.includes('deleted')||snapshot.currency!=='BRL'||typeof snapshot.stock!=='number'||!Number.isSafeInteger(snapshot.stock)||snapshot.stock<1)continue;
  const url=productListingUrl({provider:link.provider,source_snapshot:snapshot});
  const cents=typeof snapshot.price==='number'?Math.round(snapshot.price*100):0;
  if(!url||!Number.isSafeInteger(cents)||cents<=0)continue;
  result.push({id:`${account.id}:${link.provider_listing_id}`,accountId:account.id,accountName:accountDisplayName({...account,local_label:labels.data?.find(n=>n.connection_id===account.id)?.local_label}),marketplace:link.provider==='mercado_livre'?'Mercado Livre':'Magalu',listingId:link.provider_listing_id,url,priceCents:cents});
 }
 return result.sort((a,b)=>a.accountName.localeCompare(b.accountName,'pt-BR')||a.listingId.localeCompare(b.listingId));
}

export async function readPostMarketReference(db:SupabaseClient,company:string,product:string):Promise<number|null>{
 const r=await db.from('marketplace_price_consultations').select('market_price_cents').eq('empresa_id',company).eq('local_product_id',product).not('market_price_cents','is',null).gt('market_price_cents',0).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1).maybeSingle();
 if(r.error)throw new MarketplaceError(503,'post_reference_unavailable','Não foi possível conferir a média consultada. Tente novamente.');
 const value=r.data?.market_price_cents;
 return validProductPostPrice(value)?value:null;
}
