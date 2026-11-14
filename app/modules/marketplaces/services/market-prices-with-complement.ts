import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {consultMercadoLivreMarketPrices} from './mercadolivre-market-prices';
import {consultOpenAIWebPrices} from './openai-web-price-search';
import {readPublicPricePage} from './public-price-page';
import {readOriginPriceEvidence} from '../price-origin-evidence';
import {emptyMarketResearch,ML_PRICE_PREFERRED_SELLERS,summarizeMarketOffers,type MarketPriceResearch,type MarketPriceOffer} from '../market-price-research';
import type {SellerConnection} from './mercadolivre-management';
import type {PriceSearchControl} from './price-search-control';
import type {CatalogIdentification} from './mercadolivre-catalog';
import {MarketplaceError} from './management-access';
import {isValidEan} from './ean';
import {priceModelCodes} from '../price-offer-identity';

type Input={ean:string|null;productName:string;attributes?:Array<{id:string;name?:string;value:string}>;identification?:CatalogIdentification};
const host=(url:string)=>new URL(url).hostname.toLowerCase().replace(/^www\./,'');
const mlHost=(domain:string)=>/(^|\.)(mercadolivre\.com\.br|mercadolibre\.com|meli\.la)$/.test(domain);

/** ML primeiro. O complemento pago só começa com identidade conhecida e controle de custo. */
export async function consultMarketPricesWithComplement(db:SupabaseClient,connection:SellerConnection,input:Input,control?:PriceSearchControl):Promise<MarketPriceResearch>{
 const started=Date.now();
 let ml:MarketPriceResearch;
 try{ml=await consultMercadoLivreMarketPrices(db,connection,input,control?.signal);}
 catch(error){
  control?.signal?.throwIfAborted();
  // Falhas de isolamento/credenciais não são autorização para iniciar uma busca paga.
  if(!(error instanceof MarketplaceError)||!['ml_price_timeout','ml_price_response','provider_403','provider_404','provider_429','provider_500','provider_502','provider_503','provider_unavailable','invalid_response'].includes(error.code))throw error;
  ml=emptyMarketResearch(input.productName,'unavailable','O Mercado Livre não concluiu a pesquisa.');
 }
 if(!control||ml.count>=ML_PRICE_PREFERRED_SELLERS||['partial','review'].includes(ml.status))return ml;
 if(!isValidEan(input.ean||'')&&!priceModelCodes(input.productName).length)return ml;
 const facts=(input.attributes||[]).filter(a=>/^(BRAND|MODEL|MPN|VOLTAGE|OPERATING_VOLTAGE|COLOR|CAPACITY|TOTAL_CAPACITY)$/.test(a.id));
 const attr=(id:string)=>facts.find(a=>a.id===id)?.value;
 const variant=facts.filter(a=>!['BRAND','MODEL','MPN'].includes(a.id)).map(a=>a.value).join(' ');
 const identityName=[input.productName,variant].filter(Boolean).join(' ');
 const failed=(message:string):MarketPriceResearch=>({...ml,complement:{status:'unavailable',checkedAt:new Date().toISOString(),accepted:0,message},message:ml.message+' '+message});
 try{
  const complementSignal=AbortSignal.any([AbortSignal.timeout(Math.max(1,80_000-(Date.now()-started))),...(control.signal?[control.signal]:[])]);
  const web=await consultOpenAIWebPrices({ean:input.ean,productName:input.productName,brand:attr('BRAND'),model:attr('MODEL'),variant,mode:'shopping_complement'},{...control,signal:complementSignal,includeFacts:false});
  control.signal?.throwIfAborted();
  const vendors=new Map<string,MarketPriceOffer>();
  // Até oito origens, em dois lotes: sem cookies, JS ou tentativa de contornar bloqueios.
  const candidates=(web.sample?.offers||[]).slice(0,8).filter(offer=>!mlHost(host(offer.url)));
  const deadline=AbortSignal.any([AbortSignal.timeout(20_000),complementSignal]);
  for(let i=0;i<candidates.length;i+=4){
   const batch=await Promise.all(candidates.slice(i,i+4).map(async offer=>{
    const page=await readPublicPricePage(offer.url,deadline).catch(()=>null);
    return page?{offer,origin:readOriginPriceEvidence(page.html,page.url,{ean:input.ean,productName:identityName})}:null;
   }));
   for(const item of batch){
    if(!item?.origin)continue;
    const {origin}=item,domain=host(origin.url);
    if(mlHost(domain)||vendors.has(domain)&&vendors.get(domain)!.price<=origin.price)continue;
    // A página primária manda no preço, nunca o resumo desatualizado da IA.
    vendors.set(domain,{id:'web:'+domain,sellerId:'web:'+domain,seller:domain,title:origin.title,price:origin.price,url:origin.url,source:'openai_web_search',origin});
   }
  }
  control.signal?.throwIfAborted();
  const offers=[...vendors.values()];
  if(!offers.length)return {...ml,complement:{status:'completed',checkedAt:new Date().toISOString(),accepted:0,message:'A pesquisa com IA não acrescentou ofertas verificadas.'},message:ml.message+' A pesquisa com IA não acrescentou ofertas verificadas.'};
  const combined=summarizeMarketOffers({...ml,provider:'ml_web_search',checkedAt:new Date().toISOString()},[...ml.offers,...offers]);
  const accepted=combined.offers.filter(o=>o.source==='openai_web_search').length;
  if(!accepted)return {...ml,complement:{status:'completed',checkedAt:combined.checkedAt,accepted:0,message:'As ofertas complementares ficaram fora do cálculo.'}};
  return {...combined,mlResearch:ml,complement:{status:'completed',checkedAt:combined.checkedAt,accepted,message:'Pesquisa web com IA; preços conferidos nas lojas de origem.'},message:combined.status==='ready'?`Referência calculada com ${combined.count} ofertas: Mercado Livre e pesquisa web com IA, com preços conferidos nas lojas.`:'Os preços combinados exigem conferência. A referência anterior foi mantida.'};
 }catch(error){control.signal?.throwIfAborted();return failed(error instanceof MarketplaceError?error.message:'O complemento com IA não foi concluído. As ofertas válidas do ML foram preservadas.');}
}
