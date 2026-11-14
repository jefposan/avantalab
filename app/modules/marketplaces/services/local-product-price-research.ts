import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {getLocalProduct} from './local-products';
import {objectValue,uuidIsValid} from './listing-model';
import {resolveMercadoLivreConnection} from './mercadolivre-management';
import {consultMercadoLivreMarketPrices,readProductMarketResearch} from './mercadolivre-market-prices';
import {readPersistedReference} from './price-persistence';
import {emptyMarketResearch,type MarketPriceResearch,type MarketPriceOffer} from '../market-price-research';
type ResearchResult={status:string;claimed?:boolean;price_cents:number|null;offers_count:number};
async function command(db:SupabaseClient,company:string,actor:string,product:string,revision:number,key:string,action:string,offers:MarketPriceOffer[]=[],evidence?:MarketPriceResearch,error?:string){
 const result=await db.rpc('marketplace_ml_price_research',{p_empresa_id:company,p_actor_id:actor,p_product_id:product,p_revision:revision,p_request_key:key,p_action:action,p_offers:offers,p_evidence:evidence||{},p_error:error||null});
 if(result.error)throw new MarketplaceError(result.error.code==='P0001'?409:503,'price_research_database',result.error.code==='P0001'?'O cadastro ou a pesquisa mudou. Atualize a lista antes de tentar novamente.':'Não foi possível registrar a pesquisa do Mercado Livre. Confira a atualização do banco antes de repetir.');
 const data=objectValue(result.data);if(typeof data.status!=='string')throw new MarketplaceError(503,'price_research_invalid','A pesquisa retornou um estado incompleto. Reabra o produto.');return data as ResearchResult;
}
function outcome(result:ResearchResult,evidence:MarketPriceResearch|null,hasReference:boolean){
 if(['busy','pending'].includes(result.status))throw new MarketplaceError(409,'price_research_busy','Uma pesquisa deste produto já está em andamento. Aguarde e atualize a lista.');
 if(result.status==='limited')throw new MarketplaceError(429,'price_research_limited','Aguarde um minuto antes de iniciar outra pesquisa.');
 if(result.status==='conflict')throw new MarketplaceError(409,'price_research_conflict','O produto foi alterado durante a pesquisa. A referência não foi substituída. Reabra o produto.');
 if(result.status==='failed')throw new MarketplaceError(503,'price_research_failed','A consulta ao Mercado Livre não foi concluída. A referência foi mantida.');
 if(!['updated','no_offers'].includes(result.status))throw new MarketplaceError(503,'price_research_invalid','Não foi possível confirmar a atualização. Reabra o produto.');
 return {status:result.status,priceCents:result.price_cents,offersCount:result.offers_count,marketResearch:evidence,message:result.status==='updated'?'Referência atualizada pelo Mercado Livre. Estoque e anúncios preservados.':evidence?.status==='identity_unconfirmed'?evidence.message:evidence?.status==='partial'?'Pesquisa parcial no Mercado Livre. A referência anterior foi mantida.':evidence?.status==='review'?'Os preços exigem conferência. A referência anterior foi mantida.':hasReference?'Amostra insuficiente no Mercado Livre. A referência anterior foi mantida.':'Amostra insuficiente no Mercado Livre. Informe uma referência manual ou consulte novamente mais tarde.'};
}
export async function researchLocalProductPrice(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>,signal?:AbortSignal){
 if(!uuidIsValid(input.productId)||!uuidIsValid(input.requestKey)||!Number.isSafeInteger(input.revision)||Number(input.revision)<1)throw new MarketplaceError(400,'invalid_price_research','Atualize o cadastro antes de pesquisar a referência.');
 const product=await getLocalProduct(db,company,input.productId),revision=Number(input.revision),key=input.requestKey;
 const claimed=await command(db,company,actor,product.id,revision,key,'claim');
 if(!claimed.claimed){const result=outcome(claimed,await readProductMarketResearch(db,company,product.id),product.price_cents!=null);if(result.status==='updated'&&result.priceCents)await readPersistedReference(db,company,product.id,result.priceCents);return result;}
 let evidence:MarketPriceResearch;
 try{const connection=await resolveMercadoLivreConnection(db,company,input.connectionId);evidence=await consultMercadoLivreMarketPrices(db,connection,{ean:product.ean,productName:product.name,attributes:product.attributes},signal);signal?.throwIfAborted();}
 catch(error){await command(db,company,actor,product.id,revision,key,'fail',[],emptyMarketResearch(product.name,'unavailable','A consulta ao Mercado Livre não foi concluída. A referência anterior foi mantida.'),error instanceof MarketplaceError?error.code:'research_failed');throw error;}
 const completed=outcome(await command(db,company,actor,product.id,revision,key,'complete',evidence.status==='ready'?evidence.offers:[],evidence),evidence,product.price_cents!=null);
 if(completed.status==='updated'&&completed.priceCents)await readPersistedReference(db,company,product.id,completed.priceCents);return completed;
}
