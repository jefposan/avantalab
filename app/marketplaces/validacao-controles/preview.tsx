'use client';
import { useState, type CSSProperties } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import AvantaKanban from '@/app/components/AvantaKanban';
import { DEFAULT_MARKETPLACE_PANEL_ORDER } from '@/app/modules/marketplaces/panel-order';
import DateOrderButton from '../DateOrderButton';
import MarketplaceSelect from '../MarketplaceSelect';
import WarehousesPanel from '../WarehousesPanel';
import type { DateOrder } from '@/app/modules/marketplaces/date-order';
import styles from '../marketplaces.module.css';
const warehousePreviewRequest=async()=>({warehouses:[]});
export default function Preview() {
  const [open,setOpen]=useState<Record<string,boolean>>({});
  const [order,setOrder]=useState<DateOrder>('desc');
  const [account,setAccount]=useState('');
  const [dark,setDark]=useState(false);
  const [count,setCount]=useState(0);
  const [panelOrder,setPanelOrder]=useState([...DEFAULT_MARKETPLACE_PANEL_ORDER]);
  return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{'--brand':'#d60000',padding:24,minHeight:'100vh'} as CSSProperties}>
    <BotaoAcaoCompacto onClick={()=>setDark(v=>!v)}>Alternar tema</BotaoAcaoCompacto>
    <p role="status">Prévia local sem dados reais. Atualizações simuladas: {count}</p>
    <AvantaKanban className={styles.panelOrder} order={panelOrder} onOrderChange={setPanelOrder} items={(['Vendas','Anunciados','Estoques','Produtos'] as const).map((name,index)=>({id:['sales','announced','warehouses','products'][index],title:name,render:handle=>{
      const id=['sales','announced','warehouses','products'][index];
      if(name==='Estoques')return <WarehousesPanel companyId="preview" canManage={false} dark={dark} brand="#d60000" request={warehousePreviewRequest} reorderHandle={handle} />;
      return <section className={styles.panel} key={id} style={{marginBottom:20}}>
        <div className={`${styles.panelHeading} ${!open[id]?styles.panelHeadingCollapsed:''}`}><h2>{name}</h2><div className={styles.panelHeadingActions}>
          {handle}
          {name==='Anunciados'&&<MarketplaceSelect label="" ariaLabel="Conta dos anúncios" className={styles.announcedAccountFilter} value={account} onChange={setAccount} options={[{value:'',label:'Todas as contas'},{value:'demo',label:'Conta de exemplo'}]} placeholder="Todas as contas" />}
          {(name==='Vendas'||name==='Anunciados')&&<DateOrderButton context={name} order={order} onChange={setOrder} />}
          <BotaoAcaoCompacto onClick={()=>setCount(n=>n+1)}>Atualizar</BotaoAcaoCompacto>
          <BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto={name} controlsId={`${id}-content`} expandido={!!open[id]} corPrimaria="#d60000" darkMode={dark} onClick={()=>setOpen(v=>({...v,[id]:!v[id]}))} />
        </div></div>
        <div id={`${id}-content`} hidden={!open[id]}>Conteúdo de demonstração de {name}.</div>
      </section>;
    }}))} />
  </main>;
}
