'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import CampoBusca from '@/app/components/CampoBusca';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { Icon } from '@/app/projetos/components/Icon';
import { supabase } from '@/app/lib/supabase';
import { formatarMoeda } from '@/app/lib/formatters';
import type { ListingAction, ListingSnapshot } from '@/app/modules/marketplaces/services/listing-model';
import styles from './marketplaces.module.css';
import { shippingLabels } from './shipping-labels';
import ListingEditor from './ListingEditor';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import MarketplaceSelect from './MarketplaceSelect';

export type MarketplaceAccount = { id: string; seller_reference: string; seller_name: string | null; status: string; last_synced_at: string | null; expires_at: string | null };
type Row = { snapshot: ListingSnapshot; status: string };
type Confirmation = { action: ListingAction | 'disconnect'; id: string; name: string; connectionId: string };
const statusNames: Record<string, string> = { connected: 'Conectada', expired: 'Reconectar', attention: 'Requer atenção', connecting: 'Conectando', active: 'Ativo', paused: 'Pausado', closed: 'Encerrado', deleted: 'Excluído', under_review: 'Em revisão', inactive: 'Inativo' };
const actionNames = { pause: 'Pausar', resume: 'Reativar', close: 'Encerrar', delete: 'Excluir', disconnect: 'Desconectar conta' };
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

export default function Anunciados({ companyId, dark, brand, accountId, onSelectAccount, onAccountsLoaded, onAccountSelectionLockedChange, publicationBusy, refreshKey = 0 }: { companyId: string; dark: boolean; brand: string; accountId: string; onSelectAccount: (id: string) => void; onAccountsLoaded: (accounts: MarketplaceAccount[]) => void; onAccountSelectionLockedChange: (locked: boolean) => void; publicationBusy: boolean; refreshKey?: number }) {
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [canConnect, setCanConnect] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsAccountId, setRowsAccountId] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [pageSelection, setPageSelection] = useState({ accountId: '', page: 1 });
  const page = pageSelection.accountId === accountId ? pageSelection.page : 1;
  const setPage = (nextPage: number) => setPageSelection({ accountId, page: nextPage });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState('');
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const tableScroll = useRef<HTMLDivElement>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [acting, setActing] = useState(false);
  const syncController = useRef<AbortController | null>(null);
  const listController = useRef<AbortController | null>(null);
  const account = accounts.find((candidate) => candidate.id === accountId);
  const visibleRows = rowsAccountId === accountId ? rows : [];
  const editing = !!expanded && canManage && account?.status === 'connected';

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    const data = await marketplaceClientRequest(`conexoes?empresaId=${encodeURIComponent(companyId)}`, undefined, signal);
    if (signal?.aborted) return;
    setAccounts(data.accounts); setCanConnect(data.canConnect); setCanManage(data.canManage); setAccountsLoaded(true);
    onAccountsLoaded(data.accounts);
  }, [companyId, onAccountsLoaded]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void loadAccounts(controller.signal).catch((failure) => { if (!controller.signal.aborted) { setAccountsLoaded(true); setError(failure.message); } }); });
    return () => controller.abort();
  }, [loadAccounts]);

  useEffect(() => { onAccountSelectionLockedChange(syncing || acting || !!expanded); }, [syncing, acting, expanded, onAccountSelectionLockedChange]);

  const loadList = useCallback(async () => {
    listController.current?.abort();
    if (!accountId) return;
    const controller = new AbortController(); listController.current = controller;
    setLoading(true);
    try {
      const params = new URLSearchParams({ empresaId: companyId, connectionId: accountId, q: query, status, page: String(page) });
      const data = await marketplaceClientRequest(`anunciados?${params}`, undefined, controller.signal);
      if (!controller.signal.aborted) { setRows(data.listings); setRowsAccountId(accountId); setTotal(data.total); }
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Falha ao carregar anúncios.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [companyId, accountId, query, status, page]);
  const loadListRef = useRef(loadList);
  useEffect(() => { loadListRef.current = loadList; }, [loadList]);
  useEffect(() => { if (refreshKey) void loadListRef.current(); }, [refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => { setRows([]); void loadList(); }, 250);
    return () => { clearTimeout(timer); listController.current?.abort(); };
  }, [loadList]);

  const synchronize = useCallback(async () => {
    if (!accountId || account?.status !== 'connected' || syncController.current || acting || expanded) return;
    const controller = new AbortController(); syncController.current = controller;
    setSyncing(true); setError(''); setSyncNotice('Consultando anúncios do Mercado Livre…');
    let count = 0;
    try {
      for (let batch = 0; batch < 200; batch++) {
        const progress = await marketplaceClientRequest('anunciados/sincronizar', { empresaId: companyId, connectionId: accountId }, controller.signal);
        if (controller.signal.aborted) return;
        count += progress.count;
        setSyncNotice(progress.phase === 'scan' ? `Identificando anúncios da conta: ${progress.discovered} encontrado(s)…` : `${count} anúncio(s) consultado(s)${progress.complete ? '. Sincronização concluída.' : '…'}`);
        if (progress.complete) { await loadAccounts(controller.signal); break; }
        if (batch === 199) setSyncNotice('Sincronização parcial. Clique em Atualizar para continuar; nenhum anúncio foi ocultado por limite de consulta.');
      }
      if (!controller.signal.aborted) await loadListRef.current();
    } catch (failure) { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : 'Sincronização falhou.'); setSyncNotice('Dados anteriores preservados. Sincronização pendente.'); await loadListRef.current(); } }
    finally { if (syncController.current === controller) { syncController.current = null; setSyncing(false); } }
  }, [accountId, account?.status, acting, expanded, companyId, loadAccounts]);

  const synchronizeRef = useRef(synchronize);
  useEffect(() => { synchronizeRef.current = synchronize; }, [synchronize]);
  useEffect(() => {
    const run = () => { if (document.visibilityState === 'visible') void synchronizeRef.current(); };
    run();
    const timer = setInterval(run, 60_000);
    document.addEventListener('visibilitychange', run);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', run); syncController.current?.abort(); };
  }, [accountId]);

  function cancelEditing(id: string) {
    if (acting) return;
    setExpanded('');
    editButtons.current.get(id)?.focus();
    requestAnimationFrame(() => editButtons.current.get(id)?.focus());
  }

  function openEditing(id: string) {
    if (acting || (expanded && expanded !== id)) return;
    syncController.current?.abort();
    setExpanded(expanded === id ? '' : id);
    if (expanded !== id) tableScroll.current?.scrollTo({ left: 0 });
  }

  async function executeAction() {
    if (!confirmation || acting || confirmation.connectionId !== accountId) return;
    setActing(true); setError('');
    try {
      if (confirmation.action === 'disconnect') {
        await marketplaceClientRequest('conexoes', { empresaId: companyId, connectionId: accountId, confirmation: accountId }, undefined, 'DELETE');
        await loadAccounts();
      } else {
        await marketplaceClientRequest('anunciados/acao', { empresaId: companyId, connectionId: accountId, id: confirmation.id, action: confirmation.action, confirmation: confirmation.id, requestKey: crypto.randomUUID() });
        await loadListRef.current();
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha na alteração.'); }
    finally { setActing(false); setConfirmation(null); }
  }

  return <section className={`${styles.panel} ${styles.listingsPanel}`} aria-labelledby="announced-title">
    <div className={styles.panelHeading}><div><h2 id="announced-title">Anunciados</h2></div><button className={styles.primary} type="button" disabled={!accountId || account?.status !== 'connected' || syncing || acting || !!expanded} onClick={() => void synchronize()}>{syncing ? 'Atualizando…' : 'Atualizar'}</button></div>
    <div className={styles.listingFilters}>
      <MarketplaceAccountPicker label="Conta do Mercado Livre" value={accountId} options={accounts.map((item) => ({ id: item.id, name: item.seller_name || `Vendedor ${item.seller_reference}`, detail: `ID ${item.seller_reference} · ${statusNames[item.status] || item.status}` }))} placeholder={!accountsLoaded ? 'Carregando contas…' : !accounts.length ? 'Nenhuma conta conectada' : 'Selecione uma conta'} disabled={syncing || acting || !!expanded || publicationBusy} onChange={(id) => { setRows([]); setTotal(0); onSelectAccount(id); setPage(1); setExpanded(''); setSyncNotice(''); setError(''); }} />
      <label>Pesquisar<CampoBusca disabled={!!expanded} aria-label="Pesquisar por nome, código, EAN ou SKU" value={query} onChange={(value) => { if (expanded) return; setQuery(value); setPage(1); }} placeholder="Nome, código, EAN ou SKU" /></label>
      <MarketplaceSelect label="Situação" value={status} options={[{ value: '', label: 'Todas' }, ...['active', 'paused', 'closed', 'under_review', 'inactive', 'deleted'].map((value) => ({ value, label: statusNames[value] }))]} placeholder="Todas" disabled={!!expanded} onChange={(value) => { setStatus(value); setPage(1); }} />
    </div>
    {account && <div className={styles.accountSummary}><span>{account.seller_name || 'Conta do Mercado Livre'} · ID {account.seller_reference} · {statusNames[account.status] || account.status}<br />Última sincronização completa: {dateLabel(account.last_synced_at)}</span>{canConnect && <button type="button" disabled={acting || syncing || !!expanded} onClick={() => setConfirmation({ action: 'disconnect', id: account.id, name: account.seller_name || account.seller_reference, connectionId: accountId })}>Desconectar</button>}</div>}
    {error && <p role="alert" className={styles.connectionMessage}>{error}</p>}
    <p role="status" className={styles.help}>{syncNotice || (loading ? 'Carregando anúncios…' : `${total} anúncio(s) nesta seleção.`)}</p>
    <div ref={tableScroll} className={styles.tableScroll} tabIndex={0} aria-label="Tabela de anúncios, role horizontalmente para ver todas as colunas" aria-busy={loading || syncing}>
      <table className={styles.listingTable}><caption className={styles.srOnly}>Produtos anunciados na conta selecionada</caption><colgroup><col style={{ width: '23%' }} /><col style={{ width: '9%' }} /><col style={{ width: '10%' }} /><col style={{ width: '11%' }} /><col style={{ width: '10%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} /><col /><col style={{ width: 64 }} /></colgroup><thead><tr>{['Anúncio', 'Situação', 'Preço', 'Frete vendedor estimado', 'Taxa estimada', 'Estoque', 'Vendidos', 'Envio', 'Ações'].map((name) => <th key={name} scope="col" className={name === 'Ações' ? styles.listingActions : undefined}>{name}</th>)}</tr></thead>
        <tbody>{visibleRows.map(({ snapshot: item, status: rowStatus }) => {
          const shipping = shippingLabels(item.shipping);
          return <Fragment key={item.id}><tr>
          <th scope="row" title={item.title}><strong>{item.title}</strong><small>{item.id}{item.sku ? ` · SKU ${item.sku}` : ''}</small></th>
          <td>{statusNames[rowStatus] || rowStatus}</td><td>{money(item.price, item.currency)}</td><td>{money(item.freightEstimate)}</td><td>{money(item.feeEstimate)}{item.feePercent != null && <small>{item.feePercent}%</small>}</td><td>{item.stock ?? 'Indisponível'}</td><td>{item.sold ?? 'Indisponível'}</td><td>{shipping.freight}<small>{shipping.method}</small></td>
          <td className={styles.listingActions}><button type="button" ref={(button) => { if (button) editButtons.current.set(item.id, button); else editButtons.current.delete(item.id); }} className={styles.editListing} aria-label={`Editar anúncio: ${item.title}`} title="Editar anúncio" aria-expanded={expanded === item.id} aria-controls={`details-${item.id}`} disabled={acting || editing || (!!expanded && expanded !== item.id)} onClick={() => openEditing(item.id)}><Icon name="edit" size={18} /></button></td>
        </tr>{expanded === item.id && <tr id={`details-${item.id}`}><td colSpan={9}><div className={styles.listingDetails}>
          {editing ? <ListingEditor key={`${accountId}-${item.id}`} companyId={companyId} accountId={accountId} itemId={item.id} snapshot={item} permalink={item.permalink} dark={dark} brand={brand} request={marketplaceClientRequest} onBusy={setActing} onClose={() => cancelEditing(item.id)} onSaved={(listing) => {
            setRows((current) => current.map((row) => row.snapshot.id === listing.id ? { snapshot: listing, status: listing.substatus.includes('deleted') ? 'deleted' : listing.status } : row));
            setExpanded(''); setSyncNotice('Alterações confirmadas pelo Mercado Livre.'); requestAnimationFrame(() => editButtons.current.get(listing.id)?.focus());
          }}><ListingData item={item} /></ListingEditor> : <>
          <div className={styles.actionBar}><button type="button" disabled={acting} onClick={() => cancelEditing(item.id)}>Cancelar</button>{canManage && account?.status === 'connected' && ['pause', 'resume', 'close', 'delete'].map((action) => {
            const allowed = !item.substatus.includes('deleted') && (action === 'pause' ? item.status === 'active' : action === 'resume' ? item.status === 'paused' : action === 'close' ? ['active', 'paused'].includes(item.status) : item.status === 'closed');
            return <button key={action} type="button" disabled={!allowed || acting || syncing} onClick={() => setConfirmation({ action: action as ListingAction, id: item.id, name: item.title, connectionId: accountId })}>{actionNames[action as ListingAction]}</button>;
          })}{item.permalink && <a href={item.permalink} target="_blank" rel="noopener noreferrer">Abrir no Mercado Livre ↗</a>}</div>
          <dl><ListingData item={item} /></dl></>}
          {item.variations.length > 0 && <div><strong>Variações</strong>{item.variations.map((variation) => <p key={variation.id}>{variation.attributes} · {money(variation.price, item.currency)} · Estoque: {variation.stock ?? 'Indisponível'}</p>)}</div>}
        </div></td></tr>}</Fragment>;
        })}
        {!visibleRows.length && <tr><td colSpan={9}>{loading ? 'Carregando…' : !accountId ? 'Selecione uma conta.' : syncing ? 'Aguardando sincronização…' : 'Nenhum anúncio encontrado.'}</td></tr>}
        </tbody></table>
    </div>
    <nav className={styles.pagination} aria-label="Páginas dos anúncios"><button type="button" disabled={page <= 1 || loading || !!expanded} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(total / 25))}</span><button type="button" disabled={page * 25 >= total || loading || !!expanded} onClick={() => setPage(page + 1)}>Próxima</button></nav>
    <ModalConfirmacao aberto={!!confirmation} titulo={confirmation ? `${actionNames[confirmation.action]}?` : ''} mensagem={confirmation ? `${confirmation.name}. ${confirmation.action === 'close' ? 'Esta ação encerra definitivamente o anúncio e não permite reativação.' : confirmation.action === 'delete' ? 'O anúncio será marcado como excluído no Mercado Livre. O histórico local é preservado.' : confirmation.action === 'disconnect' ? 'O AvantaLab apagará os tokens desta conexão. Os anúncios no Mercado Livre não serão alterados.' : confirmation.action === 'pause' ? 'O anúncio deixará de vender até ser reativado.' : 'O anúncio voltará a vender se o Mercado Livre permitir.'}` : ''} textoConfirmar={confirmation ? actionNames[confirmation.action] : 'Confirmar'} carregando={acting} darkMode={dark} corPrimaria={brand} variante={confirmation?.action === 'resume' ? 'primaria' : 'destrutiva'} aoCancelar={() => { if (!acting) setConfirmation(null); }} aoConfirmar={executeAction} />
  </section>;
}
