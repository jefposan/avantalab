'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import DetalhesRolaveis from '@/app/components/DetalhesRolaveis';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import Image from 'next/image';
import {DIRECT_SALES_PATH,type DirectSale} from '@/app/modules/marketplaces/direct-sales';
import {warehousePillColor} from '@/app/modules/marketplaces/warehouses';
import {marketplaceDateLabel} from '@/app/modules/marketplaces/date-format';
import type {LotsRequest} from './usePriceLotCapture';
import {DirectDialog,directMoney,type DirectContext} from './DirectSaleActions';
import useDirectSaleCommand from './useDirectSaleCommand';
import styles from './direct-sales.module.css';

export default function DirectSalesHistory({companyId,productId,request,onClose,dark,brand}:{companyId:string;productId?:string;request:LotsRequest;onClose:()=>void;dark?:boolean;brand?:string}){
 const [sales,setSales]=useState<DirectSale[]>([]),[canSell,setCanSell]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError('');
  try{const r=await request(`${DIRECT_SALES_PATH}?empresaId=${companyId}${productId?`&productId=${productId}`:''}`,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20_000)]):AbortSignal.timeout(20_000)}) as {sales:DirectSale[];canSell:boolean};if(!signal?.aborted){setSales(r.sales);setCanSell(r.canSell);}}
  catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'Não foi possível consultar as vendas.');}finally{if(!signal?.aborted)setLoading(false);}
 },[companyId,productId,request]);
 useEffect(()=>{const a=new AbortController(),frame=requestAnimationFrame(()=>void load(a.signal));return()=>{cancelAnimationFrame(frame);a.abort();};},[load]);
 return <DirectDialog title="Vendas diretas" onClose={onClose} dark={dark} brand={brand}><div className={styles.body}><div className={styles.actions}><BotaoAcaoCompacto disabled={loading} onClick={()=>void load()}>Atualizar</BotaoAcaoCompacto></div>
 {loading?<p role="status">Carregando vendas diretas…</p>:error?<p role="alert" className={styles.error}>{error}</p>:!sales.length?<p>Nenhuma venda direta registrada.</p>:<div className={styles.list}>{sales.map(s=><DirectSaleRow key={`${s.id}:${s.revision}`} sale={s} companyId={companyId} request={request} canSell={canSell} dark={dark} brand={brand} onUpdated={()=>void load()}/>)}</div>}
 </div></DirectDialog>;
}
export function DirectSaleRow({sale:s,companyId,request,canSell,onUpdated,dark,brand}:{sale:DirectSale;companyId:string;request:LotsRequest;canSell:boolean;onUpdated:()=>void;dark?:boolean;brand?:string}){
 const headerId=useId();
 const [action,setAction]=useState<'cancel'|'return'|''>(''),[context,setContext]=useState<DirectContext|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function open(next:'cancel'|'return'){
  setLoading(true);setError('');
  try{const r=await request(DIRECT_SALES_PATH,{method:'POST',signal:AbortSignal.timeout(20_000),body:JSON.stringify({empresaId:companyId,action:'context',productId:s.productId})}) as DirectContext;
   setContext(r);setAction(next);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível conferir os estoques.');}finally{setLoading(false);}
 }
 return <article className={`${styles.row} ${styles.scope} ${dark?styles.dark:''}`} style={{'--brand':brand||'#003e73'} as React.CSSProperties}>
  <div id={headerId} className={styles.saleIdentity}>{s.picture&&<Image unoptimized width={48} height={48} className={styles.photo} src={s.picture} alt={`Foto de ${s.productName}`}/>}
  <h3>{s.productName}</h3><p>EAN: {s.ean||'Não informado'}</p>
  <span className={styles.badge} style={{'--warehouse-pill':warehousePillColor(s.warehouseId)} as React.CSSProperties}>{s.warehouseName} · Venda direta</span>
  <p>{marketplaceDateLabel(s.soldOn)} · {s.quantity} un. × {directMoney(s.unitPriceCents)} · <strong>{directMoney(s.totalCents)}</strong></p>
  </div><DetalhesRolaveis cabecalhoId={headerId} rotulo={`Detalhes da venda de ${s.productName}`} className={styles.saleDetailsScroll}>
  {s.note&&<p>{s.note}</p>}
  <div className={styles.saleSections}>
    <section className={styles.saleSection} aria-label="Situação da venda">
      <h4>Situação da venda</h4>
      <p>{s.status==='cancelled'?'Venda cancelada':'Venda confirmada'}</p>
      {s.cancellationNote&&<p className={styles.saleSectionNote}>Motivo do cancelamento: {s.cancellationNote}</p>}
    </section>
    {s.returnedQuantity>0&&<section className={styles.saleSection} aria-label="Devoluções registradas">
      <h4>Devoluções</h4>
      <p>{s.returnedQuantity===s.quantity?'Devolução total':'Devolução parcial'}: {s.returnedQuantity}{s.returnedQuantity<s.quantity?` de ${s.quantity}`:''} {s.returnedQuantity===s.quantity&&s.quantity===1?'unidade':'unidades'}.</p>
    </section>}
  </div>
  {canSell&&!action&&<div className={styles.actions}>{s.status==='confirmed'?<BotaoAcaoCompacto disabled={loading} variante="destrutivo" onClick={()=>void open('cancel')}>Cancelar venda</BotaoAcaoCompacto>:s.returnedQuantity<s.quantity&&<BotaoAcaoCompacto disabled={loading} onClick={()=>void open('return')}>Registrar devolução</BotaoAcaoCompacto>}</div>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {action&&context&&<DirectSaleReversal key={`${s.id}:${context.actorId}`} companyId={companyId} sale={s} context={context} action={action} request={request} onClose={()=>setAction('')} onUpdated={onUpdated}/>}
 </DetalhesRolaveis></article>;
}
function DirectSaleReversal({sale:s,companyId,context,action,request,onClose,onUpdated}:{sale:DirectSale;companyId:string;context:DirectContext;action:'cancel'|'return';request:LotsRequest;onClose:()=>void;onUpdated:()=>void}){
 const command=useDirectSaleCommand(companyId,context.actorId,`sale:${s.id}`,request),p=command.pending?.payload;
 const [qty,setQty]=useState(String(p?.quantity??(action==='cancel'?0:s.quantity-s.returnedQuantity))),[warehouse,setWarehouse]=useState(String(p?.warehouseId||context.warehouses.find(w=>w.id===s.warehouseId)?.id||context.warehouses[0]?.id||'')),[note,setNote]=useState(String(p?.note||'')),[error,setError]=useState('');
 const selected=context.warehouses.find(w=>w.id===warehouse),locked=command.saving||!!p,operation=String(p?.action||action);
 const reasonInput=useRef<HTMLInputElement>(null),quantityInput=useRef<HTMLInputElement>(null);
 async function confirm(){
  setError('');const n=Number(qty);
  if(!p&&!note.trim()){setError('Informe o motivo.');reasonInput.current?.focus();return;}
  if(!p&&(!/^\d{1,5}$/.test(qty)||n<(operation==='cancel'?0:1)||n>s.quantity-s.returnedQuantity||(n>0&&(!selected||selected.quantity==null)))){setError('Informe a quantidade que retornou e um estoque de destino com saldo confirmado.');quantityInput.current?.focus();return;}
  if(await command.run({action:operation,saleId:s.id,saleRevision:s.revision,quantity:n,note,...(n>0?{warehouseId:warehouse,revision:selected?.revision}:{})})){onClose();onUpdated();}
 }
 return <form className={styles.body} aria-label={operation==='cancel'?'Confirmar cancelamento da venda':'Confirmar devolução'} onSubmit={event=>{event.preventDefault();void confirm();}}>
  <h3>{operation==='cancel'?'Cancelar venda':'Registrar devolução física'}</h3>
  <p>{operation==='cancel'?'Informe somente as unidades que retornaram fisicamente. Zero cancela sem repor estoque.':'Informe somente as unidades recebidas fisicamente e o estoque que as recebeu. Sem retorno, não confirme a devolução.'}</p>
  {p&&<p role="status">Tentativa guardada: repetir confirma a mesma operação, sem nova devolução.</p>}
  <div className={styles.reversalRow}>
   <label className={`${styles.field} ${styles.reversalQuantity}`}>Quantidade devolvida<input ref={quantityInput} inputMode="numeric" value={qty} disabled={locked} maxLength={3} onChange={e=>{if(/^\d{0,3}$/.test(e.target.value))setQty(e.target.value);}}/></label>
   {Number(qty)>0&&<label className={`${styles.field} ${styles.reversalWarehouse}`}>Estoque de destino<select value={warehouse} disabled={locked} onChange={e=>setWarehouse(e.target.value)}>{context.warehouses.map(w=><option value={w.id} key={w.id}>{w.name} · {w.quantity ?? 0}</option>)}</select></label>}
   <label className={`${styles.field} ${styles.reversalReason}`}>Motivo<input ref={reasonInput} value={note} maxLength={500} disabled={locked} onChange={e=>setNote(e.target.value)}/></label>
   <div className={`${styles.actions} ${styles.reversalActions}`}><BotaoAcaoCompacto onClick={onClose}>Voltar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" variante="destrutivo" disabled={command.saving}>{command.saving?'Salvando…':p?'Repetir confirmação':operation==='cancel'?'Confirmar cancelamento':'Confirmar devolução'}</BotaoAcaoCompacto></div>
  </div>
  {(error||command.error)&&<p role="alert" className={styles.error}>{error||command.error}</p>}
 </form>;
}
