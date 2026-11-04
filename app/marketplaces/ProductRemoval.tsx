'use client';
import {useEffect,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {removalNeedsDeletion,type ProductRemovalReview} from '@/app/modules/marketplaces/product-removal';
import type {LotsRequest} from './usePriceLotCapture';
import {notifyProductStockChanged,notifyProductListingsRemoved} from './product-stock-events';
import styles from './ProductRemoval.module.css';
type Outcome={productId:string;mode:'deleted'|'archived'};
type Props={companyId:string;productId:string;request:LotsRequest;endpoint?:string;disabled?:boolean;dark?:boolean;brand?:string;onBusyChange?:(busy:boolean)=>void;onRemoved:(result:Outcome)=>void;preserveProduct?:boolean;onListingsRemoved?:()=>void};
async function removalRequest<T>(request:LotsRequest,endpoint:string,body:Record<string,unknown>,timeout:number):Promise<{result:T}>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([request(endpoint,{method:'POST',signal:controller.signal,body:JSON.stringify(body)}) as Promise<{result:T}>,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{reject(new Error('A operação demorou. Confira o cadastro antes de tentar novamente.'));controller.abort();},timeout);})]);}
 finally{clearTimeout(timer);}
}
export default function ProductRemoval({companyId,productId,request,endpoint='/api/modulos/marketplaces/produtos/excluir',disabled,dark,brand,onBusyChange,onRemoved,preserveProduct=false,onListingsRemoved}:Props){
 const [open,setOpen]=useState(false),[review,setReview]=useState<ProductRemovalReview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [linkedBusy,setLinkedBusy]=useState(false),[deleteAds,setDeleteAds]=useState(false),[progress,setProgress]=useState('');
 const [success,setSuccess]=useState('');
 const working=busy||linkedBusy;
 useEffect(()=>{onBusyChange?.(working);return()=>onBusyChange?.(false);},[working,onBusyChange]);
 const locked=useRef(false),attempt=useRef<string|undefined>(undefined);
 async function inspect(){
  if(locked.current)return;locked.current=true;setBusy(true);setOpen(true);setError('');setSuccess('');setReview(null);setDeleteAds(false);setProgress('');attempt.current=undefined;
  try{
   const body=await removalRequest<ProductRemovalReview>(request,endpoint,{empresaId:companyId,productId,action:'review'},55_000);
   if(!body.result?.product?.id||!Array.isArray(body.result.blockers)||!Array.isArray(body.result.proofs))throw new Error('Não foi possível conferir o produto. Tente novamente.');
   if(!preserveProduct&&body.result.mode!=='deleted')throw new Error('A exclusão simplificada precisa da atualização do banco. Nenhum produto foi alterado.');
   setReview(body.result);
  }catch(failure){setError(failure instanceof Error?failure.message:'Não foi possível conferir o produto.');}
  finally{locked.current=false;setBusy(false);}
 }
 async function remove(){
  if(locked.current||linkedBusy||disabled||!review||blocked||needsAds&&!deleteAds)return;
  locked.current=true;setBusy(true);setError('');attempt.current ||= crypto.randomUUID();
  try{
   const confirmation={empresaId:companyId,productId,revision:review.product.revision,mode:'deleted',confirmation:review.product.name,acknowledged:true,discoveryKey:review.discoveryKey};
   if(needsAds){
    setLinkedBusy(true);
    for(const target of review.targets||[]){
     const proof=review.proofs.find(p=>p.linkId===target.id);
     if(proof&&!removalNeedsDeletion(proof.status))continue;
     setProgress(`Excluindo anúncio ${target.provider_listing_id} · ${target.accountName||'Conta conectada'}…`);
     const response=await removalRequest<{listingId:string;status:string}>(request,endpoint,{...confirmation,action:'delete_listing',connectionId:target.connection_id,listingId:target.provider_listing_id,requestKey:crypto.randomUUID()},58_000);
     if(response.result?.listingId!==target.provider_listing_id||removalNeedsDeletion(response.result.status))throw new Error('A exclusão do anúncio não foi confirmada. O cadastro local foi preservado.');
    }
   }
   if(preserveProduct){
    setProgress('Conferindo a exclusão dos anúncios…');
    const final=await removalRequest<ProductRemovalReview>(request,endpoint,{empresaId:companyId,productId,action:'review'},55_000);
    const checked=final.result;
    if(checked?.product?.id!==productId||!Array.isArray(checked.targets)||!Array.isArray(checked.proofs)||checked.proofs.length!==checked.targets.length||checked.workBlocked||checked.discoveryBlockers?.length||checked.proofs.some(p=>p.error||removalNeedsDeletion(p.status)))throw new Error('A exclusão de todos os anúncios ainda não foi confirmada. Confira as contas indicadas.');
    setOpen(false);setSuccess('Anúncios excluídos. Cadastro, saldos e históricos do produto preservados.');notifyProductStockChanged(companyId);notifyProductListingsRemoved(companyId);onListingsRemoved?.();return;
   }
   setProgress('Confirmando a exclusão do cadastro…');
   const body=await removalRequest<Outcome>(request,endpoint,{...confirmation,action:'remove',requestKey:attempt.current},58_000);
   if(body.result?.productId!==productId||body.result.mode!=='deleted')throw new Error('A exclusão não foi confirmada. Confira o cadastro antes de repetir.');
   setOpen(false);notifyProductStockChanged(companyId);onRemoved(body.result);
  }catch(failure){
   if(preserveProduct&&needsAds){notifyProductStockChanged(companyId);notifyProductListingsRemoved(companyId);}
   setError((failure instanceof Error?failure.message:'A exclusão não foi confirmada. Confira o cadastro.')+(needsAds?' O cadastro local foi preservado. Confira novamente; anúncios já excluídos não são recriados.':''));
   // Uma recusa confirmada precisa de uma leitura nova, não de repetir revisão já vencida.
   const code=(failure as {code?:string})?.code;
   if(needsAds||code==='removal_changed'||code==='removal_blocked'){setReview(null);setDeleteAds(false);attempt.current=undefined;}
  }
  finally{locked.current=false;setBusy(false);setLinkedBusy(false);setProgress('');}
 }
 const needsAds=!!review?.proofs.some(p=>!p.error&&removalNeedsDeletion(p.status));
 const blocked=!!review&&(review.targets?review.workBlocked||!!review.discoveryBlockers?.length||review.proofs.some(p=>!!p.error):!!review.blockers.length);
 return <div className={`${styles.root} ${dark?styles.dark:''}`}>
  <BotaoAcaoCompacto variante="destrutivo" disabled={disabled||working} onClick={()=>void inspect()}>{preserveProduct?'Excluir anúncios':'Excluir produto'}</BotaoAcaoCompacto>
  {success&&<p role="status">{success}</p>}
  {open&&<section className={styles.review} aria-label={preserveProduct?'Confirmar exclusão dos anúncios':'Confirmar exclusão do produto'} aria-busy={working}>
   <h4>{preserveProduct?'Excluir anúncios?':'Excluir produto?'}</h4>
   {working&&<p role="status">{progress||'Conferindo o produto e os anúncios…'}</p>}
   {review&&<><strong>{review.product.name}</strong><p>{preserveProduct?'Os anúncios abaixo serão excluídos dos marketplaces e de Anunciados após a confirmação de cada conta. O cadastro, seus saldos e históricos serão preservados.':'Ao confirmar, o cadastro e seus saldos serão excluídos definitivamente. Vendas e registros financeiros existentes serão preservados.'}</p>
    <p>A conferência considera os vínculos e o mesmo EAN nos anúncios sincronizados de todas as contas, com confirmação da situação no marketplace.{!review.product.ean&&' Sem EAN, não é possível identificar anúncios sem vínculo com segurança.'}</p>
    {blocked&&<ul role="alert">{review.blockers.map(message=><li key={message}>{message}</li>)}</ul>}
    {!!review.targets?.length&&<><h4>Anúncios encontrados em todas as contas</h4><ul>{review.targets.map(target=>{const proof=review.proofs.find(p=>p.linkId===target.id);return <li key={target.id}><strong>{target.accountName||target.provider} · {target.provider_listing_id}</strong> — {target.unlinked?'Mesmo EAN, sem vínculo local. ':''}{proof?.error||(!proof?'Não conferido':removalNeedsDeletion(proof.status)?'Será excluído no marketplace.':'Exclusão já confirmada.')}</li>;})}</ul></>}
    {needsAds&&!blocked&&<label className={styles.ack}><input type="checkbox" checked={deleteAds} disabled={working} onChange={e=>setDeleteAds(e.target.checked)}/>{preserveProduct?'Confirmo excluir os anúncios de todas as contas indicadas, mantendo o cadastro do produto.':'Confirmo encerrar e excluir os anúncios acima no marketplace, em todas as contas indicadas, e depois excluir definitivamente o produto.'}</label>}
   </>}
   {error&&<p role="alert">{error}</p>}
   <div className={styles.actions}>
    <BotaoAcaoCompacto disabled={working} onClick={()=>{setOpen(false);setReview(null);setError('');}}>Cancelar</BotaoAcaoCompacto>
    {(!review||blocked)&&<BotaoAcaoCompacto disabled={working||!!disabled} onClick={()=>void inspect()}>Conferir novamente</BotaoAcaoCompacto>}
    <BotaoAcaoCompacto variante="destrutivo" disabled={working||!!disabled||!review||blocked||needsAds&&!deleteAds} onClick={()=>void remove()}>{preserveProduct?'Confirmar exclusão dos anúncios':needsAds?'Excluir anúncios e produto':'Confirmar exclusão'}</BotaoAcaoCompacto>
   </div>
   {review&&blocked&&<p>Resolva a pendência e confira novamente. Nenhum anúncio será excluído sem sua confirmação. Em caso de falha, o cadastro local é preservado; anúncios já excluídos não são recriados.</p>}
  </section>}
 </div>;
}
