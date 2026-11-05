'use client';
import {useEffect,useRef,useState} from 'react';
import type {LotsRequest} from './usePriceLotCapture';
import {DIRECT_SALES_PATH,notifyDirectSalesChanged} from '@/app/modules/marketplaces/direct-sales';
import {notifyProductStockChanged} from './product-stock-events';
export type DirectPending={requestKey:string;payload:Record<string,unknown>};
function read(key:string):DirectPending|null{
 if(typeof window==='undefined')return null;
 try{const p=JSON.parse(localStorage.getItem(key)||'null');return p&&typeof p.requestKey==='string'&&p.payload&&typeof p.payload==='object'?p:null;}catch{return null;}
}
export default function useDirectSaleCommand(companyId:string,actorId:string,scope:string,request:LotsRequest,endpoint=DIRECT_SALES_PATH,notifySales=true){
 const key=`avanta:direct-sale:v1:${companyId}:${actorId}:${scope}`;
 const [pending,setPending]=useState<DirectPending|null>(()=>read(key)),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const receipt=useRef(pending),locked=useRef(false),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function run(payload:Record<string,unknown>){
  if(locked.current)return false;
  if(!receipt.current&&read(key)){
   setError('Há uma tentativa anterior deste produto ou venda em outra tela. Feche e reabra este formulário para conferir e repetir os dados guardados. Nenhuma nova operação foi enviada.');return false;
  }
  const command=receipt.current||{requestKey:crypto.randomUUID(),payload};
  // Guardar antes de enviar. Fechar/recarregar a tela não perde a chave de uma resposta incerta.
  try{localStorage.setItem(key,JSON.stringify(command));}catch{setError('Não foi possível guardar a tentativa neste aparelho. Libere o armazenamento antes de confirmar. Nenhuma operação foi enviada.');return false;}
  receipt.current=command;locked.current=true;setPending(command);setSaving(true);setError('');
  try{
   const response=await request(endpoint,{method:'POST',signal:AbortSignal.timeout(50_000),body:JSON.stringify({empresaId:companyId,...command.payload,requestKey:command.requestKey})}) as {rejected?:boolean;message?:string;result?:unknown};
   if(response.rejected===true){
    localStorage.removeItem(key);receipt.current=null;
    if(alive.current){setPending(null);setError(response.message||'Operação rejeitada. Confira os dados.');}
    notifyProductStockChanged(companyId);return false;
   }
   if(!response.result)throw new Error('O servidor não confirmou o recibo da operação.');
   localStorage.removeItem(key);receipt.current=null;
   notifyProductStockChanged(companyId);if(notifySales)notifyDirectSalesChanged(companyId);
   if(alive.current)setPending(null);
   return true;
  }catch(e){if(alive.current)setError(`${e instanceof Error?e.message:'Não foi possível confirmar.'} A tentativa foi mantida. Repetir envia a mesma operação, sem duplicar.`);return false;}
  finally{locked.current=false;if(alive.current)setSaving(false);}
 }
 return {pending,saving,error,run};
}
