'use client';
import {useEffect,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import MarketplaceSelect from './MarketplaceSelect';
import {marketplaceClientRequest} from './Anunciados';
import {notifyProductStockChanged} from './product-stock-events';
import type {InventoryNotice} from '@/app/modules/marketplaces/live-feed';

export default function ImportStockChoice({notice,companyId,canManage,onAdjust}:{notice:InventoryNotice;companyId:string;canManage:boolean;onAdjust?:(notice:InventoryNotice)=>void}){
 const candidates=notice.candidateProducts||[];
 const [selected,setSelected]=useState(candidates.length===1?candidates[0].id:''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempted,setAttempted]=useState(false);
 const lock=useRef(false),alive=useRef(true),attempt=useRef<{product:string;key:string}|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function choose(){
  if(lock.current||!canManage||!candidates.some(p=>p.id===selected))return;
  const pending=attempt.current||{product:selected,key:crypto.randomUUID()};attempt.current=pending;lock.current=true;setBusy(true);setError('');setAttempted(true);
  try{
   const result=await marketplaceClientRequest('produtos',{empresaId:companyId,action:'choose_import_product',productId:pending.product,connectionId:notice.connectionId,listingId:notice.listingId,requestKey:pending.key},AbortSignal.timeout(30_000));
   if(result.product_id!==pending.product)throw new Error('O cadastro local não foi confirmado.');
   if(!alive.current)return;
   notifyProductStockChanged(companyId);
   onAdjust?.({...notice,source:'stock',productId:pending.product,productName:candidates.find(p=>p.id===pending.product)?.name||notice.productName,candidateProducts:undefined});
  }catch(failure){if(alive.current)setError(`${failure instanceof Error?failure.message:'Não foi possível confirmar.'} Tente conferir novamente com o mesmo cadastro ou atualize os avisos.`);}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <div>
  <MarketplaceSelect label="Cadastro local para conferir o estoque" value={selected} onChange={setSelected} disabled={!canManage||busy||attempted} options={candidates.map(p=>({value:p.id,label:`${p.name} · ${p.sku||p.id.slice(0,8)} · EAN ${p.ean||'não informado'}`}))} placeholder="Selecione o cadastro correto" />
  <small>O cadastro será preservado. Em seguida, confirme a quantidade física Online.</small>
  <BotaoAcaoCompacto disabled={!canManage||busy||!candidates.some(p=>p.id===selected)} onClick={()=>void choose()}>{busy?'Conferindo…':'Conferir estoque'}</BotaoAcaoCompacto>
  {!canManage&&<small>Solicite a conferência a um usuário com permissão de gestão.</small>}
  {error&&<p role="alert">{error}</p>}
 </div>;
}
