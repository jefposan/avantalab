import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {identifyMercadoLivreCatalog,type CatalogIdentification} from './mercadolivre-catalog';
import {mlRequest,type SellerConnection} from './mercadolivre-management';
import {catalogGtins,validEan} from './catalog-publication';
import {objectValue} from './listing-model';
import {matchesPriceOffer,priceModelCodes} from '../price-offer-identity';
import {analyzeMercadoLivreOffers,emptyMarketResearch,ML_PRICE_MAX_OFFERS,ML_PRICE_PAGE_SIZE,type MarketPriceResearch} from '../market-price-research';

type Identity={ean:string|null;productName:string;attributes?:Array<{id:string;name?:string;value:string}>;identification?:CatalogIdentification};
const norm=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
function catalogMatches(input:Identity,identity:CatalogIdentification){
 const p=identity.product;if(identity.status!=='found'||!p||!/^MLB\d{3,20}$/.test(p.id)||p.raw.status!=='active'||Array.isArray(p.raw.children_ids)&&p.raw.children_ids.length)return false;
 const ean=validEan(input.ean),gtins=catalogGtins(p.raw.attributes);
 if(ean&&gtins.length&&!gtins.some(v=>v.replace(/^0+/,'')===ean.replace(/^0+/,'')))return false;
 if(!ean&&!priceModelCodes(input.productName).length)return false;
 const facts=p.attributes.map(a=>a.value).join(' ');
 if(!matchesPriceOffer(p.name,input.productName,facts))return false;
 for(const a of input.attributes||[]){
  if(!/^(BRAND|MODEL|MPN|VOLTAGE|OPERATING_VOLTAGE|COLOR|SIZE|CAPACITY|TOTAL_CAPACITY|STORAGE_CAPACITY|MEMORY_CAPACITY)$/.test(a.id)||!a.value.trim())continue;
  const target=p.attributes.find(x=>x.id===a.id);if(!target||norm(target.value)!==norm(a.value))return false;
 }
 return true;
}
/** Somente GETs do catálogo exato. Não busca /sites/search, não chama IA nem muda anúncios. */
export async function consultMercadoLivreMarketPrices(db:SupabaseClient,connection:SellerConnection,input:Identity,signal?:AbortSignal):Promise<MarketPriceResearch>{
 signal?.throwIfAborted();
 const deadline=Date.now()+40_000,check=()=>{signal?.throwIfAborted();if(Date.now()>deadline)throw new MarketplaceError(503,'ml_price_timeout','O Mercado Livre demorou para retornar as ofertas. A referência anterior foi mantida.');};
 const identification=input.identification||await identifyMercadoLivreCatalog(db,connection,{...(input.ean?{ean:input.ean}:{query:input.productName})});check();
 if(!catalogMatches(input,identification))return emptyMarketResearch(input.productName,'identity_unconfirmed',identification.status==='not_found'?'Produto não localizado no catálogo ativo do Mercado Livre. A referência anterior foi mantida.':'Não foi possível confirmar o mesmo modelo e variante no catálogo do Mercado Livre. A referência anterior foi mantida.');
 const product=identification.product!;
 const own=await db.from('marketplace_connections').select('seller_reference').eq('empresa_id',connection.empresa_id).eq('provider','mercado_livre');
 if(own.error)throw new MarketplaceError(503,'database','Não foi possível conferir as contas próprias antes de calcular a referência.');
 const ownSellers=[...new Set([connection.seller_reference,...(own.data||[]).map(x=>String(x.seller_reference||''))])];
 const rows:unknown[]=[],seen=new Set<string>();let total:number|null=null,complete=false;
 for(let offset=0;offset<ML_PRICE_MAX_OFFERS;offset+=ML_PRICE_PAGE_SIZE){
  check();const page=objectValue(await mlRequest(db,connection,`/products/${product.id}/items?${new URLSearchParams({limit:String(ML_PRICE_PAGE_SIZE),offset:String(offset)})}`,'GET'));check();
  const paging=objectValue(page.paging),reported=paging.total;
  if(!Array.isArray(page.results)||page.results.length>ML_PRICE_PAGE_SIZE||!Number.isSafeInteger(reported)||Number(reported)<0||paging.offset!==undefined&&paging.offset!==offset)throw new MarketplaceError(503,'ml_price_response','O Mercado Livre retornou uma página de ofertas incompleta. Nenhuma referência foi substituída.');
  if(total!==null&&total!==reported)break;total=Number(reported);
  let fresh=0;for(const raw of page.results){const r=objectValue(raw),key=String(r.item_id||r.id||'');if(key&&!seen.has(key)){seen.add(key);fresh++;}rows.push(raw);}
  if(offset+page.results.length>=total){complete=seen.size===total;break;}
  if(!page.results.length||!fresh||page.results.length<ML_PRICE_PAGE_SIZE)break;
 }
 return analyzeMercadoLivreOffers({catalogId:product.id,productName:product.name,rows,total:total??0,complete,ownSellers});
}

/** Reabre a última pesquisa sem executar uma consulta ao ML. */
export async function readProductMarketResearch(db:SupabaseClient,company:string,productId:string):Promise<MarketPriceResearch|null>{
 const {data,error}=await db.from('marketplace_product_price_researches').select('status,evidence').eq('empresa_id',company).eq('product_id',productId).order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(error){if(['42703','42P01','PGRST204'].includes(error.code))return null;throw new MarketplaceError(503,'price_research_database','Não foi possível conferir os resultados da última pesquisa.');}
 const e=objectValue(data?.evidence);if(!['mercado_livre','ml_web_search'].includes(String(e.provider))||!Array.isArray(e.offers)||typeof e.checkedAt!=='string')return null;
 return {...e,...(['failed','conflict'].includes(data?.status)?{status:'unavailable',message:'Esta pesquisa não foi aplicada. A referência do cadastro foi preservada.'}:{})} as unknown as MarketPriceResearch;
}
