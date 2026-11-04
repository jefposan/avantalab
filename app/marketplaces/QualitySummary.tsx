'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {marketplaceClientRequest} from './Anunciados';
import {qualityKey,qualitySummary,type QualityRecord} from '@/app/modules/marketplaces/quality-summary';
import styles from './quality-summary.module.css';
import QualityGauge from './QualityGauge';
const Context=createContext<QualityRecord[]>([]);
export function QualityCacheProvider({companyId,children,request}:{companyId:string;children:ReactNode;request:typeof marketplaceClientRequest}){
 const [records,setRecords]=useState<QualityRecord[]>([]);
 useEffect(()=>{const abort=new AbortController();setRecords([]);const load=()=>{void request(`anunciados/qualidade/cache?empresaId=${encodeURIComponent(companyId)}`,undefined,abort.signal).then(r=>{if(!abort.signal.aborted&&Array.isArray(r.records))setRecords(r.records);}).catch(()=>{});};load();window.addEventListener('avanta:quality-updated',load);return()=>{abort.abort();window.removeEventListener('avanta:quality-updated',load);};},[companyId,request]);
 return <Context.Provider value={records}>{children}</Context.Provider>;
}
export default function QualitySummary({links,gauge=false,wide=false,headingAside,label='Qualidade'}:{links:{connectionId:string;id:string}[];gauge?:boolean;wide?:boolean;headingAside?:ReactNode;label?:string}){
 const records=useContext(Context),result=qualitySummary(records,links.map(l=>qualityKey(l.connectionId,l.id)));
 if(!links.length)return headingAside?<div>{headingAside}</div>:null;
 if(gauge)return <QualityGauge score={result.score} level={[links.length>1?'Menor nota entre as contas':'',result.low?'Abaixo de 70':result.stale?'Atualização pendente':''].filter(Boolean).join(' · ')}/>;
 const detail=[result.score==null?'Sem avaliação':'',result.unknown&&result.score!=null?`${result.unknown} sem avaliação`:'',result.stale?'Atualização pendente':''].filter(Boolean).join(' · ');
 return <div className={`${styles.summary} ${wide?styles.wide:''}`} aria-label={`Qualidade do anúncio: ${result.score==null?'sem avaliação':`${result.score} de 100`}${links.length>1?' · menor nota entre os anúncios':''}`}>
  <div className={styles.label}><span>{label}</span>{headingAside}</div><span className={styles.meter}><span className={styles.track}>{result.score!=null&&<span className={styles.marker} style={{left:`${result.score}%`}}/>}</span><strong>{result.score??'—'}{result.score!=null&&'/100'}</strong></span>
  {detail&&<small>{detail}</small>}
 </div>;
}
