'use client';

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import CampoBusca from '@/app/components/CampoBusca';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import Tooltip from '@/app/components/Tooltip';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { Icon } from '@/app/projetos/components/Icon';
import { supabase } from '@/app/lib/supabase';
import { formatarMoeda } from '@/app/lib/formatters';
import type { ListingAction, ListingSnapshot } from '@/app/modules/marketplaces/services/listing-model';
import styles from './marketplaces.module.css';
import { shippingLabels } from './shipping-labels';
import ListingEditor from './ListingEditor';
import MarketplaceSelect from './MarketplaceSelect';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import DateOrderButton from './DateOrderButton';
import { collapseMarketplacePanel } from './collapse-panel';
import type { DateOrder } from '@/app/modules/marketplaces/date-order';
import { listingDisplaySignature } from './passive-refresh';
import { scrollMarketplaceRow } from './scroll-panel-row';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import { accountsForMarketplace } from './marketplace-scope';
import { accountDisplayName, accountReferenceDetail, preserveNewerAccountLabel } from './account-identification';
import type { ListingOperation } from '@/app/modules/marketplaces/listing-operations';

export type MarketplaceAccount = { id: string; provider?: MarketplaceId; local_label?: string | null; local_label_updated_at?: string | null; seller_reference: string; seller_name: string | null; status: string; last_error_code?: string | null; last_synced_at: string | null; expires_at: string | null };
type Row = { snapshot: ListingSnapshot; status: string; operationalStatus?: string; operations?: ListingOperation; connectionId: string };
type Confirmation = { action: ListingAction; id: string; name: string; connectionId: string };
const statusNames: Record<string, string> = { connected: 'Conectada', expired: 'Reconectar', attention: 'Requer atenção', connecting: 'Conectando', active: 'Ativo', paused: 'Pausado', closed: 'Encerrado', deleted: 'Excluído', under_review: 'Em revisão', inactive: 'Inativo' };
const actionNames = { pause: 'Pausar', resume: 'Reativar', close: 'Encerrar', delete: 'Excluir definitivamente' };
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : 'Ainda não sincronizado';
const money = (value: number | null, currency = 'BRL') => value == null ? 'Indisponível' : currency === 'BRL' ? formatarMoeda(value) : `${currency} ${value.toFixed(2)}`;

function ListingData({ item }: { item: ListingSnapshot }) {
  return <><dt>EAN / GTIN</dt><dd>{item.ean || 'Não informado'}</dd><dt>Categoria / tipo</dt><dd>{item.category} · {item.listingType}</dd><dt>Condição</dt><dd>{item.condition === 'new' ? 'Novo' : item.condition === 'used' ? 'Usado' : item.condition}</dd><dt>Dimensões/peso informados pelo ML</dt><dd>{item.shipping.dimensions || 'Indisponíveis'}</dd><dt>Retirada pessoal</dt><dd>{item.shipping.pickup == null ? 'Não informado' : item.shipping.pickup ? 'Sim' : 'Não'}</dd><dt>Dados consultados em</dt><dd>{dateLabel(item.syncedAt)}</dd><dt>Criado em</dt><dd>{dateLabel(item.createdAt)}</dd><dt>Atualizado no ML</dt><dd>{dateLabel(item.updatedAt)}</dd><dt>Alertas / substatus</dt><dd>{[...item.substatus, ...item.warnings].join(' · ') || 'Nenhum retornado pela API'}</dd>{item.attributes.map((attr, index) => <Fragment key={`${attr.name}-${index}`}><dt>{attr.name}</dt><dd>{attr.value}</dd></Fragment>)}</>;
}

export async function marketplaceClientRequest(path: string, body?: unknown, signal?: AbortSignal, method?: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no AvantaLab.');
  const response = await fetch(`/api/modulos/marketplaces/${path}`, { method: method || (body ? 'POST' : 'GET'), cache: 'no-store', signal,
    headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw Object.assign(new Error(payload?.message || 'Não foi possível consultar o módulo.'), { code: payload?.code, fields: payload?.fields });
  return payload;
}

export default function Anunciados({ companyId, marketplace = 'mercado_livre', accountNames, dark, brand, onAccountsLoaded, onAccountSelectionLockedChange, onPublishInAnotherAccount, refreshKey = 0, reorderHandle }: { companyId: string; marketplace?: MarketplaceId; accountNames?: MarketplaceAccount[]; dark: boolean; brand: string; onAccountsLoaded: (accounts: MarketplaceAccount[], canDisconnect: boolean, labelsAvailable?: boolean) => void; onAccountSelectionLockedChange: (locked: boolean) => void; onPublishInAnotherAccount: (sourceConnectionId: string, listingId: string, targetConnectionId: string) => void; refreshKey?: number; reorderHandle?: ReactNode }) {
  const [accountSelection, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const scopedAccounts = accountsForMarketplace(accounts.map(account => preserveNewerAccountLabel(accountNames?.find(known => known.id === account.id), account)), marketplace);
  const accountId = scopedAccounts.some(account => account.id === accountSelection && account.status === 'connected') ? accountSelection : '';
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsAccountId, setRowsAccountId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [order, setOrder] = useState<DateOrder>('desc');
  const [pageSelection, setPageSelection] = useState({ accountId: '', page: 1 });
  const page = pageSelection.accountId === accountId ? pageSelection.page : 1;
  const setPage = (nextPage: number) => setPageSelection({ accountId, page: nextPage });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [error, setError] = useState('');
  const [expandedState, setExpandedState] = useState({ accountId: '', id: '' });
  const expanded = expandedState.accountId === accountId ? expandedState.id : '';
  const setExpanded = (id: string) => setExpandedState({ accountId, id });
  const [panelExpanded, setPanelExpanded] = useState(false);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const tableScroll = useRef<HTMLDivElement>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [copyingListing, setCopyingListing] = useState<ListingSnapshot | null>(null);
  const [copyTargetId, setCopyTargetId] = useState('');
  const [acting, setActing] = useState(false);
  const syncController = useRef<AbortController | null>(null);
  const listController = useRef<AbortController | null>(null);
  const activeAccountId = rows.find(row => row.snapshot.id === expanded)?.connectionId || accountId;
  const account = scopedAccounts.find((candidate) => candidate.id === activeAccountId);
  const connectedSignature = scopedAccounts.filter(candidate => candidate.status === 'connected').map(candidate => candidate.id).sort().join(',');
  const visibleRows = marketplace === 'mercado_livre' && rowsAccountId === accountId ? rows : [];
  const displayedTotal = marketplace === 'mercado_livre' ? total : 0;
  const visibleSignature = useRef('');
  useEffect(() => { visibleSignature.current = listingDisplaySignature({ listings: rows, total }); }, [rows, total]);
  const editing = !!expanded && canManage && account?.status === 'connected';

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    const data = await marketplaceClientRequest(`conexoes?empresaId=${encodeURIComponent(companyId)}`, undefined, signal);
    if (signal?.aborted) return;
    setAccounts(data.accounts); setCanManage(data.canManage);
    onAccountsLoaded(data.accounts, data.canConnect, data.labelsAvailable !== false);
  }, [companyId, onAccountsLoaded]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void loadAccounts(controller.signal).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); }); });
    return () => controller.abort();
  }, [loadAccounts]);

  useEffect(() => { onAccountSelectionLockedChange(syncing || acting || !!expanded || !!copyingListing); }, [syncing, acting, expanded, copyingListing, onAccountSelectionLockedChange]);

  const loadList = useCallback(async () => {
    listController.current?.abort();
    if (marketplace !== 'mercado_livre') { setRows([]); setTotal(0); setLoading(false); setError(''); setSyncNotice(''); return; }
    const controller = new AbortController(); listController.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams({ empresaId: companyId, ...(accountId ? { connectionId: accountId } : { scope: 'all' }), q: query, status, order, page: String(page) });
      const data = await marketplaceClientRequest(`anunciados?${params}`, undefined, controller.signal);
      if (!controller.signal.aborted) { setRows(data.listings); setRowsAccountId(accountId); setTotal(data.total); }
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Falha ao carregar anúncios.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [companyId, marketplace, accountId, query, status, order, page]);
  const loadListRef = useRef(loadList);
  useEffect(() => { loadListRef.current = loadList; }, [loadList]);
  useEffect(() => { if (refreshKey && !expanded && !acting && !copyingListing) void loadListRef.current(); }, [refreshKey, expanded, acting, copyingListing]);

  useEffect(() => {
    const timer = setTimeout(() => { setRows([]); void loadList(); }, 250);
    return () => { clearTimeout(timer); listController.current?.abort(); };
  }, [loadList]);

  const synchronize = useCallback(async (background = false) => {
    if (marketplace !== 'mercado_livre') return;
    const targets = accountsForMarketplace(accounts, marketplace).filter(candidate => candidate.status === 'connected' && (!accountId || candidate.id === accountId));
    if (!targets.length || acting || expanded || copyingListing) return;
    if (syncController.current) {
      if (background) return;
      syncController.current.abort();
    }
    const controller = new AbortController(); syncController.current = controller;
    if (!background) { setSyncing(true); setError(''); setSyncNotice('Consultando anúncios do Mercado Livre…'); }
    let count = 0;
    try {
      for (const target of targets) for (let batch = 0; batch < 200; batch++) {
        const progress = await marketplaceClientRequest('anunciados/sincronizar', { empresaId: companyId, connectionId: target.id }, controller.signal);
        if (controller.signal.aborted) return;
        count += progress.count;
        if (!background) setSyncNotice(progress.phase === 'scan' ? `Identificando anúncios da conta: ${progress.discovered} encontrado(s)…` : `${count} anúncio(s) consultado(s)${progress.complete ? '. Sincronização concluída.' : '…'}`);
        if (progress.complete) break;
        if (batch === 199 && !background) setSyncNotice('Sincronização parcial. Clique em Atualizar para continuar; nenhum anúncio foi ocultado por limite de consulta.');
      }
      if (!controller.signal.aborted) {
        if (background) {
          const params = new URLSearchParams({ empresaId: companyId, ...(accountId ? { connectionId: accountId } : { scope: 'all' }), q: query, status, order, page: String(page) });
          const latest = await marketplaceClientRequest(`anunciados?${params}`, undefined, controller.signal);
          if (!controller.signal.aborted && listingDisplaySignature(latest) !== visibleSignature.current) window.dispatchEvent(new CustomEvent('avanta:marketplace-background-change', { detail: { companyId } }));
        } else { await loadAccounts(controller.signal); await loadListRef.current(); }
      }
    } catch (failure) { if (!controller.signal.aborted && !background) { setError(failure instanceof Error ? failure.message : 'Sincronização falhou.'); setSyncNotice('Dados anteriores preservados. Sincronização pendente.'); await loadListRef.current(); } }
    finally { if (syncController.current === controller) { syncController.current = null; if (!background) setSyncing(false); } }
  }, [accountId, accounts, marketplace, acting, expanded, copyingListing, companyId, loadAccounts, query, status, order, page]);

  const synchronizeRef = useRef(synchronize);
  useEffect(() => { synchronizeRef.current = synchronize; }, [synchronize]);
  useEffect(() => {
    const run = () => { if (document.visibilityState === 'visible') void synchronizeRef.current(true); };
    run();
    const timer = setInterval(run, 60_000);
    document.addEventListener('visibilitychange', run);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', run); syncController.current?.abort(); };
  }, [accountId, connectedSignature]);

  function cancelEditing(id: string) {
    if (acting) return;
    setCopyingListing(null); setCopyTargetId('');
    setExpanded('');
    editButtons.current.get(id)?.focus();
    requestAnimationFrame(() => editButtons.current.get(id)?.focus());
  }

  function openEditing(id: string) {
    if (acting || (expanded && expanded !== id)) return;
    syncController.current?.abort();
    setExpanded(expanded === id ? '' : id);
    if (expanded !== id) {
      tableScroll.current?.scrollTo({ left: 0 });
      requestAnimationFrame(() => {
        const button = editButtons.current.get(id);
        const row = button?.closest('tr');
        if (!row || button?.getAttribute('aria-expanded') !== 'true') return;
        scrollMarketplaceRow(row);
      });
    }
  }

  async function executeAction() {
    if (!confirmation || acting || confirmation.connectionId !== activeAccountId) return;
    setActing(true); setError('');
    try {
      await marketplaceClientRequest('anunciados/acao', { empresaId: companyId, connectionId: accountId, id: confirmation.id, action: confirmation.action, confirmation: confirmation.id, requestKey: crypto.randomUUID() });
      await loadListRef.current();
      setExpanded('');
      setSyncNotice('Ação confirmada pelo Mercado Livre.');
      requestAnimationFrame(() => editButtons.current.get(confirmation.id)?.focus());
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha na alteração.'); }
    finally { setActing(false); setConfirmation(null); }
  }

  return <section className={`${styles.panel} ${styles.listingsPanel}`} aria-labelledby="announced-title">
    <div className={`${styles.panelHeading} ${!panelExpanded ? styles.panelHeadingCollapsed : ''}`}><div><h2 id="announced-title">Anunciados</h2></div><div className={styles.panelHeadingActions}>{reorderHandle}<MarketplaceSelect label="" ariaLabel="Conta dos anúncios" className={styles.announcedAccountFilter} value={accountId} placeholder="Todas as contas" options={[{ value: '', label: 'Todas as contas' }, ...scopedAccounts.filter(candidate => candidate.status === 'connected').map(candidate => ({ value: candidate.id, label: accountDisplayName(candidate) }))]} disabled={loading || syncing || acting || !!expanded || !!copyingListing} onChange={value => { setAccountId(value); setPageSelection({ accountId: value, page: 1 }); setSyncNotice(''); setError(''); }} /><DateOrderButton context="Anunciados" order={order} disabled={loading || syncing || acting || !!expanded || !!copyingListing} onChange={(value) => { setOrder(value); setPage(1); }} /><Tooltip texto="Atualizar anúncios das contas selecionadas"><button className={styles.refreshSales} type="button" disabled={!connectedSignature || syncing || acting || !!expanded} onClick={() => void synchronize()}>{syncing ? 'Atualizando…' : 'Atualizar'}</button></Tooltip><BotaoExpandirCard variante="painel" modo="lista" contexto="Anunciados" controlsId="announced-content" expandido={panelExpanded} onClick={() => setPanelExpanded((current) => !current)} corPrimaria={brand} darkMode={dark} /></div></div>
    <div id="announced-content" hidden={!panelExpanded}>
    <div className={styles.listingFilters}>
      <label>Pesquisar<CampoBusca disabled={!!expanded} aria-label="Pesquisar por nome, código, EAN ou SKU" value={query} onChange={(value) => { if (expanded) return; setQuery(value); setPage(1); }} placeholder="Nome, código, EAN ou SKU" /></label>
      <MarketplaceSelect label="Situação" value={status} options={[{ value: '', label: 'Todas' }, ...['active', 'paused', 'closed', 'under_review', 'inactive', 'deleted'].map((value) => ({ value, label: value === 'active' ? 'Ativos / em andamento' : statusNames[value] }))]} placeholder="Todas" disabled={!!expanded} onChange={(value) => { setStatus(value); setPage(1); }} />
    </div>
    {error && <p role="alert" className={styles.connectionMessage}>{error}</p>}
    <p role="status" className={styles.help}>{(marketplace === 'mercado_livre' ? syncNotice : '') || (loading ? 'Carregando anúncios…' : `${displayedTotal} anúncio(s) nesta seleção.`)}</p>
    <div ref={tableScroll} className={styles.tableScroll} tabIndex={0} aria-label="Tabela de anúncios, role horizontalmente para ver todas as colunas" aria-busy={loading || syncing}>
      <table className={styles.listingTable}><caption className={styles.srOnly}>Produtos anunciados na conta selecionada</caption><colgroup><col style={{ width: '23%' }} /><col style={{ width: '9%' }} /><col style={{ width: '10%' }} /><col style={{ width: '11%' }} /><col style={{ width: '10%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} /><col /><col style={{ width: 64 }} /></colgroup><thead><tr>{['Anúncio', 'Situação', 'Preço', 'Frete vendedor estimado', 'Taxa estimada', 'Estoque', 'Vendidos', 'Envio', 'Ações'].map((name) => <th key={name} scope="col" className={name === 'Ações' ? styles.listingActions : undefined}>{name}</th>)}</tr></thead>
        <tbody>{visibleRows.map(({ snapshot: item, status: rowStatus, operationalStatus, operations, connectionId }) => {
          const sourceAccountId = connectionId || accountId;
          const sourceAccount = scopedAccounts.find(candidate => candidate.id === sourceAccountId);
          const shipping = shippingLabels(item.shipping);
          const publishOtherAccountAction = canManage && sourceAccount?.status === 'connected' && <div className={styles.publishOtherAccountAction}>
            <Tooltip texto="Preparar este anúncio em outra conta para revisar antes de publicar"><button type="button" className={styles.publishOtherAccountButton} disabled={acting || syncing || (!!copyingListing && copyingListing.id !== item.id)} aria-expanded={copyingListing?.id === item.id} aria-controls={`listing-copy-${item.id}`} onClick={() => { setCopyingListing(copyingListing?.id === item.id ? null : item); setCopyTargetId(''); }}>Publicar em outra conta</button></Tooltip>
          </div>;
          return <Fragment key={item.id}><tr className={styles.listingRow}>
          <th scope="row" title={item.title} className={expanded === item.id && editing ? styles.editingListingTitle : undefined}>{expanded === item.id && editing && <small className={styles.editingListingLabel}>Em edição</small>}<strong>{item.title}</strong><small>{accountDisplayName(sourceAccount)} · {item.id}{item.sku ? ` · SKU ${item.sku}` : ''}</small></th>
          <td>{operations?.count ? <><strong>Ativo · {operations.labels.join(' / ')}</strong><small>{operations.count} pedido(s) em andamento</small><small>No Mercado Livre: {statusNames[rowStatus] || rowStatus}{item.stock === 0 ? ' · Sem estoque' : ''}</small></> : <>{statusNames[operationalStatus || rowStatus] || rowStatus}{operationalStatus && operationalStatus !== rowStatus && <small>No Mercado Livre: {statusNames[rowStatus] || rowStatus} · Sem estoque</small>}</>}</td><td>{money(item.price, item.currency)}</td><td>{money(item.freightEstimate)}</td><td>{money(item.feeEstimate)}{item.feePercent != null && <small>{item.feePercent}%</small>}</td><td>{item.stock ?? 'Indisponível'}</td><td>{item.sold ?? 'Indisponível'}</td><td>{shipping.freight}<small>{shipping.method}</small></td>
          <td className={styles.listingActions}><button type="button" ref={(button) => { if (button) editButtons.current.set(item.id, button); else editButtons.current.delete(item.id); }} className={styles.editListing} aria-label={`Editar anúncio: ${item.title}`} title="Editar anúncio" aria-expanded={expanded === item.id} aria-controls={`details-${item.id}`} disabled={acting || editing || (!!expanded && expanded !== item.id) || !!copyingListing} onClick={() => openEditing(item.id)}><Icon name="edit" size={18} /></button></td>
        </tr>{expanded === item.id && <tr id={`details-${item.id}`}><td colSpan={9}><div className={styles.listingDetails}>
          {editing ? <>{copyingListing?.id === item.id && <div id={`listing-copy-${item.id}`} className={styles.listingCopy}>
            <MarketplaceAccountPicker label="Conta de destino" value={copyTargetId} options={scopedAccounts.filter((candidate) => candidate.status === 'connected' && candidate.id !== sourceAccountId).map((candidate) => ({ id: candidate.id, name: accountDisplayName(candidate), detail: accountReferenceDetail(candidate) }))} placeholder="Selecione outra conta conectada" disabled={acting || syncing} onChange={setCopyTargetId} />
            <div className={styles.actionBar}><button type="button" onClick={() => { setCopyingListing(null); setCopyTargetId(''); }}>Cancelar</button><button type="button" className={styles.primary} disabled={!copyTargetId || acting || syncing} onClick={() => { onPublishInAnotherAccount(sourceAccountId, item.id, copyTargetId); setCopyingListing(null); setCopyTargetId(''); }}>Preparar publicação</button></div>
            <p>O AvantaLab consulta os dados atuais, prepara a ficha no destino e abre o formulário para sua revisão. Nada é publicado nesta etapa.</p>
          </div>}<ListingEditor key={`${sourceAccountId}-${item.id}`} companyId={companyId} accountId={sourceAccountId} itemId={item.id} snapshot={item} permalink={item.permalink} additionalAction={publishOtherAccountAction} dark={dark} brand={brand} request={marketplaceClientRequest} onBusy={setActing} onClose={() => cancelEditing(item.id)} onListingAction={(action) => setConfirmation({ action, id: item.id, name: item.title, connectionId: sourceAccountId })} onSaved={(listing) => {
            setRows((current) => current.map((row) => row.snapshot.id === listing.id ? { ...row, snapshot: listing, status: listing.substatus.includes('deleted') ? 'deleted' : listing.status } : row));
            setExpanded(''); setSyncNotice('Alterações confirmadas pelo Mercado Livre.'); requestAnimationFrame(() => editButtons.current.get(listing.id)?.focus());
          }}><ListingData item={item} /></ListingEditor></> : <>
          <div className={styles.actionBar}><button type="button" disabled={acting || !!copyingListing} onClick={() => cancelEditing(item.id)}>Cancelar</button>{canManage && sourceAccount?.status === 'connected' && ['pause', 'resume', 'close', 'delete'].map((action) => {
            const allowed = !item.substatus.includes('deleted') && (action === 'pause' ? item.status === 'active' : action === 'resume' ? item.status === 'paused' : action === 'close' ? ['active', 'paused'].includes(item.status) : item.status === 'closed');
            return <button key={action} type="button" disabled={!allowed || acting || syncing} onClick={() => setConfirmation({ action: action as ListingAction, id: item.id, name: item.title, connectionId: sourceAccountId })}>{actionNames[action as ListingAction]}</button>;
          })}{item.permalink && <a href={item.permalink} target="_blank" rel="noopener noreferrer">Abrir no Mercado Livre ↗</a>}{publishOtherAccountAction}</div>
          <dl><ListingData item={item} /></dl>{copyingListing?.id === item.id && <div id={`listing-copy-${item.id}`} className={styles.listingCopy}>
            <MarketplaceAccountPicker label="Conta de destino" value={copyTargetId} options={scopedAccounts.filter((candidate) => candidate.status === 'connected' && candidate.id !== sourceAccountId).map((candidate) => ({ id: candidate.id, name: accountDisplayName(candidate), detail: accountReferenceDetail(candidate) }))} placeholder="Selecione outra conta conectada" disabled={acting || syncing} onChange={setCopyTargetId} />
            <div className={styles.actionBar}><button type="button" onClick={() => { setCopyingListing(null); setCopyTargetId(''); }}>Cancelar</button><button type="button" className={styles.primary} disabled={!copyTargetId || acting || syncing} onClick={() => { onPublishInAnotherAccount(sourceAccountId, item.id, copyTargetId); setCopyingListing(null); setCopyTargetId(''); }}>Preparar publicação</button></div>
            <p>O AvantaLab consulta os dados atuais, prepara a ficha no destino e abre o formulário para sua revisão. Nada é publicado nesta etapa.</p>
          </div>}</>}
          {item.variations.length > 0 && <div><strong>Variações</strong>{item.variations.map((variation) => <p key={variation.id}>{variation.attributes} · {money(variation.price, item.currency)} · Estoque: {variation.stock ?? 'Indisponível'}</p>)}</div>}
        </div></td></tr>}</Fragment>;
        })}
        {!visibleRows.length && <tr><td colSpan={9}>{loading ? 'Carregando…' : syncing ? 'Aguardando sincronização…' : 'Nenhum anúncio encontrado.'}</td></tr>}
        </tbody></table>
    </div>
    <nav className={styles.pagination} aria-label="Páginas dos anúncios"><button type="button" disabled={page <= 1 || loading || !!expanded} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(displayedTotal / 25))}</span><button type="button" disabled={page * 25 >= displayedTotal || loading || !!expanded} onClick={() => setPage(page + 1)}>Próxima</button></nav>
    <div className={`${styles.panelHeadingActions} ${styles.panelFooterActions}`}><BotaoExpandirCard variante="painel" modo="lista" contexto="Anunciados" controlsId="announced-content" expandido={panelExpanded} onClick={() => collapseMarketplacePanel('announced-content', () => setPanelExpanded(false))} corPrimaria={brand} darkMode={dark} /></div>
    </div>
    <ModalConfirmacao aberto={!!confirmation} titulo={confirmation ? `${actionNames[confirmation.action]}?` : ''} mensagem={confirmation ? `${confirmation.name}. ${confirmation.action === 'close' ? 'Esta ação encerra definitivamente o anúncio e não permite reativação.' : confirmation.action === 'delete' ? 'O anúncio será marcado como excluído no Mercado Livre. O histórico local é preservado.' : confirmation.action === 'pause' ? 'O anúncio deixará de vender até ser reativado.' : 'O anúncio voltará a vender se o Mercado Livre permitir.'}` : ''} textoConfirmar={confirmation ? actionNames[confirmation.action] : 'Confirmar'} carregando={acting} darkMode={dark} corPrimaria={brand} variante={confirmation?.action === 'resume' ? 'primaria' : 'destrutiva'} aoCancelar={() => { if (!acting) setConfirmation(null); }} aoConfirmar={executeAction} />
  </section>;
}
