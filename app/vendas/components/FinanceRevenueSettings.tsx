'use client';
import {useEffect,useRef,useState} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {revenueLabKey} from '../lib/local-revenue-overlay.mjs';
import {requestFiscalEditor} from '../lib/fiscal-editor-bridge.mjs';
import styles from '@/app/marketplaces/marketplaces.module.css';
type Settings={enabled:boolean;version:number};
const valid=(v:unknown):v is Settings=>!!v&&typeof v==='object'&&'enabled' in v&&typeof v.enabled==='boolean'&&'version' in v&&Number.isSafeInteger(v.version)&&Number(v.version)>=0;
export default function FinanceRevenueSettings({companyId,origin,localLab=false}:{companyId:string;origin:string;localLab?:boolean}){
 const [snapshot,setSnapshot]=useState<Settings|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[writable,setWritable]=useState(false);
 const generation=useRef(0);
 const demo=localLab&&process.env.NODE_ENV==='development';
 const key=revenueLabKey(companyId);
 const load=async()=>{
  const active=++generation.current;setBusy(true);setError('');setSnapshot(null);setWritable(false);setMessage('');
  try{
   let result;
   if(demo){const saved=JSON.parse(localStorage.getItem(key)||'null');const initial=valid(saved)?saved:{enabled:true,version:0};if(!valid(saved))localStorage.setItem(key,JSON.stringify(initial));result={settings:initial,canManage:true};}
   else result=await requestFiscalEditor({companyId,origin,action:'load-revenue'});
   if(active!==generation.current)return;
   if(!valid(result.settings))throw Error('A configuração retornada é inválida. Atualize e tente novamente.');
   setSnapshot(result.settings);setWritable(result.canManage===true);
  }catch(cause){if(active===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível carregar a configuração.');}
  finally{if(active===generation.current)setBusy(false);}
 };
 useEffect(()=>{void load();return()=>{generation.current++;};},[companyId,origin,demo]);
 const change=async(enabled:boolean)=>{
  if(!snapshot||busy||!writable)return;
  const active=generation.current,previous=snapshot;setBusy(true);setError('');setMessage('');
  try{
   let next;
   if(demo){next={enabled,version:previous.version+1};localStorage.setItem(key,JSON.stringify(next));}
   else next=(await requestFiscalEditor({companyId,origin,action:'save-revenue',revenue:{enabled,version:previous.version}})).settings;
   if(active!==generation.current)return;
   if(!valid(next))throw Error('A gravação não foi confirmada. Atualize para conferir.');
   setSnapshot(next);setMessage('Alteração salva.');
  }catch(cause){if(active===generation.current)setError(cause instanceof Error?cause.message:'Não foi possível salvar. Atualize para conferir.');}
  finally{if(active===generation.current)setBusy(false);}
 };
 return <div className={styles.priceSettingsForm} aria-busy={busy}>
  <section className={styles.priceSettingsRevenue} aria-labelledby="sales-revenue-title">
   <h3 id="sales-revenue-title">Faturamento</h3>
   <label className={styles.priceRevenueSwitch}><input type="checkbox" role="switch" checked={snapshot?.enabled??true} disabled={busy||!snapshot||!writable} onChange={event=>void change(event.target.checked)}/><span aria-hidden="true"/>Enviar para receitas</label>
  </section>
  <p className={styles.help}>Vendas faturadas e serviços concluídos nas entradas do mês. Cancelamentos e estornos de faturamento são descontados.</p>
  {demo&&<p className={styles.help}>Laboratório local: reflete nas entradas da Gestão local, sem gravar em produção.</p>}
  {busy&&<p role="status">{snapshot?'Salvando…':'Carregando…'}</p>}
  {!writable&&snapshot&&!busy&&<p className={styles.help}>Somente consulta.</p>}
  {error&&<div role="alert"><p>{error}</p><BotaoAcaoCompacto disabled={busy} onClick={()=>void load()}>Atualizar configuração</BotaoAcaoCompacto></div>}
  {message&&!busy&&<p role="status">{message}</p>}
 </div>;
}
