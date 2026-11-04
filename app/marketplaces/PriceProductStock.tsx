'use client';
import {createPortal} from 'react-dom';
import { useCallback, useEffect, useRef, useState, type FormEvent, type CSSProperties } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import type { WarehouseContext } from '@/app/modules/marketplaces/warehouses';
import type { LotsRequest } from './usePriceLotCapture';
import { notifyProductStockChanged } from './product-stock-events';
import { priceStockState } from '../modules/marketplaces/price-stock-state';
import styles from './price-product-stock.module.css';
import postStyles from './product-post.module.css';
import DirectSaleActions from './DirectSaleActions';
import {DIRECT_SALES_CHANGED} from '@/app/modules/marketplaces/direct-sales';
import {StockSyncDialog} from './StockSync';
import {STOCK_SYNC_PATH,listingStockSyncTerminated,type StockSyncContext} from '@/app/modules/marketplaces/stock-reconciliation';
import ProductRemoval from './ProductRemoval';
import { PRODUCT_INTERNAL_NOTES_LIMIT, type ProductInternalNotes } from '@/app/modules/marketplaces/product-internal-notes';

type Stock = { productId: string; quantity: number | null; confirmed: boolean; revision: number; canManage: boolean;canDeleteProduct?:boolean;importStockReview?:boolean;syncHint?:string;syncLinkedCount?:number } & Partial<WarehouseContext> & Partial<ProductInternalNotes>;
type NotesLoaded = { productId: string; historyId?: string; notes: string };
type Props = { companyId: string; historyId?: string; productId?: string; request: LotsRequest; disabled?: boolean; onBusyChange?: (busy: boolean) => void; onStockUpdated?: (revision: number) => void; onAccessLoaded?: (canManage: boolean) => void; onInternalNotesLoaded?: (value: NotesLoaded) => void; showInternalNotes?: boolean; showRemoval?:boolean;onProductRemoved?:()=>void;initialWarehouseId?: string; idPrefix?: string; dark?:boolean; brand?:string; compactSummary?: boolean; refreshContainer?: HTMLElement | null };
export default function PriceProductStock(props: Props) {
  return <StockController key={`${props.companyId}:${props.historyId || props.productId}`} {...props} />;
}
function StockController({ companyId, historyId, productId, request, disabled, onBusyChange, onStockUpdated, onAccessLoaded, onInternalNotesLoaded, showInternalNotes = true, showRemoval=true,onProductRemoved,initialWarehouseId, idPrefix = 'price',dark,brand, compactSummary = false, refreshContainer }: Props) {
  const [stock, setStock] = useState<Stock | null>(null), [loading, setLoading] = useState(true), [editing, setEditing] = useState(false), [quantity, setQuantity] = useState(''), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [refresh, setRefresh] = useState(0);
  const [quantityLocked, setQuantityLocked] = useState(false);
  const [syncing,setSyncing]=useState(false),[syncContext,setSyncContext]=useState<StockSyncContext|null>(null);
  const syncLock=useRef(false);
  useEffect(()=>{onBusyChange?.(syncing||!!syncContext);return()=>onBusyChange?.(false);},[syncing,syncContext,onBusyChange]);
  const [confirmZero,setConfirmZero]=useState(false);
  const [confirmBalance,setConfirmBalance]=useState<number|null>(null);
  const [warehouseId,setWarehouseId]=useState(initialWarehouseId || ''),[operation,setOperation]=useState<'add'|'set'|'transfer'>('add'),[destinationId,setDestinationId]=useState('');
  const [canSell,setCanSell]=useState(false),[saleRequest,setSaleRequest]=useState(0);
  const [notes, setNotes] = useState('');
  const clearSaleRequest=useCallback(()=>setSaleRequest(0),[]);
  const saleTrigger=useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null), locked = useRef(false), alive = useRef(true);
  const attempt = useRef<{ key: string; quantity: number; revision: number; payload: Record<string,unknown> } | null>(null);
  const directRefresh=useRef(false),updatedCallback=useRef(onStockUpdated);
  const notesCallback=useRef(onInternalNotesLoaded);
  useEffect(()=>{notesCallback.current=onInternalNotesLoaded;},[onInternalNotesLoaded]);
  useEffect(()=>{updatedCallback.current=onStockUpdated;},[onStockUpdated]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; onBusyChange?.(false); }; }, [onBusyChange]);
  useEffect(() => {
    const controller = new AbortController();
    void request('/api/modulos/marketplaces/precos/estoque', { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]), body: JSON.stringify({ empresaId: companyId, action: 'context', ...(historyId ? { historyId } : { productId }) }) })
      .then(body => { if (!controller.signal.aborted) { const value=(body as { stock: Stock }).stock; setStock(value); notesCallback.current?.({productId:value.productId,historyId,notes:value.internalNotes || ''}); if(directRefresh.current){directRefresh.current=false;updatedCallback.current?.(value.revision);} if(!value.canManage)setEditing(false); onAccessLoaded?.(value.canManage); } })
      .catch(reason => { if (!controller.signal.aborted) setError(`${reason instanceof Error ? reason.message : 'Não foi possível conferir o cadastro e o saldo.'} Atualize antes de movimentar o estoque.`); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, historyId, productId, request, refresh, onAccessLoaded]);
  useEffect(() => { if (editing) field.current?.focus(); }, [editing]);
  useEffect(()=>{
    const changed=(event:Event)=>{
      if((event as CustomEvent).detail?.companyId!==companyId)return;
      if(editing||confirmBalance!==null||locked.current||attempt.current){setNotice('Houve uma venda ou saída. Atualize o cadastro e saldo antes de concluir outra alteração.');return;}
      // Atualização passiva: mantém o histórico/modal aberto e não provoca
      // novo evento de venda ao simplesmente reler o contexto do estoque.
      directRefresh.current=true;
      setRefresh(value=>value+1);
    };
    window.addEventListener(DIRECT_SALES_CHANGED,changed);return()=>window.removeEventListener(DIRECT_SALES_CHANGED,changed);
  },[companyId,editing,confirmBalance]);
  const busy = loading || saving || syncing || !!syncContext || disabled;
  const warehouses=stock?.warehouses || [];
  const requiredWarehouseMissing = Boolean(initialWarehouseId && stock?.warehousesReady && !warehouses.some(w => w.id === initialWarehouseId));
  const selected=warehouses.find(w=>w.id===warehouseId) || warehouses.find(w=>w.is_online) || warehouses[0];
  const onlineWarehouse=warehouses.find(w=>w.is_online);
  const reviewBalance=onlineWarehouse ? onlineWarehouse.quantity??0 : stock?.quantity??0;
  const destination=warehouses.find(w=>w.id===destinationId && w.id!==selected?.id);
  const state = stock ? priceStockState(selected ? {quantity:selected.quantity,confirmed:selected.confirmed_at!=null} : stock) : null;
  const minimum=selected ? operation==='set'?0:1 : state?.minimum ?? 1;
  // A confirmação pertence à auditoria; não substitui a quantidade apresentada.
  const confirmedTotal = warehouses.reduce((sum, warehouse) => sum + (warehouse.quantity ?? 0), 0);
  const hasSaleStock = warehouses.some(warehouse => (warehouse.quantity ?? 0) > 0);
  const totalLabel = stock?.warehousesReady === false ? 'Indisponível' : `${stock?.warehousesReady ? confirmedTotal : stock?.quantity ?? 0} un.`;
  function openStockEditor(nextOperation: 'add' | 'set') {
    setEditing(true); setOperation(nextOperation); setDestinationId('');
    setNotes(stock?.internalNotes || '');
    const currentQuantity = selected ? selected.quantity : stock?.quantity;
    setQuantity(nextOperation === 'set' ? String(currentQuantity ?? 0) : '');
    setError(''); setNotice('');
  }
  function openBalanceConfirmation() {
    if (!stock || busy || attempt.current) return;
    if(stock.warehousesReady&&!onlineWarehouse){setError('Estoque Online indisponível. Atualize os estoques antes de confirmar.');return;}
    if(onlineWarehouse)setWarehouseId(onlineWarehouse.id);
    setOperation('set');setDestinationId('');setNotes(stock.internalNotes||'');
    setQuantity(String(reviewBalance));setError('');setNotice('');setConfirmBalance(reviewBalance);
  }
  function refreshStock() { setLoading(true); setStock(null); setEditing(false); setError(''); setNotice(''); attempt.current = null; setQuantityLocked(false); setRefresh(value => value + 1); }
  async function synchronizeAndRefresh() {
    if (!stock || busy || syncLock.current) return;
    if (stock.syncLinkedCount === 0) { refreshStock(); return; }
    syncLock.current=true;setSyncing(true);setError('');setNotice('');
    try {
      const context=await request(STOCK_SYNC_PATH,{method:'POST',signal:AbortSignal.timeout(50_000),body:JSON.stringify({empresaId:companyId,productId:stock.productId,action:'review'})}) as StockSyncContext;
      const body=await request('/api/modulos/marketplaces/precos/estoque',{method:'POST',signal:AbortSignal.timeout(20_000),body:JSON.stringify({empresaId:companyId,action:'context',...(historyId?{historyId}:{productId:stock.productId})})}) as {stock:Stock};
      if(!alive.current)return;
      setStock(body.stock);notesCallback.current?.({productId:body.stock.productId,historyId,notes:body.stock.internalNotes||''});updatedCallback.current?.(body.stock.revision);
      const sources=context.sources.filter(source=>!listingStockSyncTerminated(source.status));
      const needsReview=context.revision!==body.stock.revision||context.pending||sources.some(source=>!source.eligible||source.quantity==null||source.quantity!==body.stock.quantity||(source.status==='active'&&body.stock.quantity===0));
      if(needsReview)setSyncContext(context);
      else setNotice('Saldos atualizados.');
    } catch(reason) {
      if(alive.current)setError(reason instanceof Error?reason.message:'Não foi possível atualizar os saldos. Tente novamente.');
    } finally {syncLock.current=false;if(alive.current){setSyncing(false);}}
  }
  function stepQuantity(delta: -1 | 1) {
    if (!state || busy || attempt.current) return;
    setQuantity(current => {
      const value = /^\d{1,5}$/.test(current) ? Number(current) : 0;
      return String(Math.max(minimum, Math.min(99_999, value + delta)));
    });
    setError('');
  }
  async function submit(event?: FormEvent,zeroConfirmed=false) {
    event?.preventDefault();
    if (!stock || locked.current || busy) return;
    if (requiredWarehouseMissing || stock.warehousesReady===false || (selected && operation==='transfer'&&!destination)) {setError('Selecione os estoques e atualize os saldos antes de continuar.');return;}
    if (!/^\d{1,5}$/.test(quantity) || Number(quantity) < minimum) { setError(minimum===0 ? 'Informe o saldo final de 0 a 99.999 unidades.' : 'Informe a quantidade de 1 a 99.999 unidades.'); field.current?.focus(); return; }
    if(Number(quantity)===0&&(!selected||selected.is_online)&&!zeroConfirmed&&!attempt.current){setConfirmZero(true);return;}
    setConfirmZero(false);
    const payload={action:selected?operation:'set',productId:stock.productId,...(historyId?{historyId}:{}),quantity:Number(quantity),revision:selected?.revision ?? stock.revision,...(selected?{warehouseId:selected.id}:{}),...(destination&&operation==='transfer'?{destinationId:destination.id,destinationRevision:destination.revision}:{}),...(selected&&stock.internalNotesAvailable?{internalNotes:notes,internalNotesRevision:stock.internalNotesRevision ?? 0}:{})};
    if (attempt.current && JSON.stringify(attempt.current.payload)!==JSON.stringify(payload)) { setError('Confira o saldo com Atualizar antes de mudar uma tentativa sem resposta.'); return; }
    const command = attempt.current || { key: crypto.randomUUID(), quantity: Number(quantity), revision: selected?.revision ?? stock.revision, payload };
    attempt.current = command; locked.current = true; setQuantityLocked(true); setSaving(true); onBusyChange?.(true); setError(''); setNotice('');
    try {
      const body = await request('/api/modulos/marketplaces/precos/estoque', { method: 'POST', signal: AbortSignal.timeout(30_000), body: JSON.stringify({ empresaId: companyId, ...command.payload, requestKey: command.key }) }) as { stock: Stock };
      if (alive.current) { setStock(body.stock); notesCallback.current?.({productId:body.stock.productId,historyId,notes:body.stock.internalNotes || ''}); setEditing(false); attempt.current = null; setQuantityLocked(false); setNotice(stock.internalNotesAvailable ? 'Estoque e observações atualizados.' : 'Saldo do estoque atualizado.'); onStockUpdated?.(body.stock.revision); notifyProductStockChanged(companyId); requestAnimationFrame(() => trigger.current?.focus()); return true; }
    } catch (reason) { if (alive.current) setError(`${reason instanceof Error ? reason.message : 'Não foi possível confirmar o estoque.'} Atualize para conferir o saldo antes de uma nova alteração. Repetir Concluir mantém a mesma tentativa, sem somar unidades.`); }
    finally { locked.current = false; if (alive.current) { setSaving(false); onBusyChange?.(false); } }
  }
  return <section className={`${styles.stock} ${compactSummary ? styles.compactSummary : ''}`} data-stock-presentation="numeric-v2" aria-label="Estoque do produto consultado" aria-busy={loading || saving}>
    {loading ? <p role="status">Conferindo cadastro e estoque…</p> : stock && state ? <>
      {stock.importStockReview && <><p role="status">Estoque a confirmar</p>{!editing&&stock.canManage&&<BotaoAcaoCompacto disabled={busy||requiredWarehouseMissing||stock.warehousesReady===false} data-stock-action="confirm" onClick={openBalanceConfirmation}>Confirmar saldo {reviewBalance}</BotaoAcaoCompacto>}</>}
      {compactSummary ? <>
        <dl className={`${postStyles.stockOptions} ${styles.balanceTotals}`} aria-label="Saldos por estoque">
          <div className={postStyles.stockIndicator}><dt>Total</dt><dd>{totalLabel}</dd></div>
          {stock.warehousesReady&&warehouses.map(w=><div className={postStyles.stockIndicator} key={w.id} aria-label={`${w.name}: ${w.quantity??0} unidades`} data-quantity={w.quantity??0}><dt>{w.name}{w.is_online&&w.name.toLowerCase()!=='online'?' · Online':''}</dt><dd>{`${w.quantity??0} un.`}</dd></div>)}
        </dl>
        {refreshContainer ? createPortal(<BotaoAcaoCompacto somenteIcone className={styles.refreshBalance} aria-label={syncing?"Atualizando saldos…":"Sincronizar e atualizar saldos"} disabled={busy} onClick={()=>void synchronizeAndRefresh()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg></BotaoAcaoCompacto>,refreshContainer) :         <div className={styles.balanceControls}><BotaoAcaoCompacto somenteIcone className={styles.refreshBalance} aria-label={syncing?"Atualizando saldos…":"Sincronizar e atualizar saldos"} disabled={busy} onClick={()=>void synchronizeAndRefresh()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg></BotaoAcaoCompacto></div>}
        {!editing && <div className={styles.balanceActions}>
          <BotaoAcaoCompacto ref={trigger} className={styles.adjustBalance} disabled={!stock.canManage || busy || requiredWarehouseMissing || stock.warehousesReady === false} onClick={() => openStockEditor('set')}>Ajustar estoque</BotaoAcaoCompacto>
          <BotaoAcaoCompacto className={styles.addBalance} disabled={!stock.canManage || busy || !selected || requiredWarehouseMissing || stock.warehousesReady === false} onClick={() => openStockEditor('add')}>Adicionar saldo</BotaoAcaoCompacto>
          <BotaoAcaoCompacto ref={saleTrigger} className={styles.sellBalance} disabled={busy || !canSell || !hasSaleStock || requiredWarehouseMissing || stock.warehousesReady === false} onClick={() => { if (hasSaleStock && canSell && !busy) setSaleRequest(value=>value+1); }}>Venda</BotaoAcaoCompacto>
        </div>}
      </> : stock.warehousesReady && <div className={styles.allocations}><strong>Total: {`${confirmedTotal} un.`}</strong>{warehouses.map(w=><span key={w.id}>{w.name}{w.is_online&&w.name.toLowerCase()!=='online'?' · Online':''}: {`${w.quantity ?? 0} un.`}</span>)}</div>}
      {stock.warehouseError && <p role="alert">{stock.warehouseError}</p>}
      {requiredWarehouseMissing && <p role="alert">O estoque selecionado não está mais disponível. Atualize a lista de estoques antes de movimentar.</p>}
      {!compactSummary && <div className={styles.heading}><div role="status"><strong>{selected?`${selected.name} · ${state.available?'Em estoque':'Sem unidades'}`:state.title}</strong><span>{selected?`${selected.quantity ?? 0} un.`:state.detail}</span></div>
        {!editing&&<div className={styles.headingActions}>{stock.canManage && <BotaoAcaoCompacto data-stock-action="adjust" ref={trigger} disabled={busy || requiredWarehouseMissing || stock.warehousesReady===false} onClick={() => openStockEditor('set')}>{state.action}</BotaoAcaoCompacto>}{stock.warehousesReady!==undefined&&<BotaoAcaoCompacto data-stock-action="refresh" disabled={busy} onClick={refreshStock}>Atualizar estoques</BotaoAcaoCompacto>}</div>}
      </div>}
      {editing && stock.canManage && !requiredWarehouseMissing && stock.warehousesReady!==false && <form onSubmit={submit} className={styles.form} style={{'--stock-accent':brand || '#003e73'} as CSSProperties}>
        <div className={styles.editorHeading}><span className={styles.editorIcon} aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4M12 12 3 8m9 4v9M7.5 5.5l9 5"/></svg></span><strong>{operation==='add'?'Adicionar saldo':operation==='transfer'?'Transferir produto':'Ajustar estoque'}</strong><span className={styles.editorTag}>{operation==='add'?'Entrada':operation==='transfer'?'Transferência':'Ajuste'}</span></div>
        {!!warehouses.length && <div className={styles.warehouseFields}>
          <label>Estoque<select value={selected?.id || ''} disabled={busy||quantityLocked} onChange={event=>{setWarehouseId(event.target.value);setQuantity('');setError('');setDestinationId('');}}>{warehouses.map(w=><option value={w.id} key={w.id}>{w.name}{w.is_online&&w.name.toLowerCase()!=='online'?' · Online':''}</option>)}</select></label>
          <label>Operação<select value={operation} disabled={busy||quantityLocked} onChange={event=>{setOperation(event.target.value as typeof operation);setDestinationId('');setQuantity('');setError('');}}><option value="add">Entrada</option><option value="set">Saldo final</option><option value="transfer">Transferir</option></select></label>
          {operation==='transfer'&&<label>Estoque de destino<select value={destination?.id || ''} disabled={busy||quantityLocked} onChange={event=>setDestinationId(event.target.value)}><option value="">Selecione</option>{warehouses.filter(w=>w.id!==selected?.id).map(w=><option key={w.id} value={w.id}>{w.name}{w.is_online&&w.name.toLowerCase()!=='online'?' · Online':''}</option>)}</select></label>}
        </div>}
        <div className={styles.quantityRow}><div className={styles.quantityField}><label htmlFor={`${idPrefix}-stock-${stock.productId}`}>{operation==='set'?'Saldo final':'Quantidade'}</label>
        <div className={styles.controls}>
          <BotaoAcaoCompacto somenteIcone aria-label="Diminuir quantidade" disabled={busy || quantityLocked || (quantity !== '' && Number(quantity) <= minimum)} onClick={() => stepQuantity(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14" /></svg></BotaoAcaoCompacto>
          <input ref={field} id={`${idPrefix}-stock-${stock.productId}`} inputMode="numeric" autoComplete="off" placeholder="0" size={5} maxLength={5} value={quantity} onChange={event => { if (/^\d{0,5}$/.test(event.target.value)) setQuantity(event.target.value); }} disabled={busy || quantityLocked} aria-invalid={!!error} aria-describedby={error ? `${idPrefix}-stock-error-${stock.productId}` : undefined} />
          <BotaoAcaoCompacto somenteIcone aria-label="Aumentar quantidade" disabled={busy || quantityLocked || Number(quantity) >= 99_999} onClick={() => stepQuantity(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></BotaoAcaoCompacto>
        </div></div><div className={styles.currentBalance}><span>Saldo atual</span><strong>{selected ? selected.quantity ?? 0 : stock.quantity ?? 0}<small>un.</small></strong></div></div>
        <div className={styles.notesField}><div className={styles.notesHeading}><label htmlFor={`${idPrefix}-notes-${stock.productId}`}>Observações internas</label><span>Opcional</span></div><textarea id={`${idPrefix}-notes-${stock.productId}`} rows={2} maxLength={PRODUCT_INTERNAL_NOTES_LIMIT} value={notes} disabled={busy||quantityLocked||!stock.internalNotesAvailable} onChange={event=>setNotes(event.target.value)} placeholder="Embalagem, acessórios, avarias…" aria-describedby={`${idPrefix}-notes-help-${stock.productId}`}/><small id={`${idPrefix}-notes-help-${stock.productId}`}>{stock.internalNotesAvailable ? 'Interno · não vai aos anúncios' : 'Notas aguardam atualização do banco'}<span>{notes.length}/{PRODUCT_INTERNAL_NOTES_LIMIT}</span></small></div>
        <div className={styles.formActions}><BotaoAcaoCompacto disabled={saving} onClick={() => { if (attempt.current) { refreshStock(); return; } setEditing(false); setError(''); requestAnimationFrame(() => trigger.current?.focus()); }}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto variante="primario" className={styles.confirm} type="submit" disabled={busy}>{saving ? 'Salvando…' : 'Concluir'}</BotaoAcaoCompacto></div>
      </form>}
      {!editing && showInternalNotes && stock.internalNotes && <div className={styles.internalNotes}><strong>Observações internas</strong><p>{stock.internalNotes}</p><small>Visíveis apenas aos usuários. Não enviadas aos anúncios online.</small></div>}
      {!stock.canManage && <p>Para dar entrada, ajustar saldo ou transferir, solicite ao gestor marcar “Editar estoque” no seu cadastro do AvantaPreços.</p>}
      <DirectSaleActions key={`${companyId}:${stock.productId}`} companyId={companyId} productId={stock.productId} historyId={historyId} initialWarehouseId={selected?.id || initialWarehouseId} request={request} disabled={busy||editing} dark={dark} brand={brand} onBusyChange={onBusyChange} onChanged={refreshStock} compactSale={compactSummary} saleRequest={saleRequest} saleTriggerRef={saleTrigger} onSaleAccessLoaded={setCanSell} onSaleRequestHandled={clearSaleRequest}/>
      {showRemoval&&stock.canDeleteProduct&&<ProductRemoval companyId={companyId} productId={stock.productId} request={request} disabled={!!busy||editing} dark={dark} brand={brand} onBusyChange={onBusyChange} onRemoved={()=>{setStock(null);onProductRemoved?.();}}/>}
    </> : null}
    <ModalConfirmacao aberto={confirmZero} titulo="Confirmar saldo Online zerado?" mensagem="Confirma que o estoque Online está zerado? Os anúncios elegíveis terão a pausa solicitada." textoConfirmar="Confirmar saldo zero" textoCancelar="Cancelar" darkMode={dark} corPrimaria={brand} carregando={saving} aoCancelar={()=>setConfirmZero(false)} aoConfirmar={async()=>{await submit(undefined,true);}}/>
    <ModalConfirmacao aberto={confirmBalance!==null} titulo={`Confirmar saldo ${confirmBalance??0}?`} mensagem={error||`Confirma ${confirmBalance??0} unidade(s) no estoque Online?`} textoConfirmar="Confirmar" textoCancelar="Cancelar" darkMode={dark} corPrimaria={brand} carregando={saving} aoCancelar={()=>setConfirmBalance(null)} aoConfirmar={async()=>{if(await submit(undefined,true))setConfirmBalance(null);}}/>
    {notice && <p role="status">{notice}</p>}
    {error && <p id={`${idPrefix}-stock-error-${stock?.productId}`} role="alert">{error}</p>}
    {syncing&&<p role="status">Atualizando saldos…</p>}
    {syncContext&&<StockSyncDialog companyId={companyId} productId={syncContext.productId} request={request} dark={dark} brand={brand} initialContext={syncContext} onUpdated={()=>setRefresh(value=>value+1)} onClose={()=>{setSyncContext(null);setRefresh(value=>value+1);}}/>}
    {error && <BotaoAcaoCompacto disabled={loading || saving} onClick={refreshStock}>Atualizar cadastro e saldo</BotaoAcaoCompacto>}
  </section>;
}
