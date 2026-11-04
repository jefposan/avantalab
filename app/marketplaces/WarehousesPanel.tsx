'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { corTextoSobreFundo } from '@/app/lib/cores-avanta';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import MarketplaceSelect from './MarketplaceSelect';
import type { ProductPublicationFilter } from '@/app/modules/marketplaces/local-product-publications';
import { salesAccountAvailable } from '@/app/modules/marketplaces/magalu-sales-model';
import { accountDisplayName } from './account-identification';
import { warehousePillColor, type Warehouse } from '@/app/modules/marketplaces/warehouses';
import { panelCountText } from '@/app/modules/marketplaces/panel-count';
import { marketplaceClientRequest } from './Anunciados';
import ProductsStock, { type ProductListContext, type ProductListCount } from './ProductsStock';
import { notifyProductStockChanged, PRODUCT_STOCK_CHANGED } from './product-stock-events';
import styles from './marketplaces.module.css';
import {usePanelExpansion,type PanelExpansionProps} from './panel-expansion';
import type { NoticeTarget } from '@/app/modules/marketplaces/notice-navigation';

const emptyContext: ProductListContext = { accounts: [], preparationLocked: true, onPrepare() {} };
type Props = PanelExpansionProps & { noticeTarget?:NoticeTarget; companyId: string; canManage: boolean; dark: boolean; brand: string; refreshKey?: number; request?: typeof marketplaceClientRequest; reorderHandle?: ReactNode; productContext?: ProductListContext };

export default function WarehousesPanel({ noticeTarget, companyId, canManage, dark, brand, refreshKey = 0, request = marketplaceClientRequest, reorderHandle, productContext = emptyContext,panelExpanded,onPanelExpandedChange }: Props) {
  const [open,setOpen]=usePanelExpansion({panelExpanded,onPanelExpandedChange});
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]), [selected, setSelected] = useState('');
  const [publicationFilter, setPublicationFilter] = useState<ProductPublicationFilter>('all');
  const [accountSelection,setAccountSelection]=useState({companyId,value:''});
  const filterAccounts=productContext.accounts.filter(salesAccountAvailable);
  const accountId=accountSelection.companyId===companyId && filterAccounts.some(account=>account.id===accountSelection.value) ? accountSelection.value : '';
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(''), [listLocked, setListLocked] = useState(false), [catalogRefresh, setCatalogRefresh] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false), [editing, setEditing] = useState(''), [name, setName] = useState(''), [formError, setFormError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [searchNavigationHost, setSearchNavigationHost] = useState<HTMLDivElement | null>(null);
  const countScope=JSON.stringify([companyId,selected,publicationFilter,accountId]);
  const [listCount, setListCount] = useState<(ProductListCount & { warehouseId: string; scope: string }) | null>(null);
  const receiveCount = useCallback((count: ProductListCount) => setListCount({ ...count, warehouseId: selected,scope:countScope }), [selected,countScope]);
  const stockScope = JSON.stringify([companyId, selected]);
  const [warehouseCount, setWarehouseCount] = useState<(ProductListCount & { scope: string }) | null>(null);
  const confirmedWarehouseCount = useRef<{ scope: string; total: number | null }>({ scope: '', total: null });
  const warehouseCountController = useRef<AbortController | null>(null);
  const [confirmation, setConfirmation] = useState<{ action: 'online' | 'archive'; warehouseId: string; name: string } | null>(null);
  const attempt = useRef<{ key: string; command: Record<string, unknown>; signature: string } | null>(null);
  const lock = useRef(false), generation = useRef(0), alive = useRef(true), editorSession = useRef(0), nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!editorOpen) return; const frame = requestAnimationFrame(() => nameInput.current?.focus()); return () => cancelAnimationFrame(frame); }, [editorOpen]);

  const load = useCallback(async (signal?: AbortSignal): Promise<Warehouse[] | null> => {
    const current = ++generation.current;
    setLoading(true); setError('');
    const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000);
    try {
      const data = await request(`estoques?${new URLSearchParams({ empresaId: companyId })}`, undefined, requestSignal);
      if (requestSignal.aborted || current !== generation.current || !alive.current) return null;
      if (!Array.isArray(data.warehouses)) throw new Error('Não foi possível confirmar a lista de estoques.');
      const rows = data.warehouses as Warehouse[];
      setWarehouses(rows); setSelected(id => rows.some(w => w.id === id) ? id : rows[0]?.id || ''); setCatalogRefresh(value => value + 1);
      return rows;
    } catch (failure) {
      if (!signal?.aborted && current === generation.current && alive.current) setError(failure instanceof Error ? failure.message : 'Não foi possível consultar os estoques.');
      return null;
    } finally { if (!signal?.aborted && current === generation.current && alive.current) setLoading(false); }
  }, [companyId, request]);
  useEffect(() => { const c = new AbortController(); queueMicrotask(() => { if (!c.signal.aborted) void load(c.signal); }); return () => c.abort(); }, [load, refreshKey]);

  // O título conta todo o estoque; conta/publicação/busca pertencem somente à lista.
  const countWarehouse = useCallback(async () => {
    if (!selected) return;
    warehouseCountController.current?.abort();
    const controller = new AbortController(); warehouseCountController.current = controller;
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]);
    const previous = confirmedWarehouseCount.current.scope === stockScope ? confirmedWarehouseCount.current.total : null;
    setWarehouseCount({ scope: stockScope, total: previous, loading: true });
    try {
      const data = await request(`produtos?${new URLSearchParams({ empresaId: companyId, warehouseId: selected, countOnly: '1' })}`, undefined, signal);
      if (controller.signal.aborted || !alive.current) return;
      signal.throwIfAborted();
      if (!Number.isInteger(data.total) || data.total < 0) throw new Error('Contagem de estoque indisponível.');
      confirmedWarehouseCount.current = { scope: stockScope, total: data.total };
      setWarehouseCount({ scope: stockScope, total: data.total, loading: false });
    } catch {
      if (!controller.signal.aborted && alive.current) setWarehouseCount({ scope: stockScope, total: null, loading: false });
    }
  }, [companyId, selected, stockScope, request]);
  useEffect(() => {
    void countWarehouse();
    const changed = (event: Event) => { if ((event as CustomEvent<{ companyId: string }>).detail?.companyId === companyId) void countWarehouse(); };
    window.addEventListener(PRODUCT_STOCK_CHANGED, changed);
    return () => { warehouseCountController.current?.abort(); window.removeEventListener(PRODUCT_STOCK_CHANGED, changed); };
  }, [countWarehouse, catalogRefresh, companyId]);

  function openEditor(warehouse?: Warehouse) {
    editorSession.current++; setFormError('');
    const pending = attempt.current;
    setEditing(pending ? String(pending.command.warehouseId || '') : warehouse?.id || '');
    setName(pending ? String(pending.command.name || '') : warehouse?.name || '');
    setEditorOpen(true);
  }
  function closeEditor() { editorSession.current++; setEditorOpen(false); }
  async function checkPending() {
    if (await load()) { attempt.current = null; setUncertain(false); setFormError(''); }
    else setFormError('Não foi possível conferir os estoques. Tente atualizar novamente.');
  }
  async function save(command: Record<string, unknown>) {
    if (lock.current || !canManage) return;
    const signature = JSON.stringify(command);
    if (attempt.current && attempt.current.signature !== signature) { setFormError('Confira a tentativa anterior com Atualizar antes de mudar os dados.'); return; }
    const pending = attempt.current || { key: crypto.randomUUID(), signature, command }, session = editorSession.current;
    attempt.current = pending; lock.current = true; setSaving(true); setUncertain(true); setError(''); setFormError('');
    try {
      const result = await request('estoques', { empresaId: companyId, ...pending.command, requestKey: pending.key }, AbortSignal.timeout(30_000));
      if (!alive.current) return;
      attempt.current = null; setUncertain(false); setConfirmation(null);
      if (session === editorSession.current) { setEditorOpen(false); setName(''); setEditing(''); }
      const rows = await load();
      if (command.action === 'create' && rows?.some(w => w.id === result?.warehouseId)) setSelected(result.warehouseId);
      setOpen(true); notifyProductStockChanged(companyId);
    } catch (failure) {
      if (alive.current) { const message = failure instanceof Error ? failure.message : 'Não foi possível confirmar. Atualize para conferir antes de repetir.'; setError(message); setFormError(message); }
    } finally { lock.current = false; if (alive.current) setSaving(false); }
  }
  const selectedWarehouse = warehouses.find(w => w.id === selected);
  const consumedNotice=useRef('');
  const noticeReloadAttempt=useRef('');
  const [activeNotice,setActiveNotice]=useState<NoticeTarget>();
  const [noticeFailure,setNoticeFailure]=useState<{key:string;error:string}>();
  const [noticeNavigationHost,setNoticeNavigationHost]=useState<HTMLDivElement|null>(null);
  const dismissNotice=useCallback(()=>setActiveNotice(undefined),[]);
  useEffect(()=>{
    if(!noticeTarget || noticeTarget.panel!=='stock' || consumedNotice.current===noticeTarget.key || loading || saving || listLocked)return;
    const online=warehouses.find(w=>w.is_online);
    if(!online&&noticeReloadAttempt.current!==noticeTarget.key){
      noticeReloadAttempt.current=noticeTarget.key;
      setOpen(true);void load();return;
    }
    if(!online){const message=error||'Estoque Online não encontrado neste perfil. Atualize os estoques e tente novamente.';setOpen(true);setNoticeFailure({key:noticeTarget.key,error:message});return;}
    consumedNotice.current=noticeTarget.key;
    setNoticeFailure(undefined);
    setActiveNotice(noticeTarget);
    setSelected(online.id);setPublicationFilter('all');setAccountSelection({companyId,value:''});setOpen(true);
  },[noticeTarget,warehouses,loading,saving,listLocked,companyId,error,load]);
  const currentCount = listCount?.warehouseId === selected && listCount.scope===countScope ? listCount : null;
  const currentWarehouseCount = warehouseCount?.scope === stockScope ? warehouseCount : null;
  const stockCount = panelCountText(currentWarehouseCount?.total ?? (!warehouses.length && !loading ? 0 : null), loading || (!!selected && (!currentWarehouseCount || currentWarehouseCount.loading)), !!error || (!!currentWarehouseCount && !currentWarehouseCount.loading && currentWarehouseCount.total == null));
  return <section data-marketplace-notice-result={noticeFailure?.key} data-marketplace-notice-error={noticeFailure?.error} data-marketplace-page-card="" className={`${styles.panel} ${styles.listingsPanel}`} aria-labelledby="warehouses-title" style={{ '--brand': brand, '--av-action-on-brand': corTextoSobreFundo(brand) } as CSSProperties}>
    <div className={`${styles.panelHeading} ${!open ? styles.panelHeadingCollapsed : ''}`}><h2 id="warehouses-title" tabIndex={-1}>Estoques · {stockCount}</h2><div className={styles.panelHeadingActions}>
      {reorderHandle}
      <MarketplaceSelect label="" ariaLabel="Conta dos produtos em estoque" placeholder="Todas as contas" className={`${styles.stockPublicationFilter} ${styles.stockAccountFilter}`} value={accountId} disabled={saving || listLocked} onChange={value=>{setListCount(null);setAccountSelection({companyId,value});}} options={[{value:'',label:'Todas as contas'},...filterAccounts.map(account=>({value:account.id,label:accountDisplayName(account)}))]} />
      <MarketplaceSelect label="" ariaLabel="Filtrar produtos por publicação" placeholder="Todos" className={styles.stockPublicationFilter} value={publicationFilter} disabled={saving || listLocked} onChange={value => setPublicationFilter(value as ProductPublicationFilter)} options={[{ value: 'all', label: 'Todos' }, { value: 'advertised', label: 'Anunciado' }, { value: 'paused', label: 'Pausado' }, { value: 'review', label: 'Em análise' }, { value: 'disabled', label: 'Desativado' }, { value: 'unadvertised', label: 'Sem anúncio' }]} />
      {canManage && <BotaoAcaoCompacto disabled={saving || listLocked} onClick={() => openEditor()}>Criar estoque</BotaoAcaoCompacto>}
      <BotaoAcaoCompacto disabled={loading || saving || listLocked} onClick={() => void checkPending()}>Atualizar</BotaoAcaoCompacto>
      <BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="estoques" controlsId="warehouses-content" expandido={open} corPrimaria={brand} darkMode={dark} onClick={() => setOpen(v => !v)} />
    </div></div>
    <div id="warehouses-content" hidden={!open} aria-busy={loading || saving}>
      {loading && <p className={styles.help} role="status">Carregando estoques…</p>}
      <div className={styles.warehouseNavigationRow}>
      <div className={styles.warehouseSelectorLine} role="group" aria-label="Seleção e ações dos estoques">
      <div className={`${styles.warehouseTabs} ${styles.panelHeadingActions}`} role="group" aria-label="Estoques disponíveis">{warehouses.map(w => <BotaoAcaoCompacto key={w.id} aria-pressed={selected === w.id} disabled={saving || listLocked} onClick={() => setSelected(w.id)} style={{ '--warehouse-pill': warehousePillColor(w.id) } as CSSProperties}>{selected === w.id && <span aria-hidden="true">✓</span>}{w.name}{w.is_online && w.name.toLowerCase() !== 'online' && <small>Online</small>}</BotaoAcaoCompacto>)}</div>
      {canManage && selectedWarehouse && <div className={`${styles.warehouseSelectedActions} ${styles.panelHeadingActions}`} role="group" aria-label={`Ações do estoque ${selectedWarehouse.name}`}>
        <BotaoAcaoCompacto className={styles.warehouseManagementAction} disabled={saving || listLocked} onClick={() => openEditor(selectedWarehouse)}>Renomear</BotaoAcaoCompacto>
        {!selectedWarehouse.is_online && <><BotaoAcaoCompacto className={styles.warehouseManagementAction} disabled={saving || listLocked} onClick={() => setConfirmation({ action: 'online', warehouseId: selectedWarehouse.id, name: selectedWarehouse.name })}>Usar online</BotaoAcaoCompacto><BotaoAcaoCompacto variante="destrutivo" disabled={saving || listLocked} onClick={() => setConfirmation({ action: 'archive', warehouseId: selectedWarehouse.id, name: selectedWarehouse.name })}>Arquivar</BotaoAcaoCompacto></>}
      </div>}
      </div>
      <div ref={setSearchNavigationHost} className={styles.warehouseSearchHost} />
      <div ref={setNoticeNavigationHost} className={styles.warehouseNoticeHost} />
      </div>
      {listLocked && <p className={styles.help}>Conclua a operação em andamento antes de trocar de estoque.</p>}
      {selectedWarehouse && <p className={styles.help} role="status">Produtos listados · {panelCountText(currentCount?.total ?? null, !currentCount || currentCount.loading, !!currentCount && !currentCount.loading && currentCount.total == null)}</p>}
      {selectedWarehouse && <ProductsStock key={`${selectedWarehouse.id}-${publicationFilter}-${accountId}`} {...productContext} noticeTarget={selectedWarehouse.is_online ? activeNotice : undefined} noticeNavigationHost={noticeNavigationHost} searchNavigationHost={searchNavigationHost} onNoticeDismiss={dismissNotice} stockAccountId={accountId} listVisible={open} publicationFilter={publicationFilter} companyId={companyId} warehouse={selectedWarehouse} canManage={canManage} dark={dark} brand={brand} refreshKey={catalogRefresh} request={request} onInteractionLockChange={setListLocked} onCountChange={receiveCount} />}
      {!loading && !error && !warehouses.length && <p>Nenhum estoque criado. Clique em Criar estoque para cadastrar o primeiro.</p>}
    </div>
    {error && <p className={styles.connectionMessage} role="alert">{error}</p>}
    <CardExpandidoModal aberto={editorOpen} rotulo={editing ? 'Renomear estoque' : 'Criar estoque'} onFechar={closeEditor}>
      <div className={`${styles.settingsModalScope} ${dark ? styles.dark : ''}`} style={{ '--brand': brand, '--av-action-on-brand': corTextoSobreFundo(brand) } as CSSProperties}>
        <form className={`${styles.userModal} ${styles.warehouseDialog}`} onSubmit={event => { event.preventDefault(); void save({ action: editing ? 'rename' : 'create', ...(editing ? { warehouseId: editing } : {}), name: name.trim() }); }}>
          <header className={styles.userModalHeader}><h2>{editing ? 'Renomear estoque' : 'Criar estoque'}</h2><BotaoAcaoCompacto somenteIcone aria-label="Fechar cadastro de estoque" onClick={closeEditor}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></BotaoAcaoCompacto></header>
          <label className={styles.catalogField}>Nome do estoque<input ref={nameInput} value={name} maxLength={60} disabled={saving || uncertain} onChange={event => setName(event.target.value)} placeholder="Ex.: Saldão" required aria-describedby={formError ? 'warehouse-editor-error' : undefined} /></label>
          {formError && <p id="warehouse-editor-error" className={styles.connectionMessage} role="alert">{formError}</p>}
          <div className={styles.warehouseDialogActions}><BotaoAcaoCompacto onClick={closeEditor}>Cancelar</BotaoAcaoCompacto>{uncertain && !saving && <BotaoAcaoCompacto disabled={loading} onClick={() => void checkPending()}>Atualizar</BotaoAcaoCompacto>}<BotaoAcaoCompacto variante="primario" type="submit" disabled={saving || !name.trim()}>{saving ? 'Salvando…' : 'Confirmar'}</BotaoAcaoCompacto></div>
        </form>
      </div>
    </CardExpandidoModal>
    <ModalConfirmacao aberto={!!confirmation} titulo={confirmation?.action === 'online' ? 'Trocar estoque online?' : 'Arquivar estoque?'} mensagem={confirmation?.action === 'online' ? `Usar “${confirmation.name}” nos anúncios? O saldo online atual precisa estar zerado e sem pendências de vendas. A disponibilidade passa a ser somente a deste estoque.` : `Arquivar “${confirmation?.name}”? Somente estoques offline sem saldo podem ser arquivados. O histórico será mantido.`} textoConfirmar="Confirmar" variante="primaria" carregando={saving} corPrimaria={brand} darkMode={dark} aoCancelar={() => { if (!saving) setConfirmation(null); }} aoConfirmar={() => { if (confirmation) void save({ action: confirmation.action, warehouseId: confirmation.warehouseId }); }} />
  </section>;
}
