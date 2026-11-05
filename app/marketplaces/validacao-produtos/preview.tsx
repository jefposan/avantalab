'use client';

import { useCallback, useRef, useState } from 'react';
import ProductsStock from '../ProductsStock';
import ProductSearchShortcut, { type ProductSearchHandle } from '../ProductSearchShortcut';
import type { marketplaceClientRequest } from '../Anunciados';
import type { LocalProduct } from '@/app/modules/marketplaces/services/local-product-model';
import { productMatchesSearch } from '@/app/modules/marketplaces/local-product-search';
import styles from '../marketplaces.module.css';
import InventoryNotices from '../InventoryNotices';
import type { NoticeTarget } from '@/app/modules/marketplaces/notice-navigation';
import type { MarketplaceLiveFeed } from '@/app/modules/marketplaces/live-feed';

const company='00000000-0000-4000-8000-000000000001';
const products: LocalProduct[]=Array.from({length:31},(_,i)=>({
  id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,empresa_id:company,sku:`DEMO-${String(i+1).padStart(3,'0')}`,
  name:i===0?'Máscara de tratamento':i===1?'Condicionador profissional':`Produto demonstrativo ${i+1}`,
  ean:i<2?'7891129598607':null,description:i===0?'Hidratação intensa, proteção e brilho para os cabelos.':i===30?'Descrição exclusiva: macarrão de grano duro.':'Cadastro fictício para validação da pesquisa local.',
  pictures:[],category_id:'',catalog_product_id:'',attributes:[],publication_form:{},price_cents:i===2?0:1990+i*100,
  stock_quantity:i===2?null:i,stock_confirmed_at:null,revision:1,created_at:'2026-10-18T12:00:00Z',updated_at:'2026-10-18T12:00:00Z',links:[],
}));

export default function Preview() {
  const [noticeTarget,setNoticeTarget]=useState<NoticeTarget>();
  const feed:MarketplaceLiveFeed={alerts:[],pendingStock:1,pendingSales:0,issues:[],updatedAt:null,workerFinishedAt:null,workerHealthy:true,enabled:true,notices:[{id:'demo-stock',source:'stock',code:'import_stock_review',productId:products[3].id,productName:products[3].name,ean:products[3].ean,listingId:null,accountName:null,orderId:null,provider:'mercado_livre'}]};
  const [dark,setDark]=useState(false),[calls,setCalls]=useState(0),[last,setLast]=useState('');
  const fail=useRef(false),hold=useRef(false),pending=useRef<Array<()=>void>>([]),search=useRef<ProductSearchHandle>(null);
  const request: typeof marketplaceClientRequest=useCallback(async(path,body)=>{
    if(body) throw new Error('Prévia somente leitura; nenhuma gravação permitida.');
    const params=new URL(path,'http://localhost').searchParams;
    const term=params.get('q')||'';
    setCalls(n=>n+1);setLast(term);
    if(fail.current){fail.current=false;throw new Error('Falha de pesquisa simulada. Tente novamente.');}
    if(hold.current){hold.current=false;await new Promise<void>(resolve=>pending.current.push(resolve));}
    // Retenção deliberadamente ignora AbortSignal, para validar descarte de retorno antigo.
    if(params.has('productId')) return {product:products.find(p=>p.id===params.get('productId')),movements:[]};
    const matching=products.filter(p=>productMatchesSearch(p,term));
    matching.sort((a,b)=>Number(b.ean===term)-Number(a.ean===term));
    const page=Number(params.get('page'))||1;
    return {products:matching.slice((page-1)*25,page*25),total:matching.length,page};
  },[]);
  return <main className={`${styles.page} ${dark?styles.dark:''}`} style={{'--marketplace-brand':'#003e73'} as React.CSSProperties}>
    <header style={{position:'fixed',top:0,left:0,right:0,height:80,zIndex:120,background:'#003e73',color:'#fff',padding:'16px 24px'}}><strong>Teste local — busca de produtos</strong><p style={{fontSize:12,margin:0}}>Dados fictícios. Nenhum acesso ao banco ou pesquisa externa.</p><div style={{position:'absolute',right:24,top:12}}><InventoryNotices companyId={company} feed={feed} unavailable={false} onAdjust={()=>setNoticeTarget({key:crypto.randomUUID(),panel:'stock',provider:'mercado_livre',productId:products[3].id})}/></div></header>
    <div data-marketplace-selector style={{position:'fixed',top:80,left:0,right:0,height:44,zIndex:119,background:dark?'#182235':'#fff',padding:'8px 24px'}}>Perfil demonstrativo · todos os marketplaces</div>
    <div className={styles.content}>
      <div className={styles.localToolbar}><button onClick={()=>setDark(v=>!v)}>Tema {dark?'claro':'escuro'}</button><button onClick={()=>{fail.current=true;}}>Falhar próxima pesquisa</button><button onClick={()=>{hold.current=true;}}>Reter próxima pesquisa</button><button onClick={()=>pending.current.splice(0).forEach(resolve=>resolve())}>Liberar pesquisas retidas</button></div>
      <p role="status">Consultas: {calls} · Último termo: {last||'(lista completa)'}</p>
      <section style={{minHeight:800,padding:24}}><h1>Outras áreas do módulo</h1><p>Use o atalho no canto inferior direito para chegar à pesquisa.</p><input aria-label="Outro campo da página" placeholder="O leitor não deve capturar este campo" /></section>
      <ProductsStock noticeTarget={noticeTarget} onNoticeDismiss={()=>setNoticeTarget(undefined)} searchRef={search} companyId={company} dark={dark} brand="#003e73" canManage={false} accounts={[]} refreshKey={0} preparationLocked={false} onPrepare={()=>{}} request={request} />
      <div style={{height:800}} aria-hidden="true" />
      <ProductSearchShortcut onClick={()=>search.current?.focusSearch()} />
    </div>
  </main>;
}
