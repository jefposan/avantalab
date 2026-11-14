'use client';
import {useCallback,useEffect,useState,type CSSProperties} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {formatarMoeda} from '@/app/lib/formatters';
import PriceResearchDetails from '../PriceResearchDetails';
import type {MarketPriceResearch} from '@/app/modules/marketplaces/market-price-research';
import styles from './preview.module.css';
type Snapshot={product:{price_cents:number;revision:number;stock_quantity:number};research:MarketPriceResearch|null;notice:string};
export default function Preview(){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[scenario,setScenario]=useState('ready'),[wide,setWide]=useState(false),[dark,setDark]=useState(false);
 const call=useCallback(async(body:Record<string,unknown>)=>{setBusy(true);setError('');try{const r=await fetch('/api/modulos/marketplaces/validacao-precos-ml',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(data.message);setSnapshot(data);}catch(e){setError((e as Error).message);}finally{setBusy(false);}},[]);
 useEffect(()=>{void call({action:'context'});},[call]);
 const price=(snapshot?.product.price_cents||22000)/100;
 return <main className={styles.page} data-dark={dark||undefined} style={{'--brand':'#003e73'} as CSSProperties}>
  <aside className={styles.tools}><strong>Validação local · preços fictícios · nenhuma conta real é alterada</strong><div><BotaoAcaoCompacto onClick={()=>setWide(!wide)}>{wide?'Ver celular':'Ver Web'}</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>setDark(!dark)}>Alternar tema</BotaoAcaoCompacto><BotaoAcaoCompacto disabled={busy} onClick={()=>void call({action:'reset'})}>Reiniciar teste</BotaoAcaoCompacto></div><label>Cenário<select value={scenario} disabled={busy} onChange={e=>setScenario(e.target.value)}><option value="ready">49 ofertas · amostra completa</option><option value="insufficient">Somente um vendedor</option><option value="partial">Consulta parcial</option><option value="unavailable">Acesso negado pelo ML</option><option value="empty">Sem ofertas</option></select></label></aside>
  <div className={`${styles.product} ${wide?styles.wide:''}`}>
   <header className={styles.brand}><strong>SALDÃO ALINE</strong><small>Consulta rápida de produtos e preços</small></header>
   <article className={styles.card}><p className={styles.eyebrow}>PRODUTO LOCALIZADO</p><h1>Liquidificador Electrolux EBL1500 127V Cinza</h1><p className={styles.ean}>EAN 7909569454787</p>
    <div className={styles.prices}><div><span>Referência cadastrada</span><strong>{formatarMoeda(price)}</strong></div><div><span>Preço mínimo</span><strong>{formatarMoeda(price*.5)}</strong></div><div><span>Preço médio de venda</span><strong>{formatarMoeda(price*.7)}</strong></div><div><span>Preço ideal</span><strong>{formatarMoeda(price*.9)}</strong></div></div>
    {snapshot?.research&&<PriceResearchDetails key={snapshot.research.checkedAt} research={snapshot.research} dark={dark} brand="#003e73"/>}
    {error&&<p role="alert">{error}</p>}
    <BotaoAcaoCompacto variante="primario" disabled={busy||!snapshot} onClick={()=>void call({action:'research',scenario,revision:snapshot?.product.revision,requestKey:crypto.randomUUID()})}>{busy?'Consultando Mercado Livre…':'Atualizar preço'}</BotaoAcaoCompacto>
    <p role="status" className={styles.notice}>{snapshot?.notice||'Preparando banco de teste…'}</p>
   </article>
  </div>
 </main>;
}
