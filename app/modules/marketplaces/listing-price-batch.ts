import {validateChanges,type ListingEditor} from './listing-editor.ts';
import type {LocalProductLink} from './services/local-product-model';
import type {ListingSnapshot} from './services/listing-model';

export type PriceTarget=Pick<LocalProductLink,'connection_id'|'provider_listing_id'|'provider'|'accountName'>;
export type PriceReview={target:PriceTarget;editor:ListingEditor|null;error:string};
export type PriceOutcome={target:PriceTarget;status:'confirmed'|'unchanged'|'pending'|'failed'|'not_sent';message:string;listing?:ListingSnapshot};
export type PriceRequester=(path:string,body?:unknown,signal?:AbortSignal,method?:string)=>Promise<unknown>;
const key=(target:PriceTarget)=>`${target.connection_id}:${target.provider_listing_id}`;

/** Vínculos oficiais do cadastro, independentemente do filtro da lista em tela. */
export function productPriceTargets(links:LocalProductLink[],provider:string):PriceTarget[]{
 const seen=new Set<string>();
 return links.filter(link=>{
  const status=link.status.toLowerCase(),snapshot=link.source_snapshot||{};
  if(link.provider!==provider||!link.connection_id||!link.provider_listing_id||['closed','deleted','excluded','unpublished','cancelled','canceled'].includes(status))return false;
  if([snapshot.substatus,snapshot.sub_status].some(value=>Array.isArray(value)&&value.includes('deleted')))return false;
  const id=key(link);if(seen.has(id))return false;seen.add(id);return true;
 });
}

export async function reviewProductPrices(request:PriceRequester,companyId:string,targets:PriceTarget[],signal?:AbortSignal):Promise<PriceReview[]>{
 return Promise.all(targets.map(async target=>{
  try{
   const editor=await request(`anunciados/editar?${new URLSearchParams({empresaId:companyId,connectionId:target.connection_id,id:target.provider_listing_id})}`,undefined,signal) as ListingEditor;
   if(editor?.id!==target.provider_listing_id||editor.provider!==target.provider||!editor.revision||editor.currency!=='BRL')throw new Error('Não foi possível conferir a identidade ou a moeda deste anúncio.');
   return {target,editor,error:editor.fields.price.editable?'':editor.fields.price.reason||'Preço indisponível para edição.'};
  }catch(failure){return {target,editor:null,error:failure instanceof Error?failure.message:'Não foi possível consultar o preço.'};}
 }));
}

export function priceReviewErrors(reviews:PriceReview[],price:number|null){
 return reviews.map(review=>review.error||(!review.editor?'Consulta pendente.':Object.values(validateChanges(review.editor,{price}).errors).join(' ')));
}

/** Preflight completo antes da primeira escrita. Cada PATCH mantém revisão, auditoria e
 * confirmação do conector existente. Falha/incerteza interrompe o lote sem repetição. */
export async function saveProductPrices(request:PriceRequester,companyId:string,reviews:PriceReview[],price:number,changed:(outcomes:PriceOutcome[])=>void=()=>{}){
 if(!reviews.length||priceReviewErrors(reviews,price).some(Boolean))throw new Error('Confira as permissões e o preço de todas as contas antes de salvar.');
 const fresh=await reviewProductPrices(request,companyId,reviews.map(row=>row.target));
 if(priceReviewErrors(fresh,price).some(Boolean)||fresh.some((row,index)=>row.editor?.revision!==reviews[index].editor?.revision))throw new Error('Os dados de uma conta mudaram. Recarregue os preços para conferir antes de salvar. O valor digitado foi preservado.');
 const outcomes:PriceOutcome[]=fresh.map(row=>({target:row.target,status:'not_sent',message:'Ainda não enviado.'}));
 for(let index=0;index<fresh.length;index++){
  const {target,editor}=fresh[index];
  if(editor!.values.price===price){outcomes[index]={target,status:'unchanged',message:'Já estava neste preço.'};changed([...outcomes]);continue;}
  try{
   const result=await request('anunciados/editar',{empresaId:companyId,connectionId:target.connection_id,id:target.provider_listing_id,revision:editor!.revision,requestKey:crypto.randomUUID(),changes:{price}},undefined,'PATCH') as {listing:ListingSnapshot;pending?:boolean;message?:string};
   if(result.listing?.id!==target.provider_listing_id)throw new Error('Não foi possível confirmar o anúncio atualizado. Confira no marketplace antes de repetir.');
   if(!result.pending&&(result.listing.currency!=='BRL'||result.listing.price!==price))throw new Error('O preço enviado não foi confirmado. Confira no marketplace antes de repetir.');
   outcomes[index]={target,status:result.pending?'pending':'confirmed',listing:result.listing,message:result.pending?(result.message||'Enviado; confirmação pendente. Não repita o envio.'):'Preço confirmado pelo marketplace.'};
  }catch(failure){outcomes[index]={target,status:'failed',message:failure instanceof Error?failure.message:'Não foi possível confirmar a atualização.'};}
  changed([...outcomes]);
  if(['pending','failed'].includes(outcomes[index].status))break;
 }
 return outcomes;
}
