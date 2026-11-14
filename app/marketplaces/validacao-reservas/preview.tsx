'use client';
import {useCallback,useEffect,useState,type CSSProperties} from 'react';
import PriceProductStock from '../PriceProductStock';
import type {LotsRequest} from '../usePriceLotCapture';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import styles from '../marketplaces.module.css';
type Sync={pending:boolean;failed:boolean;remoteQuantity:number;remoteStatus:string;accounts:string[]};
export default function Preview(){
 const [ids,setIds]=useState<{companyId:string;productId:string}|null>(null),[sync,setSync]=useState<Sync|null>(null),[error,setError]=useState(''),[dark,setDark]=useState(false),[wide,setWide]=useState(false);
 const request=useCallback<LotsRequest>(async(path,options)=>{
  const r=await fetch('/api/modulos/marketplaces/validacao-reservas',{method:'POST',headers:{'Content-Type':'application/json'},signal:options?.signal,body:JSON.stringify({path,body:options?.body?JSON.parse(String(options.body)):{}})});const body=await r.json();if(!r.ok)throw Error(body.message||'Falha na prévia local.');return body;
 },[]);
 const load=useCallback(async()=>{try{setSync(await request('sync-status') as Sync);}catch(e){setError((e as Error).message);}},[request]);
 useEffect(()=>{let active=true;void request('bootstrap').then(b=>{if(active)setIds(b as NonNullable<typeof ids>);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[request]);
 useEffect(()=>{if(!ids)return;void load();const t=setInterval(()=>void load(),1500);return()=>clearInterval(t);},[ids,load]);
 async function deliver(fail:boolean){try{setSync(await request('simulated-sync',{method:'POST',body:JSON.stringify({fail})}) as Sync);}catch(e){setError((e as Error).message);}}
 return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{'--brand':'#003e73','--marketplace-brand':'#003e73',padding:16,maxWidth:wide?1100:430,margin:'0 auto',minHeight:'100vh'} as CSSProperties}>
  <h1 style={{fontSize:20}}>{wide?'Marketplaces · Produtos cadastrados':'AvantaPreços · Reservas'}</h1><p>Teste local com banco isolado e anúncios simulados. Nenhuma conta ou anúncio real é alterado.</p>
  <div style={{display:'flex',gap:8}}><BotaoAcaoCompacto onClick={()=>setDark(!dark)}>Alternar tema</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>setWide(!wide)}>Mobile / Web</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>void request('reset').then(()=>window.location.reload()).catch(e=>setError(e.message))}>Reiniciar teste</BotaoAcaoCompacto></div>
  {error&&<p role="alert">{error}</p>}
  <section className={styles.panel}><h2 style={{fontSize:18}}>Liquidificador · Produto de teste</h2><p>EAN 7909569454787</p>{wide&&<header className={styles.productSectionHeader}><h3>Estoques e movimentações</h3><span>Todos os estoques</span></header>}{ids?<PriceProductStock compactSummary={!wide} companyId={ids.companyId} productId={ids.productId} request={request} dark={dark} brand="#003e73" showRemoval={false} showInternalNotes={false}/>:<p role="status">Preparando banco local…</p>}</section>
  {sync&&<section className={styles.panel} aria-label="Anúncios simulados"><h2 style={{fontSize:18}}>Anúncios simulados</h2><p role="status">{sync.pending?(sync.failed?'Envio falhou. Reserva local mantida; sincronização pendente.':'Sincronização pendente. Processe o envio abaixo.'):'Último envio conferido nos anúncios simulados.'}</p>{sync.accounts.map(a=><p key={a}><strong>{a}</strong> · {sync.remoteQuantity} un. · {sync.remoteStatus==='active'?'Ativo':'Pausado'}</p>)}<div style={{display:'flex',flexWrap:'wrap',gap:8}}><BotaoAcaoCompacto onClick={()=>void deliver(false)}>Processar anúncios simulados</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>void deliver(true)}>Simular falha de envio</BotaoAcaoCompacto></div></section>}
 </main>;
}
