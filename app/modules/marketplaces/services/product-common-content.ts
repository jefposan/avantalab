import 'server-only';
import {listingSaleState} from '../listing-sale-state';
import {createHash} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {MarketplaceError} from './management-access';
import {getLocalProduct} from './local-products';
import {loadConnection} from './mercadolivre-management';
import {readCommonMercadoLivreEditor,saveCommonMercadoLivreEditor} from './mercadolivre-editor';
import {readListingContent,previewListingContent,saveListingContent} from './listing-content';
import {commonKinds,commonAttributeRules,detailAttributeRules,commonTargetValues,type ProductCommonKind,type CommonTarget,type CommonProductEditor} from '../product-common-content';
import {attributeChanges,object,type ContentEditor} from '../listing-content';
import {uuidIsValid} from './listing-model';
import {pictureAccountPermissions,pictureTargetKey,appendTargetPictures} from '../picture-account-permissions';
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const terminal=new Set(['closed','deleted','cancelled','canceled','excluded','unpublished']);
async function scope(db:SupabaseClient,company:string,productId:unknown){
 const product=await getLocalProduct(db,company,productId);
 const result=await db.from('marketplace_product_links').select('id,provider,connection_id,provider_listing_id,status').eq('empresa_id',company).eq('product_id',product.id).order('id').limit(101);
 if(result.error||!Array.isArray(result.data)||result.data.length>100)throw new MarketplaceError(503,'product_scope','Não foi possível conferir todos os anúncios vinculados. Nenhuma alteração foi enviada.');
 const links=result.data.filter(link=>!terminal.has(String(link.status).toLowerCase()));
 if(!links.length)throw new MarketplaceError(409,'no_linked_listings','Este produto não possui anúncios vinculados editáveis.');
 if(links.some(l=>l.provider!=='mercado_livre'))throw new MarketplaceError(409,'provider_not_supported','Há anúncios de outra plataforma. A edição conjunta de conteúdo ainda não está homologada para todos os destinos; nenhum será alterado.');
 const identities=links.map(l=>`${l.connection_id}:${l.provider_listing_id}`).sort();
 if(new Set(identities).size!==identities.length)throw new MarketplaceError(409,'duplicate_link','Há vínculos duplicados. Confira o cadastro antes de sincronizar.');
 return {product,links,scopeHash:digest({company,product:product.id,links:identities})};
}
function kindOf(value:unknown):ProductCommonKind{
 if(!commonKinds.includes(value as ProductCommonKind))throw new MarketplaceError(400,'invalid_content','Selecione um editor válido.');return value as ProductCommonKind;
}
function validateReach(target:CommonTarget,links:{connection_id:string;provider_listing_id:string}[]){
 if(target.affectedIds.some(id=>!links.some(l=>l.connection_id===target.connectionId&&l.provider_listing_id===id)))throw new MarketplaceError(409,'external_shared_listing','O ML compartilha esses dados com um anúncio fora deste produto. Corrija os vínculos antes de aplicar a edição única.');
}
async function targetEditor(db:SupabaseClient,company:string,link:{connection_id:string;provider_listing_id:string},kind:ProductCommonKind,localDraft=false):Promise<CommonTarget>{
 const base={connectionId:link.connection_id,id:link.provider_listing_id,label:`${link.connection_id} · ${link.provider_listing_id}`};
 if(kind==='details'){
  const connection=await loadConnection(db,company,link.connection_id),details=await readCommonMercadoLivreEditor(db,connection,link.provider_listing_id);
  // A edição já existente bloqueia nome compartilhado sem alcance homologado.
  return {...base,details,revision:details.revision,affectedIds:[link.provider_listing_id]};
 }
 const content=await readListingContent(db,company,link.connection_id,link.provider_listing_id,kind,localDraft);
 return {...base,content,revision:content.revision,affectedIds:content.affectedIds};
}
export async function readCommonProductEditor(db:SupabaseClient,company:string,productId:unknown,rawKind:unknown,sourceConnection?:unknown,sourceId?:unknown,localDraft=false){
 const current=await scope(db,company,productId),kind=kindOf(rawKind),targets:CommonTarget[]=[];
 // Duas leituras concorrentes no máximo, sem polling da base.
 for(let i=0;i<current.links.length;i+=2)targets.push(...await Promise.all(current.links.slice(i,i+2).map(link=>targetEditor(db,company,link,kind,localDraft))));
 const restrictions:{connectionId:string;id:string;message:string}[]=[];
 for(const target of targets){
  if(target.content?.reason)restrictions.push({connectionId:target.connectionId,id:target.id,message:target.content.reason});
  try{validateReach(target,current.links);}catch(e){if(!localDraft)throw e;restrictions.push({connectionId:target.connectionId,id:target.id,message:e instanceof Error?e.message:'Alcance não confirmado.'});}
 }
 for(const target of targets)for(const peer of targets){
  if(target===peer||target.connectionId!==peer.connectionId)continue;
  if(!localDraft&&target.affectedIds.some(id=>peer.affectedIds.includes(id))&&JSON.stringify([...target.affectedIds].sort())!==JSON.stringify([...peer.affectedIds].sort()))throw new MarketplaceError(409,'inconsistent_shared_scope','O alcance compartilhado mudou entre as leituras. Recarregue antes de editar. Nenhuma alteração foi enviada.');
 }
 const primary=targets.find(t=>t.connectionId===sourceConnection&&t.id===sourceId)||targets[0];
 const ordered=[primary,...targets.filter(t=>t!==primary)];
 const attributes=kind==='details'?detailAttributeRules(ordered.map(t=>{
  const details=t.details!;if(!localDraft)return details;
  for(const field of ['title','description'] as const)if(!details.fields[field].editable)restrictions.push({connectionId:t.connectionId,id:t.id,message:details.fields[field].reason||`${field}: envio restrito pelo ML.`});
  return {...details,fields:{...details.fields,title:{...details.fields.title,editable:true,reason:undefined},description:{...details.fields.description,editable:true,reason:undefined}}};
 })):commonAttributeRules(ordered.map(t=>t.content!));
 const reason=targets.map(t=>t.content?.reason).filter(Boolean).join(' ');
 const revision=digest({scope:current.scopeHash,kind,source:[primary.connectionId,primary.id],revisions:targets.map(t=>[t.connectionId,t.id,t.revision])});
 const destinations=targets.map(t=>t.label);
 const allValues=(target:CommonTarget)=>kind==='pictures'?target.content!.pictures.map(p=>p.id):kind==='details'?attributes.filter(a=>a.editable).map(a=>target.details!.values[({TITLE:'title',DESCRIPTION:'description',LISTING_TYPE:'listingType'} as const)[a.id as 'TITLE'|'DESCRIPTION'|'LISTING_TYPE']]):target.content!.attributes.filter(a=>attributes.some(rule=>rule.id===a.id&&rule.editable)).map(a=>[a.id,a.valueId||a.value]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
 const editor:CommonProductEditor={id:primary.id,connectionId:primary.connectionId,kind:kind==='details'?'attributes':kind,revision,title:current.product.name,affectedIds:destinations,reason:localDraft?'':reason,maxPictures:kind==='pictures'?Math.min(...targets.map(t=>t.content!.maxPictures)):0,pictures:primary.content?.pictures||[],attributes,scopeHash:current.scopeHash,productId:current.product.id,destinations,different:targets.some(t=>JSON.stringify(allValues(t))!==JSON.stringify(allValues(primary))),...(localDraft?{restrictions}:{})};
 return {editor,targets,kind,links:current.links};
}
export async function reviewCommonProductEdit(db:SupabaseClient,company:string,input:Record<string,unknown>){
 const localDraft=input.localDraft===true;
 const loaded=await readCommonProductEditor(db,company,input.productId,input.kind,input.sourceConnectionId,input.sourceId,localDraft),{editor,kind}=loaded;
 const append=kind==='pictures'&&input.appendPictures===true;
 let photoTargets=loaded.targets;
 if(append){
  if(!Array.isArray(input.pictureTargets)||!input.pictureTargets.length||new Set(input.pictureTargets).size!==input.pictureTargets.length)throw new MarketplaceError(400,'photo_targets','Confirme as contas que receberão as fotos.');
  const permissions=pictureAccountPermissions({...editor,reviewTargets:loaded.targets});
  if(input.pictureTargets.some(key=>!permissions.some(row=>row.key===key&&row.allowed)))throw new MarketplaceError(409,'photo_permission','Uma conta selecionada não está liberada para fotos. Recarregue as permissões.');
  photoTargets=loaded.targets.filter(target=>(input.pictureTargets as unknown[]).includes(pictureTargetKey(target)));
  if(photoTargets.some(target=>target.affectedIds.some(id=>!photoTargets.some(peer=>peer.connectionId===target.connectionId&&peer.id===id))))throw new MarketplaceError(409,'photo_scope','Selecione todos os anúncios do mesmo produto compartilhado.');
 }
 if(editor.revision!==input.revision)throw new MarketplaceError(409,'edit_conflict','Um anúncio ou vínculo mudou. Recarregue os dados e revise novamente.');
 if(editor.reason&&!append)throw new MarketplaceError(409,'content_locked',editor.reason);
 if(input.onlyMissing===true&&kind!=='pictures')for(const target of loaded.targets)for(const key of Object.keys(object(input.values))){
  const exists=kind==='details'?key!=='DESCRIPTION'||!!target.details?.values.description.trim():target.content?.attributes.some(a=>a.id===key&&(!!a.value.trim()||!!a.valueId));
  if(exists)throw new MarketplaceError(409,'ai_existing_value','Um campo sugerido já possui valor em um anúncio. Refaça a análise; a IA não substituirá dados existentes.');
 }
 if(input.onlyMissing===true&&kind==='pictures')for(const target of loaded.targets){if(!Array.isArray(input.values)||target.content?.pictures.some(p=>!(input.values as unknown[]).includes(p.id)))throw new MarketplaceError(409,'ai_existing_picture','Há fotos existentes fora da proposta. Refaça a análise para preservar todas as imagens.');}
 if(kind!=='pictures'){
  const values=object(input.values);
  if(!Object.keys(values).length||Object.keys(values).some(key=>!editor.attributes.some(a=>a.id===key&&a.editable)))throw new MarketplaceError(400,'invalid_fields','Informe somente características comuns e editáveis. Preço e estoque são preservados.');
  if(kind==='attributes')try{attributeChanges({...editor,attributes:editor.attributes.map(a=>({...a,value:'\u0000'}))},values);}catch(e){throw new MarketplaceError(400,'invalid_fields',e instanceof Error?e.message:'Características inválidas.');}
 }
 const parts:CommonTarget[]=[],blocked:{connectionId:string;id:string;message:string}[]=[];const used=new Set<string>();
 for(const target of photoTargets){
  try{
  // O rascunho nunca autoriza envio: reler alcance e permissões reais.
  if(localDraft){const actual=await targetEditor(db,company,{connection_id:target.connectionId,provider_listing_id:target.id},kind);validateReach(actual,loaded.links);if(actual.revision!==target.revision)throw new MarketplaceError(409,'edit_conflict','O anúncio mudou. Recarregue antes de enviar.');Object.assign(target,actual);if(target.content?.reason)throw new MarketplaceError(409,'content_locked',target.content.reason);}
  const group=`${target.connectionId}:${[...target.affectedIds].sort().join(',')}`;if(used.has(group))continue;used.add(group);
  let values:unknown;try{values=commonTargetValues(target,kind,append?appendTargetPictures(target,input.values):input.values);}catch(e){throw new MarketplaceError(400,'invalid_fields',`${target.label}: ${e instanceof Error?e.message:'Dados inválidos.'}`);}
  if(values==null)continue;
  if(kind!=='details')await previewListingContent(db,company,target.connectionId,{id:target.id,kind,revision:target.revision,affectedIds:target.affectedIds,values});
  parts.push({...target,content:undefined,details:undefined});
  }catch(e){if(!localDraft)throw e;blocked.push({connectionId:target.connectionId,id:target.id,message:e instanceof Error?e.message:'Não foi possível validar este destino.'});}
 }
 return {scopeHash:editor.scopeHash,parts,destinations:editor.destinations,blocked,unchanged:loaded.targets.length-blocked.length-parts.reduce((sum,t)=>sum+t.affectedIds.length,0)};
}
export async function applyCommonProductEdit(db:SupabaseClient,company:string,actor:string,input:Record<string,unknown>){
 if(input.confirmation!==input.productId||!uuidIsValid(input.requestKey))throw new MarketplaceError(400,'confirmation_required','Confirme a aplicação aos anúncios vinculados.');
 const current=await scope(db,company,input.productId),kind=kindOf(input.kind),part=object(input.target);
 if(current.scopeHash!==input.scopeHash||!current.links.some(l=>l.connection_id===part.connectionId&&l.provider_listing_id===part.id))throw new MarketplaceError(409,'edit_conflict','Os vínculos do produto mudaram. Nenhuma nova alteração foi enviada.');
 const target=await targetEditor(db,company,{connection_id:String(part.connectionId),provider_listing_id:String(part.id)},kind);validateReach(target,current.links);
 const append=kind==='pictures'&&input.appendPictures===true;
 if(append){
  if(!Array.isArray(input.pictureTargets)||!input.pictureTargets.includes(pictureTargetKey(target))||target.affectedIds.some(id=>!(input.pictureTargets as unknown[]).includes(pictureTargetKey({connectionId:target.connectionId,id}))))throw new MarketplaceError(409,'photo_scope','O destino das fotos não foi confirmado.');
 }
 if(target.revision!==part.revision||JSON.stringify(target.affectedIds)!==JSON.stringify(part.affectedIds))throw new MarketplaceError(409,'edit_conflict','O anúncio ou o alcance mudou durante a aplicação. Recarregue e confira os resultados.');
 let values:unknown;try{values=commonTargetValues(target,kind,append?appendTargetPictures(target,input.values):input.values);}catch(e){throw new MarketplaceError(400,'invalid_fields',e instanceof Error?e.message:'Dados inválidos.');}
 if(values==null)return {success:true,unchanged:true};
 if(kind==='details'){
  const connection=await loadConnection(db,company,target.connectionId);
  const {listing}=await saveCommonMercadoLivreEditor(db,connection,actor,{id:target.id,revision:target.revision,requestKey:input.requestKey,changes:values});
  return {success:true,unchanged:false,message:`Alteração confirmada. ${listingSaleState(listing ?? {})}.`};
 }
 const result=await saveListingContent(db,company,target.connectionId,actor,{id:target.id,kind,revision:target.revision,affectedIds:target.affectedIds,confirmation:target.id,requestKey:input.requestKey,values});
 return {success:true,unchanged:false,message:result?.message};
}
