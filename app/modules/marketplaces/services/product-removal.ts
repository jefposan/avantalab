import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {MarketplaceError} from './management-access';
import {uuidIsValid,objectValue} from './listing-model';
import {integrationAdapter} from './integration-adapters';
import {removalBlockers,removalNeedsDeletion,type ProductRemovalReview,type RemovalProof,type RemovalTarget} from '../product-removal';

async function targets(db:SupabaseClient,company:string,actor:string,productId:unknown):Promise<RemovalTarget[]>{
 const found=await db.rpc('marketplace_product_removal_candidates',{p_company:company,p_actor:actor,p_product:productId});
 if(found.error||!Array.isArray(found.data))throw new MarketplaceError(503,'removal_discovery','Não foi possível conferir os anúncios de todas as contas. Nenhum produto foi excluído.');
 if(found.data.length>100)throw new MarketplaceError(409,'removal_discovery','Há muitos anúncios para uma única conferência. Solicite a revisão dos vínculos antes de excluir.');
 return found.data as RemovalTarget[];
}
const scope=(product:ProductRemovalReview['product'],rows:RemovalTarget[])=>createHash('sha256').update(JSON.stringify([product.id,product.revision,product.ean,rows.map(row=>[row.id,row.connection_id,row.provider,row.provider_listing_id,row.unlinked,row.conflict]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))])).digest('hex');
const eanKey=(value:unknown)=>String(value||'').replace(/\D/g,'').replace(/^0+/,'');
function checkIdentity(target:RemovalTarget,listing:{ean:string|null;variations:Array<{ean?:string|null}>},ean:string|null){
 if(!target.unlinked)return;
 const identity=eanKey(ean),variations=listing.variations||[];
 if(!identity||!(eanKey(listing.ean)===identity||variations.some(v=>eanKey(v.ean)===identity))||variations.some(v=>eanKey(v.ean)&&eanKey(v.ean)!==identity))throw new MarketplaceError(409,'removal_identity','O EAN ou as variações do anúncio não correspondem exclusivamente a este produto. Confira o vínculo antes de excluir.');
}
async function confirmPriorActions(db:SupabaseClient,company:string,target:RemovalTarget,status:string){
 const pending=await db.from('marketplace_listing_actions').select('id,action,status').eq('empresa_id',company).eq('connection_id',target.connection_id).eq('provider_listing_id',target.provider_listing_id).in('status',['requested','uncertain']).limit(100);
 if(pending.error)throw new Error('Não foi possível conferir operações anteriores deste anúncio.');
 for(const row of pending.data||[]){
  const proven=row.action==='close'&&['closed','deleted'].includes(status)||row.action==='delete'&&status==='deleted';
  if(!proven)throw new Error('Há uma alteração anterior ainda não confirmada neste anúncio. Confira a situação antes de excluir.');
  const saved=await db.from('marketplace_listing_actions').update({status:'succeeded',error_code:null}).eq('empresa_id',company).eq('connection_id',target.connection_id).eq('provider_listing_id',target.provider_listing_id).eq('id',row.id).eq('status',row.status);
  if(saved.error)throw new Error('O resultado foi conferido, mas sua confirmação ainda não foi salva.');
 }
 if(pending.data?.length===100)throw new Error('Há muitas operações anteriores para conferir. Solicite a revisão deste anúncio.');
}

async function context(db:SupabaseClient,company:string,actor:string,productId:unknown) {
 if(!uuidIsValid(productId))throw new MarketplaceError(400,'invalid_product','Selecione um produto válido.');
 const result=await db.rpc('marketplace_product_removal_context',{p_company:company,p_actor:actor,p_product:productId});
 if(result.error)throw new MarketplaceError(result.error.code==='P0001'?409:503,'removal_review',result.error.code==='P0001'?result.error.message:'Não foi possível preparar a exclusão. Confira a atualização do banco.');
 if(!result.data?.product?.id||!Array.isArray(result.data.product.links)||!Array.isArray(result.data.accounts)||!Array.isArray(result.data.allocations))throw new MarketplaceError(503,'removal_review','A conferência do cadastro veio incompleta. Nenhum produto foi removido.');
 return result.data as Omit<ProductRemovalReview,'proofs'|'blockers'>;
}

/** Todas as contas vinculadas, sem usar o filtro ativo da tela. Somente leitura remota. */
export async function reviewProductRemoval(db:SupabaseClient,company:string,actor:string,productId:unknown):Promise<ProductRemovalReview> {
 const initial=await context(db,company,actor,productId),found=await targets(db,company,actor,productId),proofs:RemovalProof[]=[];
 let cursor=0,expired=false;
 const read=async()=>{
  while(!expired&&cursor<found.length){
   const link=found[cursor++];
   const proof:RemovalProof={linkId:link.id,connectionId:link.connection_id,listingId:link.provider_listing_id,status:'unknown',checkedAt:new Date().toISOString()};
   try{
    if(link.conflict)throw new Error('Anúncio do mesmo EAN vinculado a outro cadastro. Confira o vínculo antes de excluir.');
    const adapter=await integrationAdapter(db,company,link.connection_id);
    if(adapter.provider!==link.provider)throw new Error('A conta do anúncio não corresponde ao vínculo.');
    const listing=await adapter.read(link.provider_listing_id);
    if(listing.id!==link.provider_listing_id)throw new Error('O marketplace retornou outro anúncio.');
    checkIdentity(link,listing,initial.product.ean);
    proof.status=listing.substatus.includes('deleted')?'deleted':listing.status.toLowerCase();proof.checkedAt=new Date().toISOString();
    await confirmPriorActions(db,company,link,proof.status);
    if(adapter.provider==='mercado_livre'){
     const observed=await db.rpc('marketplace_observe_listing',{p_empresa:company,p_connection:link.connection_id,p_listing:listing.id,p_quantity:listing.stock,p_status:proof.status});
     if(observed.error)throw new Error('Não foi possível registrar a situação conferida.');
    }
   }catch(failure){proof.error=failure instanceof Error?failure.message:'Conferência indisponível.';}
   proofs.push(proof);
  }
 };
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  await Promise.race([Promise.all(Array.from({length:Math.min(4,found.length)},read)),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new MarketplaceError(503,'removal_timeout','A conferência das contas demorou. Nenhum cadastro foi removido; tente novamente.'));},42_000);})]);
 }finally{clearTimeout(timer);}
 const latest=await context(db,company,actor,productId),current=await targets(db,company,actor,productId);
 const discoveryBlockers:string[]=[];
 if(scope(initial.product,found)!==scope(latest.product,current))discoveryBlockers.push('Os vínculos mudaram durante a conferência. Atualize novamente.');
 if(found.some(row=>row.conflict))discoveryBlockers.push('Há anúncio do mesmo EAN vinculado a outro cadastro. Confira o vínculo antes de excluir.');
 const review={...latest,targets:found,discoveryKey:scope(latest.product,current),discoveryBlockers,proofs,blockers:[...discoveryBlockers]};
 review.blockers.push(...removalBlockers(review));
 if(proofs.some(p=>!p.error&&removalNeedsDeletion(p.status))&&!review.blockers.some(b=>b.includes('Encerre ou exclua')))review.blockers.push('Confirme também a exclusão dos anúncios encontrados.');
 return review;
}

/** Uma confirmação explícita por conjunto exibido; cada chamada trata um único anúncio. */
export async function deleteRemovalListing(db:SupabaseClient,company:string,actor:string,raw:unknown){
 const input=objectValue(raw);
 if(input.acknowledged!==true||!uuidIsValid(input.requestKey))throw new MarketplaceError(400,'removal_confirmation','Confirme a exclusão dos anúncios exibidos.');
 const review=await reviewProductRemoval(db,company,actor,input.productId);
 if(review.discoveryKey!==input.discoveryKey||review.product.revision!==input.revision||review.product.name!==input.confirmation)throw new MarketplaceError(409,'removal_changed','O produto ou os anúncios mudaram. Confira a exclusão novamente.');
 if(review.workBlocked||review.discoveryBlockers?.length||review.proofs.some(p=>p.error))throw new MarketplaceError(409,'removal_blocked','Não foi possível conferir todos os anúncios. Resolva as pendências antes de excluir.');
 const target=review.targets?.find(row=>row.connection_id===input.connectionId&&row.provider_listing_id===input.listingId);
 if(!target)throw new MarketplaceError(403,'removal_target','Este anúncio não pertence à conferência deste produto.');
 const adapter=await integrationAdapter(db,company,target.connection_id);
 if(adapter.provider!==target.provider)throw new MarketplaceError(409,'removal_changed','A integração da conta mudou. Confira novamente.');
 let listing=await adapter.read(target.provider_listing_id);
 checkIdentity(target,listing,review.product.ean);
 const status=()=>listing.substatus.includes('deleted')?'deleted':listing.status.toLowerCase();
 if(!removalNeedsDeletion(status()))return {listingId:listing.id,status:status()};
 const mutate=async(action:string)=>{
  const hash=createHash('sha256').update(JSON.stringify([input.requestKey,target.connection_id,target.provider_listing_id,action])).digest('hex');
  const requestKey=`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
  const result=await adapter.mutate(actor,{id:listing.id,action,requestKey,confirmation:listing.id});
  if(result.pending)throw new MarketplaceError(409,'mutation_uncertain','O marketplace ainda não confirmou a exclusão. Confira novamente antes de continuar; o produto foi preservado.');
  listing=await adapter.read(target.provider_listing_id);
 };
 if(adapter.provider==='mercado_livre'&&['active','paused'].includes(status()))await mutate('close');
 if(adapter.provider==='mercado_livre'&&status()!=='closed'&&!(status()==='under_review'&&listing.substatus.includes('forbidden')))throw new MarketplaceError(409,'removal_remote_state','O anúncio não pode ser excluído nesta situação. Confira o anúncio; o cadastro foi preservado.');
 await mutate('delete');
 if(removalNeedsDeletion(status()))throw new MarketplaceError(409,'mutation_uncertain','A exclusão do anúncio não foi confirmada. O cadastro local foi preservado.');
 return {listingId:listing.id,status:status()};
}

export async function removeProduct(db:SupabaseClient,company:string,actor:string,raw:unknown) {
 const input=objectValue(raw);
 if(!uuidIsValid(input.requestKey)||!Number.isSafeInteger(input.revision)||!['deleted','archived'].includes(String(input.mode))||input.acknowledged!==true)throw new MarketplaceError(400,'removal_confirmation','Confira a remoção e confirme os dados exibidos.');
 const previous=await db.from('marketplace_product_removals').select('actor_id,product_id,mode,snapshot').eq('empresa_id',company).eq('request_key',input.requestKey).maybeSingle();
 if(previous.error)throw new MarketplaceError(503,'removal_audit','Não foi possível conferir esta tentativa de remoção. Nenhuma nova operação foi iniciada.');
 if(previous.data){
  if(previous.data.actor_id!==actor||previous.data.product_id!==input.productId||previous.data.mode!==input.mode||previous.data.snapshot?.product?.name!==input.confirmation)throw new MarketplaceError(409,'removal_changed','Esta tentativa já foi usada para outros dados. Confira o cadastro.');
  return {productId:previous.data.product_id,mode:previous.data.mode as 'deleted'|'archived',replayed:true};
 }
 // Refaz a leitura remota no servidor; não confia nas situações enviadas pelo navegador.
 const review=await reviewProductRemoval(db,company,actor,input.productId);
 if(review.blockers.length)throw new MarketplaceError(409,'removal_blocked',review.blockers.join(' '));
 if(review.discoveryKey!==input.discoveryKey)throw new MarketplaceError(409,'removal_changed','Os anúncios encontrados mudaram. Confira a exclusão novamente.');
 if(review.product.revision!==input.revision||review.mode!==input.mode||review.product.name!==input.confirmation)throw new MarketplaceError(409,'removal_changed','O produto mudou. Confira a exclusão novamente.');
 const linked=new Set(review.product.links.map(link=>link.id));
 const result=await db.rpc('marketplace_product_remove_checked',{p_company:company,p_actor:actor,p_product:input.productId,p_revision:input.revision,p_mode:input.mode,p_confirmation:input.confirmation,p_key:input.requestKey,p_proofs:review.proofs.filter(p=>linked.has(p.linkId)),p_discovery:review.proofs});
 if(result.error)throw new MarketplaceError(result.error.code==='P0001'?409:503,result.error.code==='P0001'?'removal_changed':'removal_failed',result.error.code==='P0001'?result.error.message:'A remoção não foi confirmada. Confira o cadastro antes de repetir.');
 return result.data as {productId:string;mode:'deleted'|'archived';replayed:boolean};
}
