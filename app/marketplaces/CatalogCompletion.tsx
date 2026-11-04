'use client';
import {useEffect,useState} from 'react';
import type {marketplaceClientRequest} from './Anunciados';
import {MARKETPLACE_ACCOUNT_SYNCED} from './startup-account-sync';
import {CATALOG_CONTENT_CHANGED,CATALOG_COMPLETION_REQUESTED,notifyProductStockChanged} from './product-stock-events';
import styles from './marketplaces.module.css';
/** Nenhum overlay ou bloqueio; o servidor/cron conserva a fila ao sair da tela. */
export default function CatalogCompletion({companyId,enabled,request}:{companyId:string;enabled:boolean;request:typeof marketplaceClientRequest}){
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!enabled)return;
  let stopped=false,active=false,again=false;const controller=new AbortController();
  const read=async()=>{await request(`catalogo/completar?${new URLSearchParams({empresaId:companyId})}`,undefined,controller.signal);};
  async function run(){
   if(active){again=true;return;}active=true;if(!stopped)setError('');
   try{
    do{
     again=false;
     await request('catalogo/completar',{empresaId:companyId,action:'seed'},controller.signal);
     await read();
     while(!stopped){
      const result=await request('catalogo/completar',{empresaId:companyId,action:'next'},AbortSignal.any([controller.signal,AbortSignal.timeout(58_000)]));
      if(stopped)return;
      if(result.changed){notifyProductStockChanged(companyId);window.dispatchEvent(new CustomEvent(CATALOG_CONTENT_CHANGED,{detail:{companyId}}));window.dispatchEvent(new Event('avanta:quality-updated'));}
      if(!result.worked)break;
     }
    }while(again&&!stopped);
    if(!stopped)await read();
   }catch(failure){if(!stopped)setError(failure instanceof Error?failure.message:'A complementação continuará em segundo plano.');}
   finally{active=false;}
  }
  const changed=(event:Event)=>{if((event as CustomEvent).detail?.companyId===companyId)void run();};
  // StrictMode não inicia duas filas antes do cleanup.
  queueMicrotask(()=>{if(!stopped)void run();});window.addEventListener(MARKETPLACE_ACCOUNT_SYNCED,changed);window.addEventListener(CATALOG_COMPLETION_REQUESTED,changed);
  return()=>{stopped=true;controller.abort();window.removeEventListener(MARKETPLACE_ACCOUNT_SYNCED,changed);window.removeEventListener(CATALOG_COMPLETION_REQUESTED,changed);};
 },[companyId,enabled,request]);
 // A rotina continua em segundo plano; o card de contas só apresenta falhas.
 if(!enabled||!error)return null;
 return <p className={styles.connectionMessage} role="alert">{error} A retomada será tentada nas próximas sincronizações; envios incertos exigem conferência.</p>;
}
