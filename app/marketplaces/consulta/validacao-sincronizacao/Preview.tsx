'use client';
import {useCallback,useRef,useState} from 'react';
import StockSync from '../../StockSync';
import PriceProductStock from '../../PriceProductStock';
import {LocalProductHeader} from '../../ProductsStock';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import type {LocalProduct} from '@/app/modules/marketplaces/services/local-product-model';
import {stockDivergence,type StockSyncContext} from '@/app/modules/marketplaces/stock-reconciliation';
import styles from './preview.module.css';
const company='00000000-0000-4000-8000-000000000001',productId='00000000-0000-4000-8000-000000000002',actor='00000000-0000-4000-8000-000000000003';
export default function Preview(){
 const [mobile,setMobile]=useState(false),[zero,setZero]=useState(false),[expanded,setExpanded]=useState(true),[,setVersion]=useState(0);
 const [view,setView]=useState({quantity:0,remote:[2,1],pending:false});
 const state=useRef(view);
 const receipts=useRef(new Map<string,unknown>());
 const request=useCallback(async(path:string,options?:RequestInit):Promise<unknown>=>{
  const input=JSON.parse(String(options?.body||'{}'));const current=state.current;
  if(path.endsWith('/sincronizacao')){
   if(input.action==='apply'){
    if(receipts.current.has(input.requestKey))return receipts.current.get(input.requestKey);
    if(input.direction==='listing_to_local')current.quantity=current.remote[input.sourceId==='link-2'?1:0];
    current.pending=true;const result={result:{quantity:current.quantity,status:'pending'}};receipts.current.set(input.requestKey,result);setView({...current});setVersion(v=>v+1);return result;
   }
   return {actorId:actor,productId,name:'Air Fryer Amvox 5L Preto 127V',localQuantity:current.quantity,localConfirmed:true,revision:1,canManage:true,reviewId:crypto.randomUUID(),checkedAt:new Date().toISOString(),pending:current.pending,sources:current.remote.map((quantity,i)=>({id:`link-${i+1}`,account:['ALINE · Mercado Livre','ALINE · Magalu'][i],listingId:i===1?'SKU-AMVOX':`MLB123456${i}`,provider:i===1?'magalu':'mercado_livre',quantity,status:quantity===0?'paused':'active',eligible:true}))} satisfies StockSyncContext;
  }
  const warehouses=[{id:'online',name:'Online',is_online:true,quantity:current.quantity,revision:1,confirmed_at:new Date().toISOString()},{id:'saldao',name:'Saldão',is_online:false,quantity:zero?0:2,revision:1,confirmed_at:new Date().toISOString()}];
  if(path.endsWith('/estoque'))return {stock:{actorId:actor,productId,quantity:current.quantity,confirmed:true,revision:1,canManage:true,warehouses,warehousesReady:true,syncLinkedCount:2,syncHint:stockDivergence(current.quantity,current.remote.map(quantity=>({provider:'mercado_livre',reported_stock:quantity,status:quantity===0?'paused':'active'})))}};
  if(path.endsWith('/vendas-diretas'))return {actorId:actor,canSell:true,canWithdraw:true,product:{id:productId,name:'Air Fryer Amvox 5L Preto 127V',ean:'7898649372113',picture:null,referenceCents:46500},percentages:{minimum:50,medium:70,ideal:90},warehouses,warehousesReady:true};
  throw new Error('Esta prévia permite somente conferir e simular sincronização. Nenhuma API real é chamada.');
 },[zero]);
 const links=view.remote.map((quantity,i)=>({id:`link-${i+1}`,connection_id:`account-${i}`,provider:i===1?'magalu':'mercado_livre',provider_listing_id:i===1?'SKU-AMVOX':`MLB123456${i}`,title:'Air Fryer Amvox',reported_stock:quantity,status:quantity===0?'paused':'active',source_snapshot:{},updated_at:''}));
 const product:LocalProduct={id:productId,empresa_id:company,sku:'AP-0001',name:'Air Fryer Amvox 5L Preto 127V',ean:'7898649372113',description:'Air Fryer 5 litros, painel analógico.',pictures:[],category_id:'',catalog_product_id:'',attributes:[],publication_form:{},price_cents:46500,stock_quantity:view.quantity,stock_confirmed_at:'2026-10-21',revision:1,created_at:'',updated_at:'',links,allocations:[{warehouseId:'online',name:'Online',online:true,quantity:view.quantity},{warehouseId:'saldao',name:'Saldão',online:false,quantity:zero?0:2}],total_stock_quantity:view.quantity+(zero?0:2)};
 return <main className={styles.page}><aside className={styles.toolbar}><span>Prévia local · dados fictícios · sem acesso ao banco ou marketplaces</span><div><BotaoAcaoCompacto onClick={()=>setMobile(!mobile)}>{mobile?'Ver Web':'Ver AvantaPreços'}</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>{state.current.quantity=0;setZero(!zero);setView({...state.current});setVersion(v=>v+1);}}>{zero?'Saldo no Saldão':'Zerar todos os estoques'}</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>{state.current.remote=[state.current.quantity,state.current.quantity];state.current.pending=false;setView({...state.current});setVersion(v=>v+1);}}>Simular retorno da fila</BotaoAcaoCompacto></div></aside>
 <div className={mobile?styles.phone:styles.web}>
 {mobile?<><header className={styles.brand}><strong>SALDÃO ALINE</strong><small>Consulta rápida de produtos e preços</small></header><nav className={styles.nav}><BotaoAcaoCompacto>‹ Voltar</BotaoAcaoCompacto><BotaoAcaoCompacto variante="primario">Nova pesquisa</BotaoAcaoCompacto></nav><article className={styles.card}><PriceProductStock key={`pwa-${zero}`} companyId={company} productId={productId} request={request} compactSummary brand="#003e73"/><hr/><h3>Air Fryer Amvox 5L Preto 127V</h3><p>EAN 7898649372113</p><div className={styles.price}>Referência cadastrada <strong>R$ 465,00</strong></div></article></>:<><h1>Produtos cadastrados</h1><article className={styles.card}><LocalProductHeader product={product} expanded={expanded} canManage busy={false} dark={false} brand="#003e73" percentages={{minimum:50,medium:70,ideal:90}} onToggle={()=>setExpanded(!expanded)} onCommand={()=>{}} stockRequest={request}/>{expanded&&<section className={styles.publication}><header><h3>Publicação</h3><small>2 anúncios vinculados</small></header><div className={styles.publishRow}><label>Conta para publicar<select defaultValue="aline"><option value="aline">ALINE · Mercado Livre</option><option>CDY · Mercado Livre</option></select></label><BotaoAcaoCompacto>Preparar anúncio</BotaoAcaoCompacto></div><StockSync companyId={company} productId={productId} request={request} hint={stockDivergence(product.stock_quantity,links)} brand="#003e73"/><details><summary>Anúncios vinculados (2)</summary>{links.map(l=><p key={l.id}>{l.provider_listing_id} · {l.reported_stock} un.</p>)}</details></section>}</article></>}
 </div></main>;
}
