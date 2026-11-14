'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CampoMoeda from '@/app/components/CampoMoeda';
import CampoData from '@/app/components/CampoData';
import {RESERVATIONS_PATH,type StockReservation} from '@/app/modules/marketplaces/stock-reservations';
import {marketplaceDateTimeLabel} from '@/app/modules/marketplaces/date-format';
import {saleToday,notifyDirectSalesChanged} from '@/app/modules/marketplaces/direct-sales';
import type {WarehouseContext} from '@/app/modules/marketplaces/warehouses';
import {PRODUCT_STOCK_CHANGED} from './product-stock-events';
import {DirectDialog,directMoney} from './DirectSaleActions';
import useDirectSaleCommand from './useDirectSaleCommand';
import type {LotsRequest} from './usePriceLotCapture';
import styles from './direct-sales.module.css';
export type ReservationContext=WarehouseContext&{actorId:string;canReserve:boolean;productId:string;reservations:StockReservation[];sync?:{status:'none'|'pending'|'synced';message:string}};
export default function ReservationActions({companyId,productId,request,disabled,dark,brand,className,onBusyChange,onChanged}:{companyId:string;productId:string;request:LotsRequest;disabled?:boolean;dark?:boolean;brand?:string;className?:string;onBusyChange?:(busy:boolean)=>void;onChanged?:()=>void}){
 const [open,setOpen]=useState(false),[context,setContext]=useState<ReservationContext|null>(null),[error,setError]=useState('');
 const trigger=useRef<HTMLButtonElement>(null),generation=useRef(0);
 const load=useCallback(async()=>{
  const current=++generation.current;
  try{const c=await request(RESERVATIONS_PATH,{method:'POST',signal:AbortSignal.timeout(20_000),body:JSON.stringify({empresaId:companyId,productId,action:'context'})}) as ReservationContext;
   if(current===generation.current){setContext(c);setError('');}
  }catch(e){if(current===generation.current)setError((e as Error).message);}
 },[companyId,productId,request]);
 useEffect(()=>{void load();const listener=(e:Event)=>{if((e as CustomEvent).detail?.companyId===companyId)void load();};window.addEventListener(PRODUCT_STOCK_CHANGED,listener);return()=>{generation.current++;window.removeEventListener(PRODUCT_STOCK_CHANGED,listener);};},[load,companyId]);
 useEffect(()=>{if(!open)return;const timer=setInterval(()=>void load(),5000);return()=>clearInterval(timer);},[open,load]);
 useEffect(()=>{onBusyChange?.(open);return()=>onBusyChange?.(false);},[open,onBusyChange]);
 function close(){setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}
 return <>
  <BotaoAcaoCompacto ref={trigger} className={className} data-stock-action="reservation" disabled={disabled} onClick={()=>{setOpen(true);void load();}}>Reserva{context?.reservations.length?` (${context.reservations.length})`:''}</BotaoAcaoCompacto>
  {open&&(context?<ReservationManager key={`${companyId}:${context.actorId}:${productId}`} companyId={companyId} context={context} request={request} contextError={error} dark={dark} brand={brand} onClose={close} onRefresh={()=>void load()} onChanged={()=>{onChanged?.();void load();}}/>:<DirectDialog title="Reserva" onClose={close} dark={dark} brand={brand}><div className={styles.body}>{error?<p role="alert">{error}</p>:<p role="status">Conferindo reservas e estoques…</p>}<BotaoAcaoCompacto onClick={()=>void load()}>Consultar novamente</BotaoAcaoCompacto></div></DirectDialog>)}
 </>;
}
function ReservationManager({companyId,context,request,contextError,dark,brand,onClose,onRefresh,onChanged}:{companyId:string;context:ReservationContext;request:LotsRequest;contextError:string;dark?:boolean;brand?:string;onClose:()=>void;onRefresh:()=>void;onChanged:()=>void}){
 const command=useDirectSaleCommand(companyId,context.actorId,`reservation:${context.productId}`,request,RESERVATIONS_PATH,false),pending=command.pending?.payload;
 const [creating,setCreating]=useState(!context.reservations.length),[warehouseId,setWarehouseId]=useState(String(pending?.warehouseId||'')),[quantity,setQuantity]=useState(String(pending?.quantity||1)),[buyer,setBuyer]=useState(String(pending?.buyer||'')),[note,setNote]=useState(String(pending?.note||''));
 const [selected,setSelected]=useState<StockReservation|null>(null),[action,setAction]=useState<'sell'|'cancel'>('sell'),[price,setPrice]=useState(pending?.unitPriceCents?new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2}).format(Number(pending.unitPriceCents)/100):''),[soldOn,setSoldOn]=useState(String(pending?.soldOn||saleToday())),[review,setReview]=useState<Record<string,unknown>|null>(null),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const locked=command.saving||!!pending,w=context.warehouses.find(w=>w.id===warehouseId),payload=pending||review;
 const operationWarehouse=payload?.action==='reserve'?context.warehouses.find(w=>w.id===payload.warehouseId):context.warehouses.find(w=>w.id===context.reservations.find(r=>r.id===payload?.reservationId)?.warehouseId);
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function execute(){
  if(!payload)return;setError('');
  const ok=await command.run(payload);
  if(ok){if(payload.action==='sell')notifyDirectSalesChanged(companyId);onChanged();if(alive.current){setReview(null);setSelected(null);setCreating(false);setBuyer('');setNote('');setQuantity('1');setWarehouseId('');setNotice(payload.action==='reserve'?'Reserva confirmada. As unidades estão bloqueadas.':payload.action==='cancel'?'Reserva cancelada. As unidades voltaram à disponibilidade.':'Venda da reserva registrada, sem nova baixa das unidades bloqueadas.');}}
 }
 function prepare(e:FormEvent){
  e.preventDefault();setError('');setNotice('');
  if(selected){
   const cents=Number(price.replace(/\D/g,''));
   if(action==='sell'&&(!Number.isSafeInteger(cents)||cents<1)){setError('Informe um valor unitário maior que zero.');return;}
   setReview({action,reservationId:selected.id,reservationRevision:selected.revision,quantityLabel:selected.quantity,buyerLabel:selected.buyer,...(action==='sell'?{unitPriceCents:cents,soldOn}:{})});return;
  }
  if(!w||w.quantity==null||!context.warehousesReady){setError('Escolha um estoque com saldo confirmado.');return;}
  if(!/^\d{1,5}$/.test(quantity)||Number(quantity)<1||Number(quantity)>w.quantity){setError('Informe uma quantidade disponível neste estoque.');return;}
  if(!buyer.trim()){setError('Identifique o possível comprador.');return;}
  setReview({action:'reserve',productId:context.productId,warehouseId:w.id,revision:w.revision,quantity:Number(quantity),buyer:buyer.trim(),note:note.trim()});
 }
 return <DirectDialog title="Reserva" dark={dark} brand={brand} onClose={()=>{if(!command.saving)onClose();}}><div className={styles.body} aria-busy={command.saving}>
  {contextError&&<p role="alert">{contextError}</p>}
  <p>As unidades reservadas ficam bloqueadas. A venda deve ser concluída pela reserva. Não há vencimento automático.</p>
  {notice&&<p role="status">{notice}</p>}{context.sync&&<p role="status">{context.sync.message}</p>}
  {payload?<section className={styles.formSection} aria-label="Confirmar reserva">
   <h3>{payload.action==='reserve'?'Confirmar reserva':payload.action==='cancel'?'Cancelar reserva e liberar unidades?':'Concluir venda da reserva?'}</h3>
   <p><strong>{String(payload.buyer||payload.buyerLabel||'Reserva selecionada')}</strong> · {String(payload.quantity||payload.quantityLabel||'')} unidade(s)</p>
   {payload.action==='reserve'&&<p>{context.warehouses.find(w=>w.id===payload.warehouseId)?.name} · Disponível após reservar: {(w?.quantity??0)-Number(payload.quantity)} un.</p>}
   {payload.action==='sell'&&<p>Valor unitário: {directMoney(Number(payload.unitPriceCents))} · Data: {String(payload.soldOn).split('-').reverse().join('/')}</p>}
   {operationWarehouse?.is_online&&<p>Online: a quantidade disponível será enviada aos anúncios vinculados. O envio depende da confirmação de cada marketplace; falhas permanecem pendentes.</p>}
   {pending&&!command.saving&&<p role="status">Há uma tentativa guardada. Repita a confirmação para recuperar o resultado, sem duplicar.</p>}
   <div className={styles.actions}><BotaoAcaoCompacto disabled={locked} onClick={()=>setReview(null)}>Voltar</BotaoAcaoCompacto><BotaoAcaoCompacto variante="primario" disabled={command.saving} onClick={()=>void execute()}>{command.saving?'Confirmando…':pending?'Repetir confirmação':payload.action==='reserve'?'Confirmar reserva':payload.action==='cancel'?'Cancelar e liberar':'Confirmar venda'}</BotaoAcaoCompacto></div>
  </section>:<>
   <div className={styles.actions}><BotaoAcaoCompacto variante={creating?'primario':'secundario'} onClick={()=>{setCreating(true);setSelected(null);setError('');}}>Nova reserva</BotaoAcaoCompacto><BotaoAcaoCompacto variante={!creating?'primario':'secundario'} onClick={()=>{setCreating(false);setSelected(null);}}>Minhas reservas ({context.reservations.length})</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={onRefresh}>Atualizar</BotaoAcaoCompacto></div>
   {creating&&!selected&&<form onSubmit={prepare} className={styles.formSection}>
    <label>Estoque de origem<select value={warehouseId} required onChange={e=>{setWarehouseId(e.target.value);setQuantity('1');}}><option value="">Selecione o estoque</option>{context.warehouses.map(w=><option key={w.id} value={w.id} disabled={!w.quantity}>{w.name} · {w.quantity??0} disponível(is){w.reservedQuantity?` · ${w.reservedQuantity} reservado(s)`:''}</option>)}</select></label>
    {w&&<><div className={styles.availableBalance}><span>Disponível para reservar</span><strong>{w.quantity??0} un.</strong></div><label>Quantidade<input type="number" min={1} max={w.quantity??0} step={1} inputMode="numeric" value={quantity} readOnly={w.quantity===1} required onChange={e=>setQuantity(e.target.value)}/></label><label>Possível comprador<input maxLength={120} required value={buyer} onChange={e=>setBuyer(e.target.value)}/></label><label>Observação (opcional)<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label>{w.is_online&&<p>A reserva reduz o disponível em todos os anúncios vinculados. Ao zerar, solicita a pausa para impedir novas compras.</p>}<div className={styles.actions}><BotaoAcaoCompacto type="submit" variante="primario">Revisar reserva</BotaoAcaoCompacto></div></>}
   </form>}
   {!creating&&!selected&&<section aria-label="Reservas ativas">{context.reservations.length?context.reservations.map(r=><article className={styles.formSection} key={r.id}>
    <strong>Reservado · {r.buyer}</strong><p>{context.warehouses.find(w=>w.id===r.warehouseId)?.name} · {r.quantity} un.{r.actorId===context.actorId?' · Você':''}</p><small>{marketplaceDateTimeLabel(r.createdAt)}</small>{r.note&&<p>{r.note}</p>}
    <div className={styles.actions}><BotaoAcaoCompacto variante="primario" onClick={()=>{setSelected(r);setAction('sell');setPrice('');}}>Concluir venda</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={()=>{setSelected(r);setAction('cancel');setReview({action:'cancel',reservationId:r.id,reservationRevision:r.revision,buyerLabel:r.buyer,quantityLabel:r.quantity});}}>Cancelar reserva</BotaoAcaoCompacto></div>
   </article>):<p>Nenhuma reserva ativa deste produto.</p>}</section>}
   {selected&&action==='sell'&&<form onSubmit={prepare} className={styles.formSection}><h3>Concluir venda · {selected.buyer}</h3><p>{selected.quantity} un. de {context.warehouses.find(w=>w.id===selected.warehouseId)?.name}</p><label>Valor unitário (R$)<CampoMoeda value={price} onChange={setPrice} required/></label><label>Data da venda<CampoData anoCurto value={soldOn} onChange={setSoldOn} min="2000-01-01" max={saleToday()} required/></label><div className={styles.actions}><BotaoAcaoCompacto onClick={()=>setSelected(null)}>Voltar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" variante="primario">Revisar venda</BotaoAcaoCompacto></div></form>}
  </>}
  {(error||command.error)&&<p role="alert" className={styles.error}>{error||command.error}</p>}
 </div></DirectDialog>;
}
