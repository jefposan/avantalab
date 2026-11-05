'use client';
import {useEffect,useRef,useState} from 'react';
import PriceSearchProgress from '../../PriceSearchProgress';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {waitForPriceSearch} from '@/app/modules/marketplaces/price-search-cancellation';
export default function Preview(){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[query,setQuery]=useState('Air fryer');
 const active=useRef<AbortController|null>(null),run=useRef(0);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function start(){const id=++run.current,controller=new AbortController();active.current=controller;setBusy(true);setNotice('');try{await waitForPriceSearch(60000,controller.signal);if(run.current===id)setNotice('Simulação concluída.');}catch{if(run.current===id)setNotice('Falha simulada.');}finally{if(run.current===id)setBusy(false);}}
 function cancel(){run.current++;active.current?.abort();active.current=null;setBusy(false);setNotice('Pesquisa cancelada.');}
 return <main style={{padding:16,maxWidth:420,margin:'0 auto'}}><small>Prévia local fictícia · sem pesquisa externa</small><h1 style={{fontSize:22}}>Pesquisa de produtos</h1>
 <label htmlFor="preview-query">Produto<input id="preview-query" value={query} onChange={e=>setQuery(e.target.value)} disabled={busy} style={{display:'block',width:'100%',minHeight:48,border:'1px solid #cbd5e1',borderRadius:12,padding:'0 12px',margin:'8px 0',fontSize:16}}/></label>
 <BotaoAcaoCompacto variante="primario" disabled={busy} onClick={()=>void start()}>Pesquisar na internet</BotaoAcaoCompacto>
 {busy&&<PriceSearchProgress onCancel={cancel} brand="#003e73"/>}{notice&&<p role="status">{notice}</p>}
 <p style={{fontSize:12}}>A simulação aguarda até um minuto. Cancelar libera imediatamente os controles.</p></main>;
}
