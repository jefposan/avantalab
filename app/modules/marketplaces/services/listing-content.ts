import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {SupabaseClient} from '@supabase/supabase-js';
import {loadConnection,mlRequest,saveListing,type SellerConnection} from './mercadolivre-management';
import {MarketplaceError} from './management-access';
import {listingIdIsValid,uuidIsValid} from './listing-model';
import {object,rows,contentAttributes,listingContextFields,attributeChanges,mergeContentAttributes,validatePictureIds,contentMatches,contentAttributeFingerprint,contentBaseline,contentPreserved,pictureId,pictureUrl,type ContentEditor,type ContentKind} from '../listing-content';

function owned(item:Record<string,unknown>,connection:SellerConnection,id:unknown,up?:unknown){
 if(item.id!==id||String(item.seller_id)!==connection.seller_reference||(up&&item.user_product_id!==up))throw new MarketplaceError(403,'seller_mismatch','Não foi possível confirmar os anúncios e a conta afetados. Nenhuma alteração foi enviada.');
}
async function context(db:SupabaseClient,connection:SellerConnection,id:unknown,kind:unknown){
 if(!listingIdIsValid(id)||!['pictures','attributes'].includes(String(kind)))throw new MarketplaceError(400,'invalid_content','Identifique o anúncio e o editor corretamente.');
 const item=object(await mlRequest(db,connection,`/items/${id}`));owned(item,connection,id);
 if(typeof item.category_id!=='string'||!/^MLB\d+$/.test(item.category_id))throw new MarketplaceError(409,'category_unknown','Categoria indisponível. Recarregue antes de editar.');
 let items=[item],reason='';
 const up=item.user_product_id,tags=Array.isArray(item.tags)?item.tags:[];
 if(up){
  if(typeof up!=='string'||!/^MLBU\d+$/.test(up))reason='Não foi possível identificar o produto compartilhado.';
  else try{
   const search=object(await mlRequest(db,connection,`/users/${connection.seller_reference}/items/search?${new URLSearchParams({user_product_id:up,limit:'100'})}`));
   const total=object(search.paging).total,ids=search.results;
   if((search.seller_id!=null&&String(search.seller_id)!==connection.seller_reference)||!Array.isArray(ids)||!Number.isSafeInteger(total)||Number(total)<1||Number(total)>100||ids.length!==total||new Set(ids).size!==ids.length||!ids.includes(id)||ids.some(v=>!listingIdIsValid(v)))throw Error('scope');
   items=[];
   for(let start=0;start<ids.length;start+=10){
    const part=ids.slice(start,start+10),bulk=await mlRequest(db,connection,`/items/bulk?ids=${part.join(',')}`);
    if(!Array.isArray(bulk)||bulk.length!==part.length)throw Error('scope');
    const found=bulk.map(raw=>{const envelope=object(raw),value=object(envelope.body);if((envelope.status_code??envelope.code)!==200||!part.includes(value.id))throw Error('scope');owned(value,connection,value.id,up);return value;});
    if(new Set(found.map(a=>a.id)).size!==part.length)throw Error('scope');items.push(...found);
   }
  }catch{items=[item];reason='Não foi possível conferir todos os anúncios que compartilham este produto. Recarregue; a edição está bloqueada para evitar alteração sem alcance conhecido.';}
 }else if(tags.includes('user_product_listing')||item.family_name)reason='Produto compartilhado sem identificação confirmada. Recarregue a edição.';
 const [category,schema]=await Promise.all([mlRequest(db,connection,`/categories/${item.category_id}`).then(object),mlRequest(db,connection,`/categories/${item.category_id}/attributes`)]);
 if(!Array.isArray(schema))throw new MarketplaceError(503,'schema_unavailable','O ML não retornou o esquema da ficha técnica.');
 // Fotos e atributos de catálogo vêm da ficha oficial; nos demais itens vêm do UP.
 // Conferimos todos os pares acima, mas só a galeria própria é alvo da edição.
 const scopeItems=items;
 if(item.catalog_listing===false)items=items.filter(a=>a.catalog_listing!==true);
 else if(item.catalog_listing===true)items=[item];
 const catalog=items.filter(a=>a.catalog_listing===true),unknownCatalog=items.filter(a=>a.catalog_listing!==true&&a.catalog_listing!==false);
 if(item.catalog_listing!==true&&item.catalog_listing!==false)reason||=`O ML não informou se o anúncio é de catálogo (${id}). Atualize a revisão para tentar confirmar a permissão.`;
 if(catalog.length)reason||=`Anúncio de catálogo confirmado pelo ML (${catalog.map(a=>a.id).join(', ')}). Fotos e ficha pertencem ao catálogo; a correção exige análise do Mercado Livre.`;
 else if(unknownCatalog.length)reason||=`O ML não informou se o anúncio é de catálogo (${unknownCatalog.map(a=>a.id).join(', ')}). Atualize a revisão para tentar confirmar a permissão.`;
 if(items.some(a=>!['active','paused'].includes(String(a.status))||Array.isArray(a.sub_status)&&a.sub_status.includes('deleted')))reason||='Situação de um dos anúncios não permite editar este conteúdo.';
 if(items.some(a=>a.category_id!==item.category_id))reason||='Os anúncios compartilhados possuem categorias divergentes. Confira o vínculo antes de editar.';
 if(items.some(a=>object(a.bundle).type==='kit'||(Array.isArray(a.tags)&&a.tags.includes('bundle'))))reason||='Conteúdo de kit exige tratamento específico e está preservado.';
 const max=object(category.settings).max_pictures_per_item??category.max_pictures_per_item;
 const selected=items.find(a=>a.id===id)||item;
 const pictures=rows(selected.pictures).map(p=>({id:String(p.id||''),url:pictureUrl(p.secure_url||p.url)}));
 if(kind==='pictures'&&(!Number.isSafeInteger(max)||Number(max)<1||pictures.some(p=>!pictureId(p.id))))reason||='Limites ou identificação das fotos indisponíveis.';
 const revision=createHash('sha256').update(JSON.stringify({connection:connection.id,kind,items:scopeItems.map(a=>({id:a.id,up:a.user_product_id,status:a.status,subStatus:a.sub_status,catalog:a.catalog_listing,pictures:a.pictures,attributes:a.attributes,variations:a.variations})).sort((a,b)=>String(a.id).localeCompare(String(b.id))),schema,max,reason})).digest('hex');
 const editor:ContentEditor={id,connectionId:connection.id,kind:kind as ContentKind,revision,title:String(selected.title||''),affectedIds:items.map(a=>String(a.id)).sort(),reason,maxPictures:Number.isSafeInteger(max)?Math.min(Number(max),100):0,pictures,attributes:contentAttributes(schema,selected.attributes,reason)};
 editor.contextFields=listingContextFields(selected);
 return {editor,items,item:selected,schema,protectedItems:scopeItems.filter(a=>!items.includes(a))};
}
async function reconcile(db:SupabaseClient,connection:SellerConnection,item:Record<string,unknown>){
 for(const status of ['requested','uncertain']){
  const pending=await db.from('marketplace_listing_actions').select('id,request_payload').eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('provider_listing_id',item.id).eq('action','edit').eq('status',status);
  if(pending.error)throw new MarketplaceError(503,'audit_database','Não foi possível conferir a edição anterior.');
  for(const row of pending.data||[]){const change=object(object(row.request_payload).contentChanges);if(!['pictures','attributes'].includes(String(change.kind))||!contentMatches(item,change.kind as ContentKind,change.desired)||!change.baseline||!contentPreserved(object(change.baseline),item,change.kind as ContentKind,change.desired))continue;
   const saved=await db.from('marketplace_listing_actions').update({status:'succeeded',error_code:null}).eq('empresa_id',connection.empresa_id).eq('connection_id',connection.id).eq('id',row.id).eq('status',status);if(saved.error)throw new MarketplaceError(503,'audit_database','Dados conferidos, mas não foi possível registrar a confirmação.');
  }
 }
}
export async function readListingContent(db:SupabaseClient,company:string,connectionId:unknown,id:unknown,kind:unknown,localDraft=false){
 const connection=await loadConnection(db,company,connectionId),result=await context(db,connection,id,kind);
 for(const item of result.items)await reconcile(db,connection,item);
 // Rascunho não altera o ML. Preserva identidade/campos fixos, mas não confunde
 // uma restrição global de envio com a possibilidade de preparar dados locais.
 if(localDraft)result.editor.attributes=contentAttributes(result.schema,result.item.attributes);
 return result.editor;
}
async function prepareChange(db:SupabaseClient,company:string,connection:SellerConnection,current:Awaited<ReturnType<typeof context>>,input:Record<string,unknown>){
 const {editor}=current;
 if(editor.reason)throw new MarketplaceError(409,'content_locked',editor.reason);
 if(input.revision!==editor.revision||JSON.stringify(input.affectedIds)!==JSON.stringify(editor.affectedIds))throw new MarketplaceError(409,'edit_conflict','O anúncio, suas permissões ou os anúncios afetados mudaram. Recarregue mantendo seus valores para revisão.');
 const pending=await db.from('marketplace_listing_actions').select('id').eq('empresa_id',company).eq('connection_id',connection.id).in('provider_listing_id',editor.affectedIds).eq('action','edit').in('status',['requested','uncertain']);
 if(pending.error||pending.data?.length)throw new MarketplaceError(409,'pending_edit','Existe uma alteração anterior sem confirmação. Recarregue para conferir; não reenvie antes de resolver a pendência.');
 let desired:unknown,body:Record<string,unknown>;
 try{
  if(editor.kind==='pictures'){desired=validatePictureIds(editor,input.values,current.items);body={pictures:(desired as string[]).map(id=>({id}))};}
  else{desired=attributeChanges(editor,input.values);const ignored=rows(desired).map(a=>String(a.id)),base=contentAttributeFingerprint(current.item.attributes,ignored);if(current.items.some(a=>contentAttributeFingerprint(a.attributes,ignored)!==base))throw new Error('Os anúncios compartilhados possuem características não editadas divergentes. A edição foi bloqueada para preservar esses valores.');body={attributes:mergeContentAttributes(current.item.attributes,desired as Record<string,unknown>[])};}
 }catch(e){throw new MarketplaceError(400,'invalid_fields',e instanceof Error?e.message:'Dados inválidos.');}
 return {desired,body};
}
/** Pré-validação sem escrita para a revisão de todos os destinos do produto. */
export async function previewListingContent(db:SupabaseClient,company:string,connectionId:unknown,input:Record<string,unknown>){
 const connection=await loadConnection(db,company,connectionId),current=await context(db,connection,input.id,input.kind);
 await prepareChange(db,company,connection,current,input);
 return current.editor;
}
export async function saveListingContent(db:SupabaseClient,company:string,connectionId:unknown,actor:string,input:Record<string,unknown>){
 if(!uuidIsValid(input.requestKey)||typeof input.revision!=='string'||!/^[a-f0-9]{64}$/.test(input.revision)||input.confirmation!==input.id)throw new MarketplaceError(400,'invalid_edit','Revise e confirme o anúncio antes de salvar.');
 const connection=await loadConnection(db,company,connectionId),current=await context(db,connection,input.id,input.kind),{editor}=current;
 const {desired,body}=await prepareChange(db,company,connection,current,input);
 const audits=editor.affectedIds.map(id=>({empresa_id:company,connection_id:connection.id,provider_listing_id:id,action:'edit',request_key:id===editor.id?input.requestKey:randomUUID(),actor_id:actor,request_payload:{contentChanges:{kind:editor.kind,desired,baseline:contentBaseline(current.items.find(a=>a.id===id)!)},affectedIds:editor.affectedIds}}));
 const inserted=await db.from('marketplace_listing_actions').insert(audits).select('id');
 if(inserted.error||inserted.data?.length!==audits.length)throw new MarketplaceError(inserted.error?.code==='23505'?409:503,'edit_audit_unavailable','Há uma edição pendente ou não foi possível reservar o histórico. Nenhuma alteração foi enviada.');
 const auditIds=inserted.data.map((row:{id:string})=>row.id);let sent=false;
 async function finish(status:string,code:string|null){const saved=await db.from('marketplace_listing_actions').update({status,error_code:code}).eq('empresa_id',company).eq('connection_id',connection.id).in('id',auditIds);if(saved.error)throw new MarketplaceError(503,'audit_database','Não foi possível registrar a confirmação.');}
 try{
  const locked=await context(db,connection,input.id,input.kind);if(locked.editor.revision!==editor.revision)throw new MarketplaceError(409,'edit_conflict','Os dados mudaram durante a confirmação. Recarregue antes de enviar.');
  await mlRequest(db,connection,`/items/${editor.id}`,'PUT',body);sent=true;
  const confirmed=await context(db,connection,input.id,input.kind);
  if(JSON.stringify(confirmed.protectedItems.map(a=>a.id).sort())!==JSON.stringify(current.protectedItems.map(a=>a.id).sort())||confirmed.protectedItems.some(item=>{const before=current.protectedItems.find(a=>a.id===item.id)!;return JSON.stringify(contentBaseline(before))!==JSON.stringify(contentBaseline(item));}))throw new MarketplaceError(409,'edit_not_confirmed','Não foi possível confirmar a preservação das fotos e da ficha dos anúncios de catálogo relacionados.');
  if(JSON.stringify(confirmed.editor.affectedIds)!==JSON.stringify(editor.affectedIds)||confirmed.items.some(item=>!contentMatches(item,editor.kind,desired)||!contentPreserved(current.items.find(a=>a.id===item.id)!,item,editor.kind,desired)))throw new MarketplaceError(409,'edit_not_confirmed','O ML ainda não confirmou todos os valores e a preservação dos dados nos anúncios afetados.');
  for(const item of confirmed.items)await saveListing(db,connection,item,false);
  await finish('succeeded',null);return {success:true,pending:false,editor:confirmed.editor,message:'Alteração confirmada pelo Mercado Livre em todos os anúncios afetados. Atualize os objetivos para acompanhar o recálculo da nota.'};
 }catch(error){
  const uncertain=sent||(error instanceof MarketplaceError&&(error.code==='mutation_uncertain'||/^provider_5\d\d$/.test(error.code)));
  await finish(uncertain?'uncertain':'failed',error instanceof MarketplaceError?error.code:'integration');
  if(uncertain)throw new MarketplaceError(409,'edit_uncertain','A alteração pode ter sido recebida. Recarregue para conferir os dados; não reenvie automaticamente. A nota e a propagação podem levar tempo.');throw error;
 }
}
