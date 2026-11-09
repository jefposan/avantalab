import {attributeChanges,pictureId,pictureUrl,type ContentAttribute} from '@/app/modules/marketplaces/listing-content';
import {commonKinds,type CommonProductEditor,type CommonTarget,type ProductCommonKind} from '@/app/modules/marketplaces/product-common-content';
import type {marketplaceClientRequest} from './Anunciados';
import {perAccountPictureEditor} from '@/app/modules/marketplaces/picture-account-permissions';
import {commonListingRevisionState} from '@/app/modules/marketplaces/listing-edit-revision';
import {reviewProductPrices,priceReviewErrors,saveProductPrices,type PriceReview} from '@/app/modules/marketplaces/listing-price-batch';

export type ReviewEditors=Record<ProductCommonKind,CommonProductEditor>;
export type ListingReviewDraft={details:Record<string,string>;attributes:Record<string,string>;pictures:{id:string;url:string}[]};
export type ReviewChange={kind:ProductCommonKind;values:Record<string,string>|string[];appendPictures?:boolean;pictureTargets?:string[]};
export type ReviewResult={kind:ProductCommonKind|'price';connectionId:string;id:string;status:'confirmed'|'failed'|'not_sent';message:string};
export type ReviewPricing={reviews:PriceReview[];price:number};
export type ReviewSource={companyId:string;productId:string;sourceConnectionId:string;sourceId:string};
/** Detectado antes de qualquer PATCH: permite nova leitura sem repetir escrita. */
export class ReviewPreflightConflict extends Error {}
export type AIReviewProposal={productId:string;sourceConnectionId:string;sourceId:string;revisions:Record<ProductCommonKind,string>;suggestions:{field:string;name:string;value:string;source:string;sourceUrl?:string;evidence?:string}[];description:string;descriptionSource:string;pictures:{id:string;url:string}[];pending:string[];warning?:string};
export const fieldValue=(a:ContentAttribute)=>['list','boolean'].includes(a.type)?a.valueId||'':a.value;
export function initialReviewDraft(editors:ReviewEditors):ListingReviewDraft{return {details:Object.fromEntries(editors.details.attributes.map(a=>[a.id,fieldValue(a)])),attributes:Object.fromEntries(editors.attributes.attributes.map(a=>[a.id,fieldValue(a)])),pictures:editors.pictures.pictures.map(p=>({...p}))};}
export function recoverReviewDraft(before:ReviewEditors,draft:ListingReviewDraft,current:ReviewEditors){
 const recovered=initialReviewDraft(current),notes:string[]=[],blocked:string[]=[];
 if(commonKinds.some(kind=>before[kind].scopeHash!==current[kind].scopeHash))blocked.push('Os anúncios vinculados mudaram. Confira os destinos antes de iniciar uma nova revisão.');
 for(const change of reviewChanges(before,draft)){
  if(change.kind==='pictures'){
   const oldIds=new Set(before.pictures.pictures.map(p=>p.id));
   const additions=draft.pictures.filter(p=>!oldIds.has(p.id));
   recovered.pictures=[...recovered.pictures,...additions.filter(p=>!recovered.pictures.some(old=>old.id===p.id))];
   if(additions.length&&(!current.pictures.pictureAppendTargets?.length&&current.pictures.reason||recovered.pictures.length>current.pictures.maxPictures))blocked.push('As fotos preparadas foram preservadas, mas as permissões ou o limite de fotos mudaram.');
   if(!before.pictures.pictureAppendTargets&&JSON.stringify(draft.pictures.map(p=>p.id))!==JSON.stringify([...before.pictures.pictures,...additions].map(p=>p.id))){
    if(JSON.stringify(before.pictures.pictures)===JSON.stringify(current.pictures.pictures))recovered.pictures=draft.pictures.map(p=>({...p}));
    else blocked.push('A galeria mudou durante a revisão. Confira as fotos atuais antes de reorganizá-las.');
   }
   continue;
  }
  for(const [id,value]of Object.entries(change.values)){
   recovered[change.kind][id]=value;
   const rule=current[change.kind].attributes.find(a=>a.id===id),old=before[change.kind].attributes.find(a=>a.id===id),name=rule?.name||old?.name||id;
   if(!rule?.editable){blocked.push(`${name}: sua escolha foi preservada, mas o campo não está mais liberado. ${rule?.reason||''}`);continue;}
   const values=(editor:ReviewEditors)=>editor[change.kind].reviewTargets?.map(t=>[t.connectionId,t.id,change.kind==='details'?t.details?.values[({TITLE:'title',DESCRIPTION:'description',LISTING_TYPE:'listingType'} as const)[id as 'TITLE'|'DESCRIPTION'|'LISTING_TYPE']]:t.content?.attributes.find(a=>a.id===id)?.valueId||t.content?.attributes.find(a=>a.id===id)?.value]);
   if(JSON.stringify(values(before))!==JSON.stringify(values(current))){const actual=fieldValue(rule);notes.push(`${name}: o valor atual mudou para “${actual.slice(0,160)}${actual.length>160?'…':''}”. Sua escolha foi mantida no rascunho para conferência.`);}
  }
 }
 return {draft:recovered,notes,blocked};
}
export function reviewChanges(editors:ReviewEditors,draft:ListingReviewDraft):ReviewChange[]{
 const changes:ReviewChange[]=[];
 for(const kind of ['details','attributes'] as const){const values=Object.fromEntries(editors[kind].attributes.filter(a=>a.editable&&draft[kind][a.id]!==fieldValue(a)).map(a=>[a.id,draft[kind][a.id]??'']));if(Object.keys(values).length)changes.push({kind,values});}
 if(JSON.stringify(draft.pictures.map(p=>p.id))!==JSON.stringify(editors.pictures.pictures.map(p=>p.id))){const append=editors.pictures.pictureAppendTargets;const values=draft.pictures.filter(p=>!append||!editors.pictures.pictures.some(old=>old.id===p.id)).map(p=>p.id);if(values.length)changes.push({kind:'pictures',values,...(append?{appendPictures:true,pictureTargets:append}:{})});}
 return changes;
}
export function validateReviewDraft(editors:ReviewEditors,draft:ListingReviewDraft){
 const errors:Record<string,string>={};
 for(const change of reviewChanges(editors,draft)){
  if(change.kind==='pictures'){if(!draft.pictures.length||draft.pictures.length>editors.pictures.maxPictures||draft.pictures.some(p=>!pictureId(p.id)||!pictureUrl(p.url))||new Set(draft.pictures.map(p=>p.id)).size!==draft.pictures.length)errors.pictures=`Mantenha de 1 a ${editors.pictures.maxPictures} fotos válidas, sem repetição.`;continue;}
  for(const [id,value]of Object.entries(change.values)){
   const rule=editors[change.kind].attributes.find(a=>a.id===id)!;
   if(!value.trim()||value.length>rule.maxLength)errors[`${change.kind}:${id}`]=`${rule.name}: preencha com até ${rule.maxLength} caracteres. Valores existentes não podem ser apagados.`;
   else if(change.kind==='attributes')try{attributeChanges({...editors.attributes,attributes:editors.attributes.attributes.map(a=>({...a,value:'\u0000'}))},{[id]:value});}catch(e){errors[`attributes:${id}`]=e instanceof Error?e.message:'Valor inválido.';}
   else if(id==='DESCRIPTION'&&/<[^>]*>/.test(value))errors[`details:${id}`]='Descrição: use texto, sem HTML.';
   else if(rule.options.length&&!rule.options.some(o=>o.id===value))errors[`details:${id}`]=`${rule.name}: selecione uma opção permitida.`;
  }
 }
 return errors;
}
export function draftCoverage(editors:ReviewEditors,draft:ListingReviewDraft){
 const fields=(['details','attributes'] as const).flatMap(kind=>editors[kind].attributes.filter(a=>a.editable).map(a=>({filled:!!draft[kind][a.id]?.trim()&&!validateReviewDraftField(editors,kind,a,draft[kind][a.id]),id:`${kind}:${a.id}`})));
 if(!editors.pictures.reason)fields.push({id:'pictures',filled:draft.pictures.length>0});const filled=fields.filter(f=>f.filled).length,total=fields.length;
 return {filled,total,score:total?Math.round(filled/total*100):null};
}
function validateReviewDraftField(editors:ReviewEditors,kind:'details'|'attributes',rule:ContentAttribute,value:string){
 if(!value||value.length>rule.maxLength)return true;
 if(['list','boolean'].includes(rule.type))return !rule.options.some(o=>o.id===value);
 if(kind==='details')return rule.id==='DESCRIPTION'&&/<[^>]*>/.test(value);
 try{attributeChanges({...editors.attributes,attributes:[{...rule,value:'\u0000'}]},{[rule.id]:value});return false;}catch{return true;}
}
export function mergeAIReview(editors:ReviewEditors,draft:ListingReviewDraft,proposal:AIReviewProposal){
 const next:ListingReviewDraft={details:{...draft.details},attributes:{...draft.attributes},pictures:[...draft.pictures]},accepted:string[]=[];
 for(const suggestion of proposal.suggestions){const rule=editors.attributes.attributes.find(a=>a.id===suggestion.field);if(rule?.editable&&!next.attributes[rule.id]?.trim()&&!validateReviewDraftField(editors,'attributes',rule,suggestion.value)){next.attributes[rule.id]=suggestion.value;accepted.push(rule.id);}}
 const description=editors.details.attributes.find(a=>a.id==='DESCRIPTION');
 if(description?.editable&&!next.details.DESCRIPTION?.trim()&&proposal.description&&!validateReviewDraftField(editors,'details',description,proposal.description)){next.details.DESCRIPTION=proposal.description;accepted.push('DESCRIPTION');}
 const photos=proposal.pictures.filter(p=>pictureId(p.id)&&pictureUrl(p.url));
 if(!editors.pictures.reason&&(!editors.pictures.restrictions?.length||!!editors.pictures.pictureAppendTargets?.length)&&photos.length>draft.pictures.length&&JSON.stringify(draft.pictures.map(p=>p.id))===JSON.stringify(editors.pictures.pictures.map(p=>p.id))&&draft.pictures.every(p=>photos.some(v=>v.id===p.id))&&photos.length<=editors.pictures.maxPictures&&new Set(photos.map(p=>p.id)).size===photos.length){next.pictures=photos;accepted.push('pictures');}
 return {draft:next,accepted};
}
export async function readReviewSection(source:ReviewSource,kind:ProductCommonKind,request:typeof marketplaceClientRequest,signal?:AbortSignal){
 const result=await request(`produtos/qualidade?${new URLSearchParams({empresaId:source.companyId,productId:source.productId,sourceConnectionId:source.sourceConnectionId,sourceId:source.sourceId,kind,localDraft:'true',includeTargets:'true'})}`,undefined,signal) as CommonProductEditor;
 if(result.productId!==source.productId||result.connectionId!==source.sourceConnectionId||result.id!==source.sourceId||!result.scopeHash||!result.revision||!Array.isArray(result.attributes)||!Array.isArray(result.pictures)||!result.reviewTargets?.length)throw Error('O contexto completo dos anúncios não foi confirmado. Reabra a revisão.');
 // Permissões reais, não a liberação do antigo rascunho local.
 const detailFields={TITLE:'title',DESCRIPTION:'description',LISTING_TYPE:'listingType'} as const;
 if(kind==='details')result.attributes=result.attributes.map(a=>{const field=detailFields[a.id as keyof typeof detailFields],blocked=field?result.reviewTargets!.find(t=>t.details?.fields[field]?.editable===false):undefined;return blocked?{...a,editable:false,reason:blocked.details!.fields[field].reason||'Campo não editável em todos os destinos.'}:a;});
 if(kind==='pictures')return perAccountPictureEditor(result);
 if(kind==='attributes'){const blocked=result.reviewTargets.find(t=>t.content?.reason)?.content?.reason;if(blocked){result.reason=blocked;result.attributes=result.attributes.map(a=>({...a,editable:false,reason:a.reason||blocked}));}}
 return result;
}
export async function readReviewEditors(source:ReviewSource,request:typeof marketplaceClientRequest,signal:AbortSignal){
 const editors={} as ReviewEditors;
 for(const kind of commonKinds)editors[kind]=await readReviewSection(source,kind,request,AbortSignal.any([signal,AbortSignal.timeout(55_000)]));
 if(commonKinds.some(k=>editors[k].scopeHash!==editors.attributes.scopeHash))throw Error('Os vínculos mudaram durante a leitura. Recarregue a revisão.');
 return editors;
}
export async function readReviewPrices(source:ReviewSource,editors:ReviewEditors,request:typeof marketplaceClientRequest,signal:AbortSignal){
 const targets=editors.details.reviewTargets||[];
 return reviewProductPrices(request,source.companyId,targets.map(target=>({connection_id:target.connectionId,provider_listing_id:target.id,provider:'mercado_livre'})),signal);
}
/** last_updated/revision pode mudar por uma seção enviada por nós; os valores e
 * permissões da próxima seção NÃO podem mudar. Compara todos os destinos. */
export function sectionBaseline(editor:CommonProductEditor,kind:ProductCommonKind){
 const attributes=editor.attributes.map(a=>({...a}));
 const targets=editor.reviewTargets?.map(t=>({connectionId:t.connectionId,id:t.id,affectedIds:t.affectedIds,...(kind==='details'?{state:t.details?commonListingRevisionState(t.connectionId,{},t.details):undefined}:{attributes:kind==='attributes'?t.content?.attributes:undefined,pictures:kind==='pictures'?t.content?.pictures:undefined,reason:t.content?.reason,maxPictures:t.content?.maxPictures})}));
 return JSON.stringify({scope:editor.scopeHash,attributes:kind==='pictures'?undefined:attributes,maxPictures:editor.maxPictures,restrictions:editor.restrictions,targets});
}
type Prepared={scopeHash:string;parts:CommonTarget[];blocked?:{connectionId:string;id:string;message:string}[]};
/** Sem retry. Valida TODAS as seções antes de enviar; interrupção/resultado
 * incerto bloqueia os próximos destinos e exige nova leitura explícita. */
export async function publishListingReview(source:ReviewSource,editors:ReviewEditors,draft:ListingReviewDraft,request:typeof marketplaceClientRequest,onProgress:(r:ReviewResult[])=>void,pricing?:ReviewPricing){
 const errors=validateReviewDraft(editors,draft);if(Object.keys(errors).length)throw Error(Object.values(errors).join(' '));
 const changes=reviewChanges(editors,draft);if(!changes.length&&!pricing)throw Error('Nenhuma alteração para publicar.');
 if(pricing){const invalid=priceReviewErrors(pricing.reviews,pricing.price);if(!pricing.reviews.length||invalid.some(Boolean))throw Error(invalid.filter(Boolean).join(' ')||'Confira os preços de todas as contas.');}
 const common={empresaId:source.companyId,productId:source.productId,sourceConnectionId:source.sourceConnectionId,sourceId:source.sourceId};
 const results:ReviewResult[]=[];
 async function review(change:ReviewChange,editor:CommonProductEditor):Promise<Prepared>{
  const checked=await request('produtos/qualidade',{...common,...change,localDraft:true,revision:editor.revision},AbortSignal.timeout(60_000)) as Prepared;
  if(checked.scopeHash!==editors[change.kind].scopeHash||!Array.isArray(checked.parts))throw Error('O alcance mudou. Recarregue antes de publicar.');
  if(checked.blocked?.length){for(const b of checked.blocked)results.push({...b,kind:change.kind,status:'not_sent'});onProgress([...results]);throw Error('Validação bloqueada. Nenhum novo envio foi iniciado nesta etapa. Confira os destinos e as restrições abaixo.');}
  return checked;
 }
 const prepared=new Map<ProductCommonKind,Prepared>();
 for(const change of changes){const current=await readReviewSection(source,change.kind,request,AbortSignal.timeout(55_000));if(current.scopeHash!==editors[change.kind].scopeHash||current.revision!==editors[change.kind].revision)throw new ReviewPreflightConflict('Os dados atuais precisam ser reconferidos. Suas escolhas serão preservadas.');prepared.set(change.kind,await review(change,current));}
 let sent=false;
 if(pricing){
  // Mesmo quando só há preço, conferir o conjunto oficial completo, sem o filtro da lista.
  const current=await readReviewSection(source,'details',request,AbortSignal.timeout(55_000));
  const identities=(targets:{connectionId:string;id:string}[])=>targets.map(t=>`${t.connectionId}:${t.id}`).sort().join('|');
  if(current.scopeHash!==editors.details.scopeHash||identities(current.reviewTargets||[])!==identities(pricing.reviews.map(row=>({connectionId:row.target.connection_id,id:row.target.provider_listing_id}))))throw new ReviewPreflightConflict('Os anúncios vinculados mudaram. Confira novamente os destinos.');
  const outcomes=await saveProductPrices((path,body,signal,method)=>request(path,body,signal||AbortSignal.timeout(65_000),method),source.companyId,pricing.reviews,pricing.price,rows=>{
   const prices:ReviewResult[]=rows.map(row=>({kind:'price',connectionId:row.target.connection_id,id:row.target.provider_listing_id,status:row.status==='confirmed'||row.status==='unchanged'?'confirmed':row.status==='not_sent'?'not_sent':'failed',message:row.message}));
   onProgress([...results,...prices]);
  });
  results.push(...outcomes.map((row):ReviewResult=>({kind:'price',connectionId:row.target.connection_id,id:row.target.provider_listing_id,status:row.status==='confirmed'||row.status==='unchanged'?'confirmed':row.status==='not_sent'?'not_sent':'failed',message:row.message})));
  if(outcomes.some(row=>row.availabilityChanged||!['confirmed','unchanged'].includes(row.status))){for(const change of changes)for(const target of prepared.get(change.kind)!.parts)results.push({kind:change.kind,connectionId:target.connectionId,id:target.id,status:'not_sent',message:'Não enviado após a interrupção da edição de preço.'});onProgress([...results]);throw Error('O envio foi interrompido. Confira os preços confirmados e os campos ainda não enviados; nenhum envio será repetido automaticamente.');}
  sent=true;
 }
 for(const change of changes){
  let checked=prepared.get(change.kind)!;
  if(sent){const current=await readReviewSection(source,change.kind,request,AbortSignal.timeout(55_000));if(sectionBaseline(current,change.kind)!==sectionBaseline(editors[change.kind],change.kind))throw Error('Os dados da próxima seção mudaram. O envio foi interrompido; confira os resultados e recarregue antes de continuar.');checked=await review(change,current);}
  // O servidor relê revisão, alcance e permissões antes de CADA escrita.
  // Se a plataforma mudou outra revisão, interrompe em vez de reenviar.
  const pending=[...checked.parts];
  while(pending.length){
   const part=pending.shift()!;
   try{const response=await request('produtos/qualidade',{...common,...change,scopeHash:checked.scopeHash,confirmation:source.productId,target:part,requestKey:crypto.randomUUID()},AbortSignal.timeout(60_000),'PATCH');if(response.success!==true)throw Error('A plataforma não confirmou o envio.');sent=true;results.push({kind:change.kind,connectionId:part.connectionId,id:part.id,status:'confirmed',message:response.unchanged?'Já estava atualizado.':response.message||'Alteração confirmada.'});onProgress([...results]);}
   catch(e){results.push({kind:change.kind,connectionId:part.connectionId,id:part.id,status:'failed',message:e instanceof Error?e.message:'Confirmação indisponível. Confira antes de reenviar.'});for(const next of pending)results.push({kind:change.kind,connectionId:next.connectionId,id:next.id,status:'not_sent',message:'Não enviado após falha anterior.'});onProgress([...results]);throw Error('Publicação interrompida. Pode haver alterações já recebidas. Confira os resultados e recarregue; nenhum envio será repetido automaticamente.');}
  }
 }
 return results;
}
