import {DEFAULT_PRICE_PERCENTAGES,suggestedPriceCents,type PricePercentages} from '../marketplaces/price-settings.ts';
/** Public DTO: deliberately excludes company, account IDs, costs and internal notes. */
export type OfferLink={marketplace:string;url:string;priceCents:number};
export type Offer={id:string;name:string;description:string;image:string|null;condition:string;details:string;referenceCents:number|null;online:{quantity:number;links:OfferLink[]}|null;clearance:{quantity:number;priceCents:number|null}|null};
export const OFFERS_COMPANY='baa8c115-634a-41d3-9e2a-8666dce11454';
export const OFFERS_CONTACTS=[{label:'Contato 1',url:'https://wa.me/5511983044391'},{label:'Contato 2',url:'https://wa.me/5511987885611'}] as const;
export const OFFERS_GROUP='https://chat.whatsapp.com/HMoUgB9TLWvIm2kDWhiKjJ';
export const offerMoney=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export function positiveCents(value:unknown):number|null{return typeof value==='number'&&Number.isSafeInteger(value)&&value>0&&value<=999999999?value:null;}
export function publicImage(value:unknown):string|null{
 if(typeof value!=='string'||value.length>2048)return null;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='http2.mlstatic.com'||u.hostname.endsWith('.mlstatic.com')||u.hostname==='a-static.mlcdn.com.br')?u.href:null;}catch{return null;}
}
export type CatalogRows={products:Record<string,unknown>[];warehouses:Record<string,unknown>[];balances:Record<string,unknown>[];posts:Record<string,unknown>[];links:Record<string,unknown>[];listings:Record<string,unknown>[];accounts:Record<string,unknown>[]};
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max:number)=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').trim().slice(0,max):'';
const conditions:Record<string,string>={new:'Novo',used:'Usado',refurbished:'Recondicionado',damaged:'Avaria',detailed:'Com detalhe'};
export function projectOffers(rows:CatalogRows,percentages:PricePercentages=DEFAULT_PRICE_PERCENTAGES):Offer[]{
 // Scope is checked again here so a mistakenly broader reader cannot publish another profile.
 const scoped=(rs:Record<string,unknown>[])=>rs.filter(r=>r.empresa_id===OFFERS_COMPANY);
 const warehouses=scoped(rows.warehouses).filter(w=>!w.archived_at);
 if(warehouses.filter(w=>w.is_online===true).length!==1)throw new Error('catalog_stock_unavailable');
 const balances=scoped(rows.balances),posts=scoped(rows.posts),links=scoped(rows.links),listings=scoped(rows.listings),accounts=scoped(rows.accounts);
 const result:Offer[]=[];
 for(const product of scoped(rows.products)){
  if(product.archived_at)continue;
  const id=String(product.id),name=text(product.name,220);if(!name)continue;
  let onlineQuantity=0,clearanceQuantity=0;
  for(const balance of balances.filter(b=>b.product_id===id)){
   const warehouse=warehouses.find(w=>w.id===balance.warehouse_id);
   if(!warehouse||!Number.isSafeInteger(balance.quantity)||Number(balance.quantity)<1)continue;
   if(warehouse.is_online)onlineQuantity+=Number(balance.quantity);else clearanceQuantity+=Number(balance.quantity);
  }
  if(!onlineQuantity&&!clearanceQuantity)continue;
  const post=posts.filter(p=>p.product_id===id).sort((a,b)=>Number(b.revision)-Number(a.revision))[0],draft=obj(post?.draft);
  const reference=positiveCents(product.price_cents)||positiveCents(draft.originalPriceCents);
  const suggested=suggestedPriceCents(reference,percentages);
  const choices:OfferLink[]=[];
  for(const link of links.filter(l=>l.product_id===id&&l.status==='active')){
   const account=accounts.find(a=>a.id===link.connection_id&&a.provider===link.provider&&a.status==='connected');
   const listing=listings.find(l=>l.connection_id===link.connection_id&&l.provider===link.provider&&l.provider_listing_id===link.provider_listing_id&&l.status==='active');
   const snap=obj(listing?.snapshot),price=typeof snap.price==='number'?positiveCents(Math.round(snap.price*100)):null;
   if(!account||!listing||snap.id!==link.provider_listing_id||snap.status!=='active'||snap.currency!=='BRL'||!Number.isSafeInteger(snap.stock)||Number(snap.stock)<1||!price)continue;
   if(Array.isArray(snap.substatus)&&snap.substatus.includes('deleted'))continue;
   const url=typeof snap.permalink==='string'?snap.permalink:'';
   try{const u=new URL(url);const host=u.hostname;const valid=link.provider==='mercado_livre'?(host==='mercadolivre.com.br'||host.endsWith('.mercadolivre.com.br')):link.provider==='magalu'&&(host==='magazineluiza.com.br'||host.endsWith('.magazineluiza.com.br')||host==='magalu.com');if(u.protocol!=='https:'||u.username||u.password||!valid)continue;}catch{continue;}
   if(choices.some(c=>c.url===url))continue;
   choices.push({marketplace:link.provider==='mercado_livre'?'Mercado Livre':'Magalu',url,priceCents:price});
  }
  choices.sort((a,b)=>a.marketplace.localeCompare(b.marketplace,'pt-BR')||a.priceCents-b.priceCents||a.url.localeCompare(b.url));
  const pictures=Array.isArray(product.pictures)?product.pictures:[];
  result.push({id,name,description:text(draft.description||name,180),image:pictures.map(p=>publicImage(typeof p==='string'?p:obj(p).url)).find(Boolean)||null,condition:conditions[String(draft.condition)]||'Consulte a condição',details:text(draft.details||draft.damage,160),referenceCents:reference,online:onlineQuantity&&choices.length?{quantity:onlineQuantity,links:choices}:null,clearance:clearanceQuantity?{quantity:clearanceQuantity,priceCents:positiveCents(draft.priceCents)||positiveCents(suggested?.medium)}:null});
 }
 return result.filter(p=>p.online||p.clearance).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}

export function offerPermalink(id:string){const url=new URL('https://avantalab.com.br/ofertas/saldao-aline');url.searchParams.set('oferta',id);return url.href;}

/** Opens only the approved contacts with a draft message; never sends a message. */
export function offerContactUrl(contactUrl:string,offer?:Pick<Offer,'id'|'name'>){
 if(!OFFERS_CONTACTS.some(contact=>contact.url===contactUrl))throw new Error('Contato inválido.');
 const url=new URL(contactUrl);
 const message=offer?['Olá! Vim do Ofertas Saldão Aline e gostaria de fazer uma oferta para este produto:',offer.name,offerPermalink(offer.id)].join('\n\n'):'Olá! Vim do Ofertas Saldão Aline e gostaria de mais informações.';
 url.searchParams.set('text',message);return url.href;
}
