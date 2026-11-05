'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent,type RefObject} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import CampoData from '@/app/components/CampoData';
import {corTextoSobreFundo} from '@/app/lib/cores-avanta';
import {formatarMoedaDigitada} from '@/app/lib/formatters';
import {suggestedPriceCents,type PricePercentages} from '@/app/modules/marketplaces/price-settings';
import {DIRECT_SALES_PATH,saleToday,validSoldOn,WITHDRAW_REASONS} from '@/app/modules/marketplaces/direct-sales';
import type {WarehouseContext} from '@/app/modules/marketplaces/warehouses';
import type {LotsRequest} from './usePriceLotCapture';
import {PRODUCT_STOCK_CHANGED} from './product-stock-events';
import useDirectSaleCommand from './useDirectSaleCommand';
import DirectSalesHistory from './DirectSalesHistory';
import styles from './direct-sales.module.css';
export type DirectContext=WarehouseContext&{actorId:string;canSell:boolean;canWithdraw:boolean;product:{id:string;name:string;ean:string|null;picture:string|null;referenceCents:number|null};percentages:PricePercentages};
export const directMoney=(cents:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export function DirectDialog({title,onClose,children,dark=false,brand='#003E73',closeInFooter=false,className=''}:{title:string;onClose:()=>void;children:React.ReactNode;dark?:boolean;brand?:string;closeInFooter?:boolean;className?:string}){
 return <CardExpandidoModal aberto rotulo={title} onFechar={onClose}><div className={`${styles.scope} ${styles.dialogScope} ${dark?styles.dark:''}`} style={{'--brand':brand,'--av-action-on-brand':corTextoSobreFundo(brand)} as CSSProperties}><section className={`${styles.dialog} ${className}`}><header className={styles.header}><h2>{title}</h2>{!closeInFooter&&<BotaoAcaoCompacto somenteIcone variante="discreto" aria-label={`Fechar ${title.toLowerCase()}`} onClick={onClose}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></BotaoAcaoCompacto>}</header>{children}{closeInFooter&&<footer className={`${styles.body} ${styles.actions}`}><BotaoAcaoCompacto variante="primario" onClick={onClose}>Fechar</BotaoAcaoCompacto></footer>}</section></div></CardExpandidoModal>;
}
export default function DirectSaleActions({companyId,productId,historyId,initialWarehouseId,request,disabled,dark,brand,onChanged,onBusyChange,saleRequest=0,saleTriggerRef,onSaleAccessLoaded,onSaleRequestHandled,compactSale=false}:{companyId:string;productId?:string;historyId?:string;initialWarehouseId?:string;request:LotsRequest;disabled?:boolean;dark?:boolean;brand?:string;onChanged?:()=>void;onBusyChange?:(busy:boolean)=>void;saleRequest?:number;saleTriggerRef?:RefObject<HTMLButtonElement|null>;onSaleAccessLoaded?:(allowed:boolean)=>void;onSaleRequestHandled?:()=>void;compactSale?:boolean}){
 const [context,setContext]=useState<DirectContext|null>(null),[error,setError]=useState(''),[mode,setMode]=useState<'sell'|'withdraw'|'history'|''>('');
 const lastTrigger=useRef<HTMLButtonElement|null>(null);
 const handledSaleRequest=useRef(0);
 const load=useCallback(async(signal?:AbortSignal)=>{
  const c=await request(DIRECT_SALES_PATH,{method:'POST',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20_000)]):AbortSignal.timeout(20_000),body:JSON.stringify({empresaId:companyId,action:'context',...(historyId?{historyId}:{productId})})}) as DirectContext;
  if(!signal?.aborted){setContext(c);setError('');}return c;
 },[companyId,historyId,productId,request]);
 useEffect(()=>{const a=new AbortController(),frame=requestAnimationFrame(()=>void load(a.signal).catch(e=>{if(!a.signal.aborted)setError(e.message);}));return()=>{cancelAnimationFrame(frame);a.abort();};},[load]);
 useEffect(()=>{const fn=(e:Event)=>{if((e as CustomEvent).detail?.companyId===companyId)void load().catch(e=>setError(e.message));};window.addEventListener(PRODUCT_STOCK_CHANGED,fn);return()=>window.removeEventListener(PRODUCT_STOCK_CHANGED,fn);},[companyId,load]);
 useEffect(()=>{onBusyChange?.(!!mode);return()=>onBusyChange?.(false);},[mode,onBusyChange]);
 const dismiss=()=>{setMode('');requestAnimationFrame(()=>{if(lastTrigger.current?.isConnected)lastTrigger.current.focus();});};
 const selectedMissing=!!initialWarehouseId&&!!context&&!context.warehouses.some(w=>w.id===initialWarehouseId);
 const hasSaleStock=!!context?.warehouses.some(w=>(w.quantity??0)>0);
 useEffect(()=>{onSaleAccessLoaded?.(!!context?.canSell&&context.warehousesReady&&hasSaleStock&&!selectedMissing&&!error);},[context,error,hasSaleStock,selectedMissing,onSaleAccessLoaded]);
 useEffect(()=>{
  if(!saleRequest){handledSaleRequest.current=0;return;}
  if(saleRequest===handledSaleRequest.current||!context)return;
  let active=true;
  queueMicrotask(()=>{
   if(!active)return;
   handledSaleRequest.current=saleRequest;
   onSaleRequestHandled?.();
   if(disabled||!context.canSell||!context.warehousesReady||selectedMissing){setError('Não foi possível abrir a venda. Confira a permissão e atualize os estoques.');return;}
   if(!hasSaleStock){setError('Produto sem saldo disponível nos estoques. Atualize o saldo antes de vender.');return;}
   lastTrigger.current=saleTriggerRef?.current||null;
   setMode('sell');
  });
  return()=>{active=false;};
 },[saleRequest,context,disabled,hasSaleStock,selectedMissing,saleTriggerRef,onSaleRequestHandled]);
 const otherActions=<>
   {context?.canWithdraw&&<BotaoAcaoCompacto data-stock-action="withdraw" disabled={disabled||!context.warehousesReady||selectedMissing} onClick={e=>{lastTrigger.current=e.currentTarget;setMode('withdraw');}}>Outras saídas</BotaoAcaoCompacto>}
   {context?.canSell&&<BotaoAcaoCompacto data-stock-action="history" disabled={disabled} onClick={e=>{lastTrigger.current=e.currentTarget;setMode('history');}}>Vendas diretas</BotaoAcaoCompacto>}
 </>;
 return <div className={`${styles.scope} ${dark?styles.dark:''}`} style={{'--brand':brand||'#003e73'} as CSSProperties}>
  {(context?.canSell||context?.canWithdraw)&&(compactSale?<details className={styles.moreActions}><summary>Outras ações</summary><div className={styles.actions}>{otherActions}</div></details>:<section className={styles.actionSection} aria-label="Vendas e saídas"><h3>Vendas e saídas</h3><div className={styles.actions}>
   {context?.canSell&&<BotaoAcaoCompacto data-stock-action="sale" disabled={disabled||!context.warehousesReady||!hasSaleStock||selectedMissing} onClick={e=>{if(!hasSaleStock)return;lastTrigger.current=e.currentTarget;setMode('sell');}}>Registrar venda</BotaoAcaoCompacto>}
   {otherActions}
  </div></section>)}
  {selectedMissing&&<p role="alert">Estoque selecionado indisponível. Atualize os estoques antes de registrar uma saída.</p>}
  {error&&<p className={styles.error} role="alert">{error}<BotaoAcaoCompacto onClick={()=>void load().catch(e=>setError(e.message))}>Atualizar saídas</BotaoAcaoCompacto></p>}
  {context&&mode==='history'&&<DirectSalesHistory companyId={companyId} productId={context.product.id} request={request} dark={dark} brand={brand} onClose={dismiss}/>}
  {context&&(mode==='sell'||mode==='withdraw')&&<DirectSaleForm key={`${companyId}:${context.actorId}:${context.product.id}`} companyId={companyId} context={context} initialWarehouseId={initialWarehouseId} mode={mode} request={request} dark={dark} brand={brand} onClose={dismiss} onSaved={()=>{dismiss();onChanged?.();void load().catch(e=>setError(e.message));}}/>}
 </div>;
}
function DirectSaleForm({companyId,context,initialWarehouseId,mode,request,onClose,onSaved,dark,brand}:{companyId:string;context:DirectContext;initialWarehouseId?:string;mode:'sell'|'withdraw';request:LotsRequest;onClose:()=>void;onSaved:()=>void;dark?:boolean;brand?:string}){
 const command=useDirectSaleCommand(companyId,context.actorId,`product:${context.product.id}`,request);
 const p=command.pending?.payload;
 const [warehouseId,setWarehouse]=useState(String(p?.warehouseId||(mode==='sell'
  ? context.warehouses.find(w=>w.id===initialWarehouseId&&(w.quantity??0)>0)?.id||context.warehouses.find(w=>w.is_online&&(w.quantity??0)>0)?.id||context.warehouses.find(w=>(w.quantity??0)>0)?.id
  : initialWarehouseId||context.warehouses.find(w=>w.is_online)?.id)||context.warehouses[0]?.id||''));
 const [quantity,setQuantity]=useState(String(p?.quantity||1)),[price,setPrice]=useState(p?.unitPriceCents?formatarMoedaDigitada(String(p.unitPriceCents)):''),[soldOn,setSoldOn]=useState(String(p?.soldOn||saleToday())),[note,setNote]=useState(String(p?.note||'')),[reason,setReason]=useState(String(p?.reason||'damage')),[error,setError]=useState('');
 const alive=useRef(true),input=useRef<HTMLInputElement>(null),priceInput=useRef<HTMLInputElement>(null),stockSelect=useRef<HTMLSelectElement>(null);
 useEffect(()=>{alive.current=true;const f=requestAnimationFrame(()=>input.current?.focus());return()=>{alive.current=false;cancelAnimationFrame(f);};},[]);
 const selected=context.warehouses.find(w=>w.id===warehouseId),operation=String(p?.action||mode),locked=command.saving||!!command.pending;
 const cents=Number(price.replace(/\D/g,'')),qty=Number(quantity),suggestions=suggestedPriceCents(context.product.referenceCents,context.percentages);
 async function submit(e:FormEvent){
  e.preventDefault();setError('');
  if(!command.pending&&(!selected||selected.quantity==null)){setError('Selecione um estoque com saldo confirmado.');stockSelect.current?.focus();return;}
  if(!command.pending&&(!/^\d{1,5}$/.test(quantity)||qty<1||qty>(selected?.quantity??0))){setError('Informe uma quantidade disponível neste estoque.');input.current?.focus();return;}
  if(!command.pending&&operation==='sell'&&(!Number.isSafeInteger(cents)||cents<1||cents>999999999)){setError('Informe o valor unitário vendido, maior que zero.');priceInput.current?.focus();return;}
  if(!command.pending&&operation==='sell'&&!validSoldOn(soldOn)){setError('Informe uma data válida, não futura.');document.getElementById(`direct-date-${context.product.id}`)?.focus();return;}
  const ok=await command.run({action:operation,productId:context.product.id,warehouseId,revision:selected?.revision,quantity:qty,note,...(operation==='sell'?{unitPriceCents:cents,soldOn}:{reason})});
  if(ok&&alive.current)onSaved();
 }
 return <DirectDialog title={operation==='sell'?'Registrar venda':'Outras saídas'} onClose={onClose} dark={dark} brand={brand}><form className={styles.body} onSubmit={submit}>
  <div className={styles.productIdentity}><h3>{context.product.name}</h3><p>EAN: {context.product.ean||'Não informado'}</p></div>
  {command.pending&&!command.saving&&<p role="status">Há uma tentativa guardada. Confira os dados e repita a mesma confirmação para recuperar o resultado, sem duplicar.</p>}
  <section className={styles.formSection} aria-label="Origem da movimentação"><div className={styles.grid}>
   <label>Estoque de origem<select ref={stockSelect} disabled={locked} value={warehouseId} aria-describedby={`direct-balance-${context.product.id}${error?` direct-error-${context.product.id}`:''}`} onChange={e=>setWarehouse(e.target.value)}>{!selected&&<option value={warehouseId}>Estoque indisponível</option>}{context.warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
   {operation==='sell'?<label>Data da venda<CampoData anoCurto id={`direct-date-${context.product.id}`} value={soldOn} onChange={setSoldOn} disabled={locked} max={saleToday()} min="2000-01-01" required/></label>:<label>Motivo<select disabled={locked} value={reason} onChange={e=>setReason(e.target.value)}>{Object.entries(WITHDRAW_REASONS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>}
  </div><div className={styles.availableBalance} id={`direct-balance-${context.product.id}`} role="status"><span>Saldo disponível</span><strong>{!selected?'Estoque indisponível':`${selected.quantity ?? 0} ${selected.quantity===1?'unidade':'unidades'}`}</strong></div></section>
  <section className={styles.formSection} aria-label="Quantidade e valor"><div className={styles.grid}>
   <div className={styles.field}><label htmlFor={`direct-quantity-${context.product.id}`}>Quantidade</label><div className={styles.quantity}><BotaoAcaoCompacto somenteIcone aria-label="Diminuir quantidade vendida" disabled={locked||qty<=1} onClick={()=>setQuantity(String(Math.max(1,qty-1)))}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14"/></svg></BotaoAcaoCompacto><input ref={input} id={`direct-quantity-${context.product.id}`} inputMode="numeric" maxLength={5} value={quantity} disabled={locked} onChange={e=>{if(/^\d{0,5}$/.test(e.target.value))setQuantity(e.target.value);}}/><BotaoAcaoCompacto somenteIcone aria-label="Aumentar quantidade vendida" disabled={locked||qty>=99999} onClick={()=>setQuantity(String(qty+1))}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></BotaoAcaoCompacto></div></div>
   {operation==='sell'&&<label>Valor unitário (R$)<input ref={priceInput} inputMode="decimal" value={price} disabled={locked} aria-describedby={error?`direct-error-${context.product.id}`:undefined} maxLength={15} onFocus={e=>{const el=e.currentTarget;requestAnimationFrame(()=>el.setSelectionRange(el.value.length,el.value.length));}} onChange={e=>setPrice(formatarMoedaDigitada(e.target.value))}/></label>}
  </div>
  {operation==='sell'&&suggestions&&<div className={styles.priceSuggestions}><span>Preços sugeridos</span><div className={`${styles.actions} ${styles.suggestions}`}>{Object.entries(suggestions).map(([key,value])=><BotaoAcaoCompacto key={key} data-price-level={key} disabled={locked} onClick={()=>setPrice(formatarMoedaDigitada(String(value)))}><span>{key==='minimum'?'Mínimo':key==='medium'?'Médio':'Ideal'}</span><strong>{directMoney(value)}</strong></BotaoAcaoCompacto>)}</div></div>}
  </section>
  <label className={styles.field}>Observação<input maxLength={500} value={note} disabled={locked} onChange={e=>setNote(e.target.value)}/></label>
  {operation==='sell'?<div className={styles.total}><span>Total da venda</span><strong>{directMoney((Number.isSafeInteger(cents)?cents:0)*(Number.isSafeInteger(qty)?qty:0))}</strong></div>:<p>Esta saída não gera venda nem receita.</p>}
  {selected?.is_online&&<p>Estoque Online: a saída atualizará os anúncios vinculados. Não registre novamente um pedido já importado do marketplace.</p>}
  {(error||command.error)&&<p role="alert" id={`direct-error-${context.product.id}`} className={styles.error}>{error||command.error}</p>}
  <div className={`${styles.actions} ${styles.formFooter}`}><BotaoAcaoCompacto onClick={onClose}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" variante="primario" disabled={command.saving}>{command.saving?'Salvando…':command.pending?'Repetir confirmação':operation==='sell'?'Confirmar venda':'Confirmar saída'}</BotaoAcaoCompacto></div>
 </form></DirectDialog>;
}
