'use client';
import {useCallback,useEffect,useState,type CSSProperties} from 'react';
import PriceProductStock from '../PriceProductStock';
import Vendas from '../Vendas';
import {DIRECT_SALES_CHANGED,saleToday} from '@/app/modules/marketplaces/direct-sales';
import {salesSummary,salesInPeriod,type SaleGroup} from '@/app/modules/marketplaces/sales-status';
import {saleMarketplace,salesByMarketplaces,type SalesMarketplace} from '@/app/modules/marketplaces/sales-marketplace-filter';
import type {MarketplaceSale} from '@/app/modules/marketplaces/services/mercadolivre-sales';
import type {LotsRequest} from '../usePriceLotCapture';
import CampoData from '@/app/components/CampoData';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import styles from '../marketplaces.module.css';
export default function Preview(){
 const [ids,setIds]=useState<{companyId:string;productId:string;offlineId:string;onlineId:string}|null>(null),[sales,setSales]=useState<MarketplaceSale[]>([]),[error,setError]=useState(''),[dark,setDark]=useState(false),[pwa,setPwa]=useState(false),[stockBusy,setStockBusy]=useState(false),[expanded,setExpanded]=useState(true),[loading,setLoading]=useState(false),[group,setGroup]=useState<SaleGroup|''>(''),[channels,setChannels]=useState<SalesMarketplace[]>([]),[account,setAccount]=useState('');
 const today=saleToday(),[start,setStart]=useState(today.slice(0,7)+'-01'),[end,setEnd]=useState(today);
 const request=useCallback<LotsRequest>(async(path,options)=>{
  const r=await fetch('/api/modulos/marketplaces/validacao-vendas-diretas',{method:'POST',headers:{'Content-Type':'application/json'},signal:options?.signal,body:JSON.stringify({path,method:options?.method||'GET',body:options?.body?JSON.parse(String(options.body)):{}})});
  const data=await r.json();if(!r.ok)throw new Error(data.message||'Não foi possível testar a operação.');return data;
 },[]);
 const load=useCallback(async()=>{setLoading(true);try{const d=await request('sales-feed') as {sales:MarketplaceSale[]};setSales(d.sales);setError('');}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[request]);
 useEffect(()=>{let alive=true;void request('bootstrap').then(d=>{if(alive)setIds(d as NonNullable<typeof ids>);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[request]);
 useEffect(()=>{if(!ids)return;const frame=requestAnimationFrame(()=>void load());return()=>cancelAnimationFrame(frame);},[ids,load]);
 useEffect(()=>{const handler=()=>void load();window.addEventListener(DIRECT_SALES_CHANGED,handler);return()=>window.removeEventListener(DIRECT_SALES_CHANGED,handler);},[load]);
 const period=salesInPeriod(sales,{start,end}),filtered=salesByMarketplaces(period,channels).filter(s=>!account||s.connectionId===account),summary=salesSummary(filtered,''),visible=filtered.filter(s=>!group||s.status==='cancelled'&&group==='cancelled'||s.status!=='cancelled'&&group==='confirmed');
 const options=[...new Map(sales.map(s=>[saleMarketplace(s),{value:saleMarketplace(s),label:`${s.directSale?.warehouseName} · Venda direta`}])).values()];
 return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{'--marketplace-brand':'#003e73',padding:20,minHeight:'100vh',maxWidth:pwa?430:1200,margin:'0 auto'} as CSSProperties}>
  <p>Teste local — banco isolado com produtos e saldos fictícios. Sem produção, receitas financeiras ou nota fiscal.</p>
  <div className={styles.panelHeadingActions}><BotaoAcaoCompacto disabled={stockBusy} onClick={()=>setPwa(!pwa)}>{pwa?'Ver Web':'Ver AvantaPreços'}</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>setDark(!dark)}>Alternar tema</BotaoAcaoCompacto></div>
  <h1>{pwa?'AVANTAPREÇOS · TESTE LOCAL':'Estoques e vendas · Teste local'}</h1>
  {error&&<p role="alert">{error}</p>}
  {ids?<section className={styles.panel}><h2>Air Fryer · Produto de teste local</h2><PriceProductStock companyId={ids.companyId} productId={ids.productId} initialWarehouseId={ids.offlineId} request={request} dark={dark} brand="#003e73" onBusyChange={setStockBusy}/></section>:<p role="status">Preparando banco local de teste…</p>}
  <div style={{display:'flex',gap:12,marginBlock:16}}><label>Início<CampoData anoCurto value={start} onChange={setStart}/></label><label>Fim<CampoData anoCurto value={end} onChange={setEnd}/></label></div>
  {ids&&<Vendas companyId={ids.companyId} accountId={account} onAccountChange={setAccount} group={group} onGroupChange={setGroup} counts={summary.byGroup} total={summary.total} accounts={[]} marketplaceOptions={options} selectedMarketplaces={channels} onMarketplacesChange={setChannels} sales={visible} canManage loading={loading} error={error} awaitingUpdates={0} onRefresh={()=>void load()} onSaleUpdated={()=>void load()} expanded={expanded} onExpandedChange={setExpanded} saleToOpen="" dark={dark} brand="#003e73" request={request}/>}
 </main>;
}
