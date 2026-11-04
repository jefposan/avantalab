import 'server-only';
import type {WebPriceOffer} from './openai-web-price-search';
import {readPublicPricePage} from './public-price-page';
import {readOriginPriceEvidence} from '../price-origin-evidence';
import {PRICE_REFERENCE_OFFER_LIMIT} from './price-reference';
import {isProductOfferUrl,priceModelCodes} from '../price-offer-identity';

type OriginCandidate=Pick<WebPriceOffer,'url'> & Partial<Omit<WebPriceOffer,'url'>>;

/** Prioriza produto/modelo e diversidade de lojas, não a ordem de citações da IA. */
export function selectOriginCandidates(offers:OriginCandidate[],input:{ean:string|null;productName:string}):OriginCandidate[]{
 const compact=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const models=priceModelCodes(input.productName),seen=new Set<string>();
 const ranked=offers.flatMap((offer,index)=>{
  if(!isProductOfferUrl(offer.url))return [];
  const url=new URL(offer.url);url.hash='';
  for(const key of [...url.searchParams.keys()])if(/^(utm_|gclid$|fbclid$|srsltid$)/i.test(key))url.searchParams.delete(key);
  if(seen.has(url.href)||/\.(?:pdf|jpe?g|png|webp)(?:$|\?)/i.test(url.pathname)||/(?:^|\/)(?:manuals?|uploads?|downloads?|blog|noticias|marcas|melhor|comments|watch)(?:\/|$)/i.test(url.pathname))return [];
  seen.add(url.href);
  let decoded=url.pathname;try{decoded=decodeURIComponent(decoded);}catch{/* URL malformada não pode derrubar a pesquisa. */}
  const path=compact(decoded);
  const score=(input.ean&&path.includes(input.ean)?8:0)+models.filter(model=>path.includes(model)).length*4+(/\/(?:p|produto|products?|dp)\//i.test(url.pathname)||/\/(?:p|[^/]+\.html)$/i.test(url.pathname)?3:0)+(offer.title?1:0);
  return [{offer:{...offer,url:url.href},shop:url.hostname.replace(/^(?:www|m|secure\d*)\./,''),score,index}];
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
 const selected:OriginCandidate[]=[],shops=new Set<string>();
 // Uma primeira oportunidade para cada loja evita gastar todas as vagas em
 // espelhos, vitrines ou anúncios de um mesmo marketplace bloqueado.
 for(const item of ranked)if(!shops.has(item.shop)){selected.push(item.offer);shops.add(item.shop);if(selected.length===PRICE_REFERENCE_OFFER_LIMIT)return selected;}
 for(const item of ranked)if(!selected.includes(item.offer)){selected.push(item.offer);if(selected.length===PRICE_REFERENCE_OFFER_LIMIT)break;}
 return selected;
}

export async function verifyPriceOrigins(offers:OriginCandidate[],input:{ean:string|null;productName:string},signal?:AbortSignal):Promise<WebPriceOffer[]>{
  const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(12_000)]):AbortSignal.timeout(12_000);
  const candidates=selectOriginCandidates(offers,input);
  const checked=await Promise.all(candidates.map(async offer=>{
    try{
      const page=await readPublicPricePage(offer.url,deadline);
      if(!page)return null;
      const evidence=readOriginPriceEvidence(page.html,page.url,input);
      return evidence?{...offer,seller:offer.seller||new URL(evidence.url).hostname,title:evidence.title,price:evidence.price,url:evidence.url,origin:evidence}:null;
    }catch{return null;}
  }));
  signal?.throwIfAborted();
  return checked.filter((offer):offer is NonNullable<typeof offer>=>offer!==null);
}
