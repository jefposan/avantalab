import type {marketplaceClientRequest} from './Anunciados';
import type {LocalProductLink} from '@/app/modules/marketplaces/services/local-product-model';
import {productListingUrl} from '@/app/modules/marketplaces/product-listing-update';
/** O limite inclui a obtenção da sessão, mesmo quando ela não respeita AbortSignal. */
export async function loadProductListingLink(request:typeof marketplaceClientRequest,companyId:string,link:LocalProductLink,signal:AbortSignal,timeoutMs=20_000){
 let timer:ReturnType<typeof setTimeout>|undefined;
 let onAbort:(()=>void)|undefined;
 const controller=new AbortController();
 try{
  const cancelled=new Promise<never>((_,reject)=>{
   onAbort=()=>{controller.abort();reject(new Error('Consulta do link cancelada.'));};
   if(signal.aborted)onAbort();else signal.addEventListener('abort',onAbort,{once:true});
   timer=setTimeout(()=>{controller.abort();reject(new Error('A consulta do link demorou mais que o esperado. Tente carregar novamente; seus dados foram mantidos.'));},timeoutMs);
  });
  const result=await Promise.race([Promise.resolve().then(()=>{if(signal.aborted)throw Error('Consulta cancelada.');return request(`anunciados/link?${new URLSearchParams({empresaId:companyId,connectionId:link.connection_id,id:link.provider_listing_id})}`,undefined,controller.signal);}),cancelled]);
  const url=productListingUrl({provider:link.provider,source_snapshot:{permalink:result.permalink}});
  if(result.id!==link.provider_listing_id||result.connectionId!==link.connection_id||!url)throw new Error('Não foi possível confirmar o link deste anúncio e desta conta.');
  return url;
 }finally{clearTimeout(timer);if(onAbort)signal.removeEventListener('abort',onAbort);}
}
