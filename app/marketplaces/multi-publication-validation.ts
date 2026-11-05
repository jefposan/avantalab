import type {CatalogPreparation,PublicationForm} from '@/app/modules/marketplaces/services/catalog-publication';
export type DestinationReview={form:PublicationForm;prepared:CatalogPreparation;errors:Record<string,string>;costUnavailable?:boolean;sourceKey?:string;draftKey?:string;reviewKey?:string;message?:string;status?:'published'|'updated'|'pending'|'failed'};
export function destinationErrors(row:DestinationReview){
 const errors={...row.errors};
 if(row.form.shippingMode==='me2'){
  if(!row.form.shippingQuoteToken)errors.freeShipping='Confira a estimativa de frete desta conta antes de publicar.';
  else if(row.costUnavailable&&!row.form.acknowledgeUnavailableShippingCost)errors.shippingAcknowledgement='Confirme a ciência do custo de envio indisponível ou atualize a estimativa.';
 }
 return errors;
}
/** IDs do anúncio, nunca o EAN de pesquisa. Campos compartilhados ficam no formulário principal. */
export function destinationFieldId(accountId:string,field:string){
 if(['ean','attribute:GTIN','attribute:EAN'].includes(field))return 'new-local-ean';
 if(field==='title')return 'new-title';
 if(['productId','preparation','form'].includes(field))return `destination-${accountId}-review`;
 if(field==='pictureUrl')return 'new-photos';
 if(['stock','categoryId','description','listingType','shippingMode','condition','warrantyType','warrantyTime','attributes'].includes(field)||field.startsWith('attribute:'))return `new-${field}`;
 return `destination-${accountId}-${field==='shippingAcknowledgement'?'shipping-acknowledgement':field}`;
}
export function focusPublicationField(id:string,root:HTMLElement|null){
 const element=root?.ownerDocument.getElementById(id);
 if(!element)return;
 element.closest('details')?.setAttribute('open','');
 element.scrollIntoView({block:'center',behavior:'auto'});
 element.focus({preventScroll:true});
}
/** Leitura somente; respostas de seleção/rascunho antigos nunca são aplicadas. */
export async function validateDestinations<T>(ids:string[],signal:AbortSignal,read:(id:string,signal:AbortSignal)=>Promise<T>,result:(id:string,value:T|undefined,error?:unknown)=>void){
 let cursor=0;
 async function worker(){while(cursor<ids.length&&!signal.aborted){const id=ids[cursor++];try{const value=await read(id,AbortSignal.any([signal,AbortSignal.timeout(50_000)]));if(!signal.aborted)result(id,value);}catch(error){if(!signal.aborted)result(id,undefined,error);}}}
 await Promise.all(Array.from({length:Math.min(2,ids.length)},worker));
}
