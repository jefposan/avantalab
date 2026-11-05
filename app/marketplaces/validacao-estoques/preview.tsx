'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import WarehousesPanel from '../WarehousesPanel';
import ProductsStock from '../ProductsStock';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import { productMatchesSearch } from '@/app/modules/marketplaces/local-product-search';
import type { LocalProduct } from '@/app/modules/marketplaces/services/local-product-model';
import type { Warehouse } from '@/app/modules/marketplaces/warehouses';
import type { marketplaceClientRequest } from '../Anunciados';
import styles from '../marketplaces.module.css';
import InventoryNotices from '../InventoryNotices';
import type { NoticeTarget } from '@/app/modules/marketplaces/notice-navigation';
import type { MarketplaceLiveFeed } from '@/app/modules/marketplaces/live-feed';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import { watchMarketplaceNoticeOpening, cancelMarketplaceNoticeOpening } from '../notice-opening';
const company='00000000-0000-4000-8000-000000000001';
const online='00000000-0000-4000-8000-000000000002',offline='00000000-0000-4000-8000-000000000003';
const template: LocalProduct={id:'00000000-0000-4000-8000-000000000004',empresa_id:company,sku:'DEMO-001',name:'Aquecedor Esterilizador De Mamadeira Papinha Branco 127v',ean:'7908103790527',description:'Aquecedor e esterilizador para mamadeiras. Produto fictício de demonstração.',pictures:['/images/marketplaces/magalu.svg'],category_id:'',catalog_product_id:'',attributes:[],publication_form:{},price_cents:20000,stock_quantity:3,stock_confirmed_at:'2026-10-19T12:00:00Z',revision:1,created_at:'2026-10-19T12:00:00Z',updated_at:'2026-10-19T12:00:00Z',links:[{id:'demo-link',connection_id:'demo-account',provider:'mercado_livre',provider_listing_id:'DEMO-1',title:'Anúncio demonstrativo',reported_stock:3,status:'active',source_snapshot:{},updated_at:'2026-10-19T12:00:00Z'}]};
export default function Preview(){
  const [noticeTarget,setNoticeTarget]=useState<NoticeTarget>();
  const [opening,setOpening]=useState(false),[lookupError,setLookupError]=useState('');
  const page=useRef<HTMLElement>(null),slowLookup=useRef(false);
  const [lookups,setLookups]=useState(0),failure=useRef(false);
  useEffect(()=>{if(!opening||!noticeTarget||!page.current)return;return watchMarketplaceNoticeOpening(page.current,noticeTarget,()=>setOpening(false),(error)=>{setOpening(false);setLookupError(error||'Não foi possível concluir a abertura.');});},[opening,noticeTarget]);
  function openStock(){setLookupError('');setOpening(true);setNoticeTarget({key:crypto.randomUUID(),panel:'stock',provider:'mercado_livre',productId:template.id,origin:'announced'});}
  const feed:MarketplaceLiveFeed={alerts:[],pendingStock:1,pendingSales:0,issues:[],updatedAt:null,workerFinishedAt:null,workerHealthy:true,enabled:true,notices:[{id:'demo-stock',source:'stock',code:'import_stock_review',productId:template.id,productName:template.name,ean:template.ean,listingId:null,accountName:null,orderId:null,provider:'mercado_livre'}]};
  const [dark,setDark]=useState(false),[refresh,setRefresh]=useState(0),[narrow,setNarrow]=useState(false);
  const stores=useRef<Warehouse[]>([{id:online,name:'Online',is_online:true}]),held=useRef(false),release=useRef<(()=>void)|null>(null);
  const product=useRef(structuredClone(template));
  const request:typeof marketplaceClientRequest=useCallback(async(path,body)=>{
    const params=new URL(path,'http://localhost').searchParams;
    if(path.includes('vendas-diretas')){
      if((body as {action?:string}|undefined)?.action==='context')return{actorId:'demo-actor',canSell:true,canWithdraw:true,warehousesReady:true,product:{id:product.current.id,name:product.current.name,ean:product.current.ean,picture:null,referenceCents:20000},percentages:{minimum:50,medium:70,ideal:90},warehouses:stores.current.map(w=>({...w,quantity:w.id===online?3:2,revision:1,confirmed_at:'2026-10-19T12:00:00Z'}))};
      if(!body)return{sales:[],canSell:true};throw Error('Prévia visual: não registra vendas.');
    }
    if(path==='estoques'&&body){const cmd=body as Record<string,unknown>;if(held.current)await new Promise<void>(done=>{release.current=done;});if(cmd.action==='create'){const w={id:crypto.randomUUID(),name:String(cmd.name),is_online:false};stores.current.push(w);return{warehouseId:w.id};}if(cmd.action==='rename'){stores.current.find(w=>w.id===cmd.warehouseId)!.name=String(cmd.name);return{warehouseId:cmd.warehouseId};}throw Error('Prévia: ação não habilitada.');}
    if(path.startsWith('estoques?'))return{warehouses:structuredClone(stores.current)};
    const allocations=stores.current.map(w=>({warehouseId:w.id,name:w.name,online:w.is_online,quantity:w.id===online?3:w.id===offline?2:0}));
    const row={...product.current,allocations,total_stock_quantity:allocations.reduce((n,w)=>n+w.quantity,0)};
    if(params.has('productId')){setLookups(n=>n+1);if(slowLookup.current){slowLookup.current=false;await new Promise(resolve=>setTimeout(resolve,15000));}if(failure.current){failure.current=false;throw Error('Falha de conexão simulada. Tente novamente.');}return{product:row,movements:[],warehouseMovements:[]};}
    if(path.includes('precos/estoque'))return{stock:{productId:row.id,quantity:3,confirmed:true,revision:1,canManage:true,warehousesReady:true,warehouses:stores.current.map(w=>({...w,quantity:w.id===online?3:2,revision:1,confirmed_at:'2026-10-19T12:00:00Z'}))}};
    if(body&&path==='produtos'){const cmd=body as Record<string,unknown>;if(cmd.action==='update'){product.current.price_cents=Math.round(Number(cmd.price)*100);product.current.revision++;return{};}throw Error('Nenhuma gravação real está habilitada nesta prévia.');}
    const wid=params.get('warehouseId'),term=params.get('q')||'';
    const matches=params.get('publication')!=='unadvertised'&&productMatchesSearch(row,term)&&(!wid||allocations.some(w=>w.warehouseId===wid&&w.quantity>0));
    return{products:matches?[row]:[],total:matches?1:0,page:1};
  },[]);
  return <main ref={page} className={`${styles.page} ${dark?styles.dark:''}`} style={{'--brand':'#003e73',padding:24,minHeight:'100vh'} as CSSProperties}>
    <CarregamentoDadosModulo ativo={opening} escurecerFundo titulo="Abrindo produto" mensagem="Localizando e preparando o item…" corPrimaria="#003e73" temaEscuro={dark} onCancelar={()=>{if(noticeTarget)cancelMarketplaceNoticeOpening(noticeTarget.key);setOpening(false);setNoticeTarget(undefined);}}/>
    <header className={styles.salesHeader} style={{height:80,background:'#003e73',color:'#fff',padding:'16px 24px'}}><strong>Prévia local — estoques fictícios, sem acesso ao banco</strong><InventoryNotices companyId={company} feed={feed} unavailable={false} onAdjust={()=>{setLookupError('');setOpening(true);setNoticeTarget({key:crypto.randomUUID(),panel:'stock',provider:'mercado_livre',productId:template.id});}}/></header>
    <section style={{height:110,paddingTop:80}}>Contas conectadas — conteúdo antes da barra</section>
    <nav data-marketplace-selector className={styles.marketplaceSelector}>Marketplaces — barra sticky como na Gestão</nav>
    <BotaoAcaoCompacto onClick={()=>{slowLookup.current=true;}}>Simular busca demorada</BotaoAcaoCompacto>
    <BotaoAcaoCompacto onClick={openStock}>Ver no estoque (teste)</BotaoAcaoCompacto>
    <BotaoAcaoCompacto onClick={()=>{failure.current=true;openStock();}}>Simular erro de abertura</BotaoAcaoCompacto>
    <output>Consultas do produto: {lookups}</output>
    <BotaoAcaoCompacto onClick={()=>setNarrow(v=>!v)}>Simular tela estreita</BotaoAcaoCompacto>
    {lookupError&&<p role="alert">{lookupError}</p>}
    <div className={styles.panelHeadingActions}><BotaoAcaoCompacto onClick={()=>setDark(v=>!v)}>Alternar tema</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>{if(!stores.current.some(w=>w.id===offline))stores.current.push({id:offline,name:'Saldão',is_online:false});setRefresh(v=>v+1);}}>Simular segundo estoque</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>{held.current=true;}}>Reter próximo cadastro</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>{held.current=false;release.current?.();release.current=null;}}>Liberar cadastro</BotaoAcaoCompacto></div>
    <section style={{height:500}}>Outros cards antes de Estoques</section>
    <div style={{width:narrow?360:'100%',maxWidth:'100%'}}>
    <WarehousesPanel noticeTarget={noticeTarget} companyId={company} canManage dark={dark} brand="#003e73" refreshKey={refresh} request={request} productContext={{accounts:[],preparationLocked:true,onPrepare(){}}} />
    <ProductsStock companyId={company} canManage dark={dark} brand="#003e73" refreshKey={refresh} request={request} accounts={[]} preparationLocked onPrepare={()=>{}} />
    </div><div style={{height:800}} aria-hidden="true" />
  </main>;
}
