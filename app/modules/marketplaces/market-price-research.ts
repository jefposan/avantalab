import type {OriginPriceEvidence} from './price-origin-evidence';

/** Recibo público da consulta; nunca contém sessão, token ou dados do comprador. */
export type MarketPriceOffer = {id:string;sellerId:string;seller:string;title:string;price:number;url:string;source?:'openai_web_search';origin?:OriginPriceEvidence};
export type MarketPriceResearch = {
 provider:'mercado_livre'|'ml_web_search';status:'ready'|'insufficient'|'partial'|'identity_unconfirmed'|'unavailable'|'review';
 catalogId:string|null;productName:string;checkedAt:string;totalReported:number|null;fetchedCount:number;
 count:number;mean:number|null;median:number|null;minimum:number|null;maximum:number|null;
 exclusions:Record<string,number>;offers:MarketPriceOffer[];message:string;
 mlResearch?:MarketPriceResearch;complement?:{status:'completed'|'unavailable';checkedAt:string;accepted:number;message:string;rounds?:number;candidates?:number;rejected?:number};
};
export const ML_PRICE_PAGE_SIZE=20,ML_PRICE_MAX_OFFERS=200,ML_PRICE_MIN_SELLERS=1,ML_PRICE_PREFERRED_SELLERS=3;
const record=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const id=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?String(v):typeof v==='string'&&/^[1-9]\d{0,19}$/.test(v)?v:null;
const quantile=(v:number[],p:number)=>{const x=(v.length-1)*p,i=Math.floor(x);return v[i]+(v[Math.min(i+1,v.length-1)]-v[i])*(x-i);};
export function emptyMarketResearch(productName:string,status:MarketPriceResearch['status'],message:string):MarketPriceResearch {
 return {provider:'mercado_livre',status,catalogId:null,productName,checkedAt:new Date().toISOString(),totalReported:null,fetchedCount:0,count:0,mean:null,median:null,minimum:null,maximum:null,exclusions:{},offers:[],message};
}
/** Uma oferta por vendedor. Paginação completa é requisito para atualizar a média. */
export function analyzeMercadoLivreOffers(input:{catalogId:string;productName:string;rows:unknown[];total:number;complete:boolean;ownSellers:string[];checkedAt?:string}):MarketPriceResearch {
 const excluded:Record<string,number>={},reject=(why:string)=>{excluded[why]=(excluded[why]||0)+1;};
 const own=new Set(input.ownSellers),seen=new Set<string>(),vendors=new Map<string,MarketPriceOffer>();
 for(const raw of input.rows){
  const r=record(raw),item=typeof r.item_id==='string'?r.item_id:typeof r.id==='string'?r.id:'',seller=id(r.seller_id)||id(record(r.seller).id),price=r.price;
  if(!/^MLB\d{3,20}$/.test(item)||!seller||r.currency_id!=='BRL'||typeof price!=='number'||!Number.isFinite(price)||price<=0||price>=1_000_000||Math.abs(Math.round(price*100)-price*100)>1e-5){reject('dados_invalidos');continue;}
  if(seen.has(item)){reject('anuncio_repetido');continue;}seen.add(item);
  if(r.catalog_product_id&&r.catalog_product_id!==input.catalogId){reject('outro_produto');continue;}
  if(r.condition!=='new'||r.status&&r.status!=='active'||typeof r.available_quantity==='number'&&r.available_quantity<1){reject('condicao_ou_indisponivel');continue;}
  if(own.has(seller)){reject('nossas_contas');continue;}
  // O endpoint do catálogo pode omitir status/quantidade de terceiros. Ausente
  // não é estoque zero; a evidência é a oferta retornada na página do produto.
  const offer:MarketPriceOffer={id:item,sellerId:seller,seller:`Vendedor ${seller}`,title:input.productName,price:Math.round(price*100)/100,url:`https://www.mercadolivre.com.br/p/${input.catalogId}?pdp_filters=item_id%3A${item}`};
  const previous=vendors.get(seller);
  if(previous){reject('mesmo_vendedor');if(offer.price>=previous.price)continue;}
  vendors.set(seller,offer);
 }
 return summarizeMarketOffers({provider:'mercado_livre',catalogId:input.catalogId,productName:input.productName,checkedAt:input.checkedAt||new Date().toISOString(),totalReported:input.total,fetchedCount:input.rows.length,exclusions:excluded},[...vendors.values()],input.complete);
}
/** Mesma regra estatística para ML e amostra complementar; nunca média de médias. */
export function summarizeMarketOffers(base:Pick<MarketPriceResearch,'provider'|'catalogId'|'productName'|'checkedAt'|'totalReported'|'fetchedCount'|'exclusions'>,sample:MarketPriceOffer[],complete=true):MarketPriceResearch {
 const excluded={...base.exclusions},reject=(why:string)=>{excluded[why]=(excluded[why]||0)+1;};
 let offers=[...sample].sort((a,b)=>a.price-b.price||a.id.localeCompare(b.id));
 const all=offers.map(o=>Math.round(o.price*100));
 if(all.length>=4){
  const q1=quantile(all,.25),q3=quantile(all,.75),median=quantile(all,.5),spread=q3-q1;
  const low=spread>0?q1-1.5*spread:median*.5,high=spread>0?q3+1.5*spread:median*1.5;
  offers=offers.filter(o=>{const p=Math.round(o.price*100);if(p<low||p>high){reject('valor_extremo');return false;}return true;});
 }
 const values=offers.map(o=>Math.round(o.price*100)),count=values.length;
 const mean=count?Math.round(values.reduce((a,b)=>a+b,0)/count)/100:null,median=count?Math.round(quantile(values,.5))/100:null;
 const status:MarketPriceResearch['status']=!complete?'partial':count<ML_PRICE_MIN_SELLERS?'insufficient':values.at(-1)!>values[0]*3?'review':'ready';
 const message=status==='ready'?`Referência calculada com ${count} ${count===1?'vendedor':'vendedores'} do Mercado Livre.${count<ML_PRICE_PREFERRED_SELLERS?' A consulta completa encontrou poucas ofertas válidas; foram usadas todas as disponíveis.':''}`:status==='partial'?'A consulta não cobriu todas as ofertas do catálogo. A referência anterior foi mantida.':status==='review'?'Os preços do catálogo apresentam grande diferença. Confira as ofertas; a referência anterior foi mantida.':'Nenhuma oferta válida de outro vendedor foi encontrada. A referência anterior foi mantida.';
 return {...base,status,count,mean,median,minimum:count?values[0]/100:null,maximum:count?values.at(-1)!/100:null,exclusions:excluded,offers,message};
}
