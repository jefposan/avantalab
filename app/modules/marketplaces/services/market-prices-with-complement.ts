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
import {priceModelCodes,priceSearchDetails,isProductOfferUrl} from '../price-offer-identity';

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
 const details=priceSearchDetails(input.attributes,input.productName);
 const variant=facts.filter(a=>!['BRAND','MODEL','MPN'].includes(a.id)).map(a=>a.value).join(' ');
 const identityName=[input.productName,variant].filter(Boolean).join(' ');
 const vendors=new Map<string,MarketPriceOffer>(),seenDomains=new Set<string>(),seenUrls=new Set<string>();
 let rounds=0,candidatesCount=0,stop:'limit'|'time'|'provider'|'target'='limit',failure='';
 const complementSignal=AbortSignal.any([AbortSignal.timeout(Math.max(1,80_000-(Date.now()-started))),...(control.signal?[control.signal]:[])]);
 const analyze=()=>summarizeMarketOffers({...ml,provider:'ml_web_search',checkedAt:new Date().toISOString()},[...ml.offers,...vendors.values()]);
 for(const round of [1,2] as const){
  control.signal?.throwIfAborted();
  if(complementSignal.aborted){stop='time';break;}
  const prior=analyze();
  if(prior.count>=ML_PRICE_PREFERRED_SELLERS){stop='target';break;}
  const blocked=new Set(seenDomains);
  try{
   rounds++;
   const web=await consultOpenAIWebPrices({ean:input.ean,productName:input.productName,brand:details.brand,model:details.model,variant,mode:'shopping_complement',searchRound:round,minimumOffers:ML_PRICE_PREFERRED_SELLERS-prior.count,excludedDomains:[...blocked].sort()},{...control,signal:complementSignal,includeFacts:false});
   control.signal?.throwIfAborted();
   // Fontes citadas sem preço no JSON também podem conter uma oferta primária.
   // Nunca entram na média sem o mesmo leitor independente de preço/variante/estoque.
   const codes=priceModelCodes(input.productName),normalized=(url:string)=>url.toLowerCase().replace(/[^a-z0-9]/g,'');
   const extra=(web.candidateUrls||[]).filter(isProductOfferUrl).sort((a,b)=>Number(codes.some(code=>normalized(b).includes(code)))-Number(codes.some(code=>normalized(a).includes(code))));
   const raw=[...new Set([...(web.sample?.offers||[]).map(o=>o.url),...extra])].filter(isProductOfferUrl).filter(url=>!mlHost(host(url))&&!blocked.has(host(url))&&!seenUrls.has(url)).slice(0,16);
   const candidates=raw;
   const deadline=AbortSignal.any([AbortSignal.timeout(20_000),complementSignal]);
   for(let i=0;i<candidates.length;i+=4){
    if(vendors.size>=8||deadline.aborted)break;
    const urls=candidates.slice(i,i+4);candidatesCount+=urls.length;
    const batch=await Promise.all(urls.map(async url=>{
     seenUrls.add(url);seenDomains.add(host(url));
     const page=await readPublicPricePage(url,deadline).catch(()=>null);
     return page?readOriginPriceEvidence(page.html,page.url,{ean:input.ean,productName:identityName}):null;
    }));
    for(const origin of batch){
     if(!origin)continue;
     const domain=host(origin.url);
     if(mlHost(domain)||blocked.has(domain)||vendors.has(domain)&&vendors.get(domain)!.price<=origin.price)continue;
     if(!vendors.has(domain)&&vendors.size>=8)continue;
     // A página primária manda no preço; conserva as provas das rodadas anteriores.
     vendors.set(domain,{id:'web:'+domain,sellerId:'web:'+domain,seller:domain,title:origin.title,price:origin.price,url:origin.url,source:'openai_web_search',origin});
    }
   }
   control.signal?.throwIfAborted();
  }catch(error){
   control.signal?.throwIfAborted();
   stop=complementSignal.aborted?'time':'provider';
   failure=error instanceof MarketplaceError?error.message:'O complemento com IA não foi concluído.';
   break; // Falha do provedor/limite não autoriza repetição paga automática.
  }
 }
 if(complementSignal.aborted)stop='time';
 const combined=analyze(),accepted=combined.offers.filter(o=>o.source==='openai_web_search').length;
 if(combined.count>=ML_PRICE_PREFERRED_SELLERS)stop='target';
 const rejected=Math.max(0,candidatesCount-vendors.size);
 const summary=`Pesquisa web: ${rounds} rodada(s), ${candidatesCount} candidata(s), ${accepted} oferta(s) complementar(es) no cálculo e ${rejected} descarte(s) por falta de comprovação ou duplicidade.`;
 const ending=stop==='target'?'A amostra preferencial foi alcançada.':stop==='time'?'O prazo da pesquisa foi atingido; foram preservadas as ofertas válidas.':stop==='provider'?failure:'As duas rodadas foram concluídas; foram usadas as ofertas válidas disponíveis.';
 const complement={status:stop==='provider'||stop==='time'?'unavailable' as const:'completed' as const,checkedAt:combined.checkedAt,accepted,rounds,candidates:candidatesCount,rejected,message:summary+' '+ending};
 if(!accepted)return {...ml,complement,message:ml.message+' '+complement.message};
 // O contrato de persistência considera completed quando há provas aproveitáveis,
 // mesmo se a continuação falhou; o texto mantém a falha explícita para o usuário.
 return {...combined,mlResearch:ml,complement:{...complement,status:'completed'},message:combined.status==='ready'?`Referência calculada com ${combined.count} ofertas: Mercado Livre e pesquisa web com IA, com preços conferidos nas lojas.`:'Os preços combinados exigem conferência. A referência anterior foi mantida.'};
}
