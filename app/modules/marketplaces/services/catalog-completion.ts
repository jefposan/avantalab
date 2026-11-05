import 'server-only';
import {randomUUID} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {getLocalProduct} from './local-products';
import {loadConnection,mlRequest} from './mercadolivre-management';
import {identifyMercadoLivreCatalog} from './mercadolivre-catalog';
import {catalogGtins,validEan} from './catalog-publication';
import {object,rows,pictureId,pictureUrl} from '../listing-content';
import {readListingContent,saveListingContent} from './listing-content';
import {readCommonMercadoLivreEditor,saveCommonMercadoLivreEditor} from './mercadolivre-editor';
import {assertCompletionIdentity,compatibleCatalogSource,missingCatalogAttributes,missingCatalogPictures,catalogFirstPictures,catalogEanConfirmed,type CatalogCompletionSource,type CatalogFact} from '../catalog-completion';
import {MarketplaceError} from './management-access';

type Stage='pictures'|'attributes'|'description'|'title';
type Progress={name?:string;source?:CatalogCompletionSource;stage?:Stage;cursor?:string;localChanged?:boolean;updated?:number;notes?:string[];full?:boolean;expectedRevision?:number};
type Job={empresa_id:string;product_id:string;actor_id:string;lease_owner:string;progress:Progress;photo_policy?:'preserve'|'catalog'|'custom'};
const stages:Stage[]=['pictures','attributes','description','title'];
const facts=(value:unknown):CatalogFact[]=>rows(value).filter(a=>typeof a.id==='string'&&rows(a.values).length<2).map(a=>({id:String(a.id),name:String(a.name||a.id),value:String(a.value_name||rows(a.values)[0]?.name||''),...(typeof a.value_id==='string'?{valueId:a.value_id}:{})})).filter(a=>/^[A-Z0-9_]{1,80}$/.test(a.id)&&a.value.trim()&&a.value.length<=1000&&a.name.length<=120).slice(0,100);
const note=(progress:Progress,message:string)=>{progress.notes=[...new Set([...progress.notes||[],message])].slice(-30);};
function assertRemoteIdentity(item:Record<string,unknown>,seller:string,source:CatalogCompletionSource){
 if(String(item.seller_id)!==seller||item.catalog_listing!==false||!['active','paused'].includes(String(item.status))||item.condition!=='new'||rows(item.variations).length)throw Error('Anúncio próprio, condição ou variante sem confirmação para complemento automático.');
 const codes=catalogGtins(item.attributes);
 if(!codes.some(code=>code.replace(/^0+/,'')===source.ean.replace(/^0+/,'')))throw Error('O EAN do anúncio não foi confirmado. Conteúdo preservado.');
 assertCompletionIdentity(source.ean,facts(item.attributes),source,String(item.title||''));
}
export async function catalogCompletionStatus(db:SupabaseClient,company:string){
 const result=await db.from('marketplace_catalog_completion').select('product_id,state,issue,name:progress->>name,localChanged:progress->localChanged,updated:progress->updated,notes:progress->notes,product:marketplace_products!inner(archived_at)').eq('empresa_id',company).is('product.archived_at',null).limit(1000);
 if(result.error)throw Error('Não foi possível consultar a complementação do catálogo.');
 const jobs=result.data||[];
 return {pending:jobs.filter(j=>['pending','processing','sending'].includes(j.state)).length,completed:jobs.filter(j=>j.state==='completed').length,
  localUpdated:jobs.filter(j=>j.localChanged).length,updates:jobs.reduce((n,j)=>n+Number(j.updated||0),0),
  issues:jobs.filter(j=>j.issue||Array.isArray(j.notes)&&j.notes.length).map(j=>({productId:j.product_id,name:j.name,state:j.state,message:j.issue||(j.notes as string[]).join(' ')})).slice(0,30)};
}
/** Uma etapa por requisição: fila durável, sem prolongar a carga da página. */
export async function completeCatalogStep(db:SupabaseClient,company?:string){
 const owner=randomUUID(),claim=await db.rpc('marketplace_catalog_completion_claim',{p_owner:owner,p_company:company||null,p_full_capable:true,p_photo_selection_capable:true});
 if(claim.error)throw Error('Não foi possível iniciar a complementação do catálogo.');
 const job=claim.data as Job|null;if(!job)return {worked:false,changed:false};
 const progress:Progress={...job.progress};let sending=false,changed=false,baselineRevision=0;
 async function finish(state:string,issue:string|null=null,delay=0){
  const result=await db.from('marketplace_catalog_completion').update({state,issue,progress,lease_owner:null,lease_until:null,next_check_at:new Date(Date.now()+delay).toISOString(),updated_at:new Date().toISOString()}).eq('empresa_id',job!.empresa_id).eq('product_id',job!.product_id).eq('lease_owner',owner).select('product_id');
  if(result.error||result.data?.length!==1)throw Error('A etapa mudou de responsável; confira o resultado antes de repetir.');
 }
 async function markSending(){
  const latest=await getLocalProduct(db,job!.empresa_id,job!.product_id);
  if(latest.revision!==baselineRevision)throw Error('O cadastro foi editado durante a conferência. Nenhum complemento foi enviado nesta etapa.');
  const result=await db.from('marketplace_catalog_completion').update({state:'sending',progress}).eq('empresa_id',job!.empresa_id).eq('product_id',job!.product_id).eq('lease_owner',owner).eq('state','processing').gt('lease_until',new Date().toISOString()).select('product_id');
  if(result.error||result.data?.length!==1)throw Error('A tentativa expirou antes do envio.');sending=true;
 }
 try{
  const product=await getLocalProduct(db,job.empresa_id,job.product_id);
  baselineRevision=product.revision;
  progress.name=product.name;
  const accounts=await db.from('marketplace_connections').select('id').eq('empresa_id',job.empresa_id).eq('provider','mercado_livre').eq('status','connected').order('id');
  if(accounts.error)throw Error('Não foi possível conferir as contas conectadas.');
  if(!accounts.data?.length){await finish('skipped','Nenhuma conta ML conectada para consultar o catálogo.',30*60_000);return {worked:true,changed:false};}
  if(progress.full&&!progress.stage){
   if(!progress.source||progress.expectedRevision!==product.revision)throw Error('O cadastro mudou após a confirmação. Abra uma nova prévia; nenhum dado será substituído.');
   assertCompletionIdentity(product.ean,product.attributes,progress.source,product.name);
   const local=await db.rpc('marketplace_catalog_apply_full_local',{p_company:job.empresa_id,p_actor:job.actor_id,p_product:product.id,p_revision:product.revision,p_owner:owner});
   if(local.error)throw Error('A confirmação expirou ou o cadastro mudou. Abra uma nova prévia.');
   changed=local.data===true;progress.localChanged=changed;progress.stage='pictures';progress.cursor='';progress.updated=0;
   const latest=await getLocalProduct(db,job.empresa_id,job.product_id);progress.expectedRevision=latest.revision;
   await finish('pending');return {worked:true,changed};
  }
  if(!progress.source){
   if(!validEan(product.ean))throw Error('EAN ausente ou inválido. Complemento automático não aplicado.');
   if(product.publication_form.condition&&product.publication_form.condition!=='new')throw Error('Produto usado/recondicionado: fotos reais e dados existentes preservados.');
   const connection=await loadConnection(db,job.empresa_id,accounts.data[0].id);
   const result=await identifyMercadoLivreCatalog(db,connection,{ean:product.ean,...(product.catalog_product_id?{productId:product.catalog_product_id}:{})});
   if(result.status!=='found'||!result.product)throw Error(result.status==='choose'?'Mais de uma ficha para este EAN. Confirme a variante antes de complementar.':'Não há ficha de catálogo confirmada para este EAN.');
   if(!catalogEanConfirmed(result,product.ean))throw Error('EAN do catálogo não confirmado por identificador exato.');
   progress.source={id:result.product.id,name:result.product.name,ean:product.ean!,description:result.product.description,attributes:facts(result.product.raw.attributes).filter(a=>a.id!=='GTIN'),pictures:rows(result.product.raw.pictures).flatMap(p=>{const url=pictureUrl(p.secure_url||p.url);return pictureId(p.id)&&url?[{id:String(p.id),url}]:[];}).slice(0,12)};
   const localFacts=[...product.attributes,...Object.entries(product.publication_form.attributes||{}).filter(([id])=>!product.attributes.some(a=>a.id===id)).map(([id,value])=>{const fact=progress.source!.attributes.find(a=>a.id===id);return {id,name:id,value:fact?.valueId===value?fact.value:value,...(fact?.valueId===value?{valueId:value}:{})};})];
   assertCompletionIdentity(product.ean,localFacts,progress.source,product.name);
   const pictures=job.photo_policy==='custom'?[]:missingCatalogPictures(product.pictures.map(url=>({url})),progress.source,12).map(p=>p.url);
   const local=await db.rpc('marketplace_catalog_complete_local',{p_company:job.empresa_id,p_actor:job.actor_id,p_product:product.id,p_revision:product.revision,p_owner:owner,p_data:{description:progress.source.description,pictures,attributes:progress.source.attributes}});
   if(local.error)throw Error('O cadastro mudou ou não permitiu o complemento. Seus dados foram preservados.');
   changed=local.data===true;progress.localChanged=changed;progress.stage='pictures';progress.cursor='';progress.updated=0;
   await finish('pending');return {worked:true,changed};
  }
  const identitySource=progress.source;assertCompletionIdentity(product.ean,product.attributes,identitySource,product.name);
  if(progress.full&&progress.expectedRevision!==product.revision)throw Error('O cadastro mudou durante a atualização. Os próximos envios foram interrompidos; abra uma nova prévia.');
  const source=progress.full?identitySource:compatibleCatalogSource(identitySource,[...product.attributes,...Object.entries(product.publication_form.attributes||{}).filter(([id])=>!product.attributes.some(a=>a.id===id&&a.value.trim())).map(([id,value])=>({id,name:id,value}))],product.description||product.publication_form.description||'');
  const links=await db.from('marketplace_product_links').select('connection_id,provider_listing_id,status').eq('empresa_id',job.empresa_id).eq('product_id',product.id).eq('provider','mercado_livre').order('connection_id').order('provider_listing_id').limit(101);
  if(links.error||(links.data?.length||0)>100)throw Error('Não foi possível conferir os vínculos do produto.');
  const eligible=(links.data||[]).filter(l=>['active','paused'].includes(l.status)&&accounts.data!.some(a=>a.id===l.connection_id));
  const key=(l:{connection_id:string;provider_listing_id:string})=>`${l.connection_id}:${l.provider_listing_id}`;
  const next=eligible.find(l=>key(l)>(progress.cursor||''));
  if(!next){
   const index=stages.indexOf(progress.stage!);
   if(index<0||index===stages.length-1||!eligible.length){await finish('completed',null,24*60*60_000);return {worked:true,changed:false};}
   progress.stage=stages[index+1];progress.cursor='';await finish('pending');return {worked:true,changed:false};
  }
  const connection=await loadConnection(db,job.empresa_id,next.connection_id),stage=progress.stage!;
  if(stage==='pictures'&&!progress.full&&job.photo_policy==='custom'){progress.cursor=key(next);await finish('pending');return {worked:true,changed:false};}
  const item=object(await mlRequest(db,connection,`/items/${next.provider_listing_id}`));
  if(item.id!==next.provider_listing_id||String(item.seller_id)!==connection.seller_reference)throw Error('O ML não confirmou o anúncio solicitado nesta conta.');
  if(item.catalog_listing===true||['closed','deleted','cancelled','canceled','excluded','unpublished'].includes(String(item.status))||Array.isArray(item.sub_status)&&item.sub_status.includes('deleted')){progress.cursor=key(next);await finish('pending');return {worked:true,changed:false};}
  try{assertRemoteIdentity(item,connection.seller_reference,identitySource);}catch(error){note(progress,`${next.provider_listing_id}: ${error instanceof Error?error.message:'Identidade não confirmada.'}`);progress.cursor=key(next);await finish('pending');return {worked:true,changed:false};}
  if(stage==='description'||stage==='title'){
   const value=stage==='title'?(progress.full?source.name||'':''):source.description;
   if(value.trim()){
    const editor=await readCommonMercadoLivreEditor(db,connection,next.provider_listing_id);
    const field=editor.fields[stage];
    if(field.maxLength&&value.length>field.maxLength){note(progress,`${next.provider_listing_id}: ${stage==='title'?'Título':'Descrição'} do catálogo ultrapassa o limite do anúncio; conteúdo atual preservado.`);}
    else if(field.editable&&(progress.full?editor.values[stage].trim()!==value.trim():!editor.values[stage].trim())){
     await markSending();await saveCommonMercadoLivreEditor(db,connection,job.actor_id,{id:next.provider_listing_id,revision:editor.revision,requestKey:owner,changes:{[stage]:value}});changed=true;
    }else if(progress.full&&!field.editable&&editor.values[stage].trim()!==value.trim()){
     note(progress,`${next.provider_listing_id}: ${stage==='title'?'Título':'Descrição'} preservado. ${field.reason||'Alteração não liberada pelo ML.'}`);
    }
   }
  }else{
   const editor=await readListingContent(db,job.empresa_id,connection.id,next.provider_listing_id,stage);
   if(editor.reason){if(!/catálogo confirmado/i.test(editor.reason))note(progress,`${next.provider_listing_id}: ${editor.reason}`);}
   else{
    if(editor.affectedIds.length>10||editor.affectedIds.some(id=>!eligible.some(l=>l.connection_id===connection.id&&l.provider_listing_id===id)))throw Error('O conteúdo alcança anúncios fora dos vínculos confirmados.');
    for(const id of editor.affectedIds){if(id===item.id)continue;const peer=object(await mlRequest(db,connection,`/items/${id}`));if(peer.id!==id)throw Error('Par compartilhado não confirmado.');assertRemoteIdentity(peer,connection.seller_reference,identitySource);}
    const additions=stage==='pictures'?missingCatalogPictures(editor.pictures,source,editor.maxPictures):[];
    if(stage==='pictures'&&progress.full&&source.photoMode&&source.pictures.length>editor.maxPictures)note(progress,`${next.provider_listing_id}: o ML permite ${editor.maxPictures} fotos; as demais ficam no cadastro.`);
    const values=stage==='pictures'?(progress.full?(source.photoMode?source.pictures.slice(0,editor.maxPictures):catalogFirstPictures(editor.pictures,source,editor.maxPictures)).map(p=>p.id!):[...editor.pictures.map(p=>p.id),...additions.map(p=>p.id)]):missingCatalogAttributes(editor,source,progress.full);
    if(stage==='pictures'?JSON.stringify(values)!==JSON.stringify(editor.pictures.map(p=>p.id)):Object.keys(values).length){
     await markSending();await saveListingContent(db,job.empresa_id,connection.id,job.actor_id,{id:next.provider_listing_id,kind:stage,revision:editor.revision,affectedIds:editor.affectedIds,confirmation:next.provider_listing_id,requestKey:owner,values});changed=true;
    }
   }
  }
  if(changed)progress.updated=(progress.updated||0)+1;
  if(progress.full&&changed){const latest=await getLocalProduct(db,job.empresa_id,job.product_id);progress.expectedRevision=latest.revision;}
  progress.cursor=key(next);await finish('pending');return {worked:true,changed};
 }catch(error){
  if(!sending&&error instanceof MarketplaceError&&['product_missing','provider_404'].includes(error.code)){await finish('skipped',null,24*60*60_000);return {worked:true,changed:false};}
  const message=error instanceof Error?error.message:'Não foi possível complementar este produto.';
  await finish(sending?'review_required':error instanceof MarketplaceError&&error.status>=500?'failed':'skipped',sending?'Envio sem confirmação. Confira em Revisar anúncio; nenhum reenvio automático será feito. '+message:message, sending?0:60*60_000);
  return {worked:true,changed:false,issue:message};
 }
}

/** O cron já autorizado do estoque retoma a fila mesmo sem navegador aberto. */
export async function resumeCatalogCompletion(db:SupabaseClient){
 // A função SQL escolhe somente empresas/atores ainda autorizados. Uma fila
 // antiga sem permissão não pode impedir a retomada das demais empresas.
 // Novos produtos já entram pelo trigger; não é necessário semear por um ator antigo.
 return completeCatalogStep(db);
}
