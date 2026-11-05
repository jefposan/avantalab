'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import InventoryNotices from '../InventoryNotices';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import type { MarketplaceLiveFeed } from '@/app/modules/marketplaces/live-feed';
import styles from '../marketplaces.module.css';
const initial: MarketplaceLiveFeed = {alerts:[],enabled:true,workerHealthy:true,workerFinishedAt:null,updatedAt:null,pendingSales:0,pendingStock:1,issues:[],notices:[
  {id:'fan',source:'sale',code:'stock_not_confirmed',productId:'fan',productName:'Ventilador Arno X-treme 7 pás',ean:'7895500763318',listingId:'MLB7743061544',accountName:'ALINE',orderId:'2000000000000000',provider:'mercado_livre'},
  {id:'airfryer',source:'stock',code:'queued',productId:'airfryer',productName:'Fritadeira Airfryer Philips Walita XL Digital 6,2L',ean:'8720389031151',listingId:'MLB5328839535',accountName:'CDY',orderId:null,provider:'mercado_livre'},
]};
export default function Preview() {
  const [feed,setFeed] = useState(initial);
  const [dark,setDark] = useState(false);
  const [fail,setFail] = useState(false);
  useEffect(()=>{
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      window.dispatchEvent(new CustomEvent('avanta:marketplace-notices-refresh-state',{detail:{companyId:'preview',loading:true,error:''}}));
      timer=setTimeout(()=>{
        if (!fail) setFeed({...initial,notices:[],pendingStock:0});
        window.dispatchEvent(new CustomEvent('avanta:marketplace-notices-refresh-state',{detail:{companyId:'preview',loading:false,error:fail?'Não foi possível atualizar os avisos. Os dados anteriores podem estar desatualizados. Tente novamente.':''}}));
      },750);
    };
    window.addEventListener('avanta:marketplace-refresh-notices',refresh);
    return ()=>{window.removeEventListener('avanta:marketplace-refresh-notices',refresh);clearTimeout(timer);};
  },[fail]);
  return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{'--brand':'#d60000',padding:32} as CSSProperties}>
    <h1>Prévia local — Pendências</h1><p>Dados fictícios. Atualizar simula uma nova consulta sem acesso ao banco ou envio de estoque.</p>
    <BotaoAcaoCompacto onClick={()=>setDark(!dark)}>{dark?'Tema claro':'Tema noturno'}</BotaoAcaoCompacto>
    <BotaoAcaoCompacto aria-pressed={fail} onClick={()=>setFail(!fail)}>Simular erro</BotaoAcaoCompacto>
    <BotaoAcaoCompacto onClick={()=>setFeed(initial)}>Restaurar exemplo</BotaoAcaoCompacto>
    <InventoryNotices companyId="preview" feed={feed} unavailable={false} />
  </main>;
}
