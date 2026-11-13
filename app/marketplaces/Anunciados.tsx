'use client';
import {MARKETPLACE_ACCOUNT_SYNCED,refreshAccountSales} from './startup-account-sync';
import {usePanelExpansion,type PanelExpansionProps} from './panel-expansion';

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import CampoBusca from '@/app/components/CampoBusca';
import type { NoticeTarget } from '@/app/modules/marketplaces/notice-navigation';
import { MARKETPLACE_DETAIL_NAVIGATION, shouldDismissMarketplaceDetail, notifyProductStockChanged, PRODUCT_LISTINGS_REMOVED, PRODUCT_REFERENCE_CHANGED, CATALOG_CONTENT_CHANGED, LISTING_CONFIRMED, notifyListingConfirmed } from './product-stock-events';
import {createListingConfirmationTracker,mergeConfirmedListings,mergeConfirmedGroups,type ListingConfirmation} from './listing-confirmation';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import DetalhesRolaveis from '@/app/components/DetalhesRolaveis';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import Tooltip from '@/app/components/Tooltip';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { Icon } from '@/app/projetos/components/Icon';
import { supabase } from '@/app/lib/supabase';
import { formatarMoeda } from '@/app/lib/formatters';
import { panelCountText } from '@/app/modules/marketplaces/panel-count';
import { marketplaceDateTimeLabel } from '@/app/modules/marketplaces/date-format';
import type { ListingAction, ListingSnapshot } from '@/app/modules/marketplaces/services/listing-model';
import styles from './marketplaces.module.css';
import { shippingLabels } from './shipping-labels';
import ListingEditor from './ListingEditor';
import ProductListingReview from './ProductListingReview';
import type {ReviewSource} from './product-listing-review';
import type {PricePercentages} from '@/app/modules/marketplaces/price-settings';
import {marketplaceIntegrated} from '@/app/modules/marketplaces/integration-contract';
import {salesAccountAvailable} from '@/app/modules/marketplaces/magalu-sales-model';
import MarketplaceSelect from './MarketplaceSelect';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import DateOrderButton from './DateOrderButton';
import { collapseMarketplacePanel } from './collapse-panel';
import type { DateOrder } from '@/app/modules/marketplaces/date-order';
import { listingDisplaySignature } from './passive-refresh';
import { scrollMarketplaceRow, scrollMarketplacePageTop } from './scroll-panel-row';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import { accountsForMarketplace } from './marketplace-scope';
import { accountDisplayName, accountReferenceDetail, preserveNewerAccountLabel } from './account-identification';
import type { ListingOperation } from '@/app/modules/marketplaces/listing-operations';
import type {MagaluCatalogCheck} from './magalu-catalog-state';
import type { MarketplaceAccountsResult } from './account-reader';
import { marketplaceListingEmptyMessage, marketplaceListingEmptyOutcome } from './catalog-feedback';
import ListingGroupHeader from './ListingGroupHeader';
import {unlinkedListingGroups,type ListingGroup} from '@/app/modules/marketplaces/listing-groups';

export type MarketplaceAccount = { id: string; catalog_import_enabled?: boolean; provider?: MarketplaceId; local_label?: string | null; local_label_updated_at?: string | null; seller_reference: string; seller_name: string | null; status: string; connected_at?:string|null; last_error_code?: string | null; last_synced_at: string | null; expires_at: string | null; magalu_catalog_authorized?: boolean };
type Row = { snapshot: ListingSnapshot; status: string; operationalStatus?: string; operations?: ListingOperation; connectionId: string };
type Confirmation = { action: ListingAction; id: string; name: string; connectionId: string; companyId:string; provider:MarketplaceId; requestKey:string };
const listingRowKey=(provider:string,connection:string,id:string)=>provider==='magalu'?`${connection}|${id}`:id;
const statusNames: Record<string, string> = { connected: 'Conectada', expired: 'Reconectar', attention: 'Requer atenção', connecting: 'Conectando', active: 'Ativo', paused: 'Pausado', closed: 'Encerrado', deleted: 'Excluído', under_review: 'Em revisão', inactive: 'Inativo' };
const actionNames = { pause: 'Pausar', resume: 'Reativar', close: 'Encerrar', delete: 'Excluir definitivamente' };
const dateLabel = (value: string | null) => value ? marketplaceDateTimeLabel(value) : 'Ainda não sincronizado';
const money = (value: number | null, currency = 'BRL') => value == null ? 'Indisponível' : currency === 'BRL' ? formatarMoeda(value) : `${currency} ${value.toFixed(2)}`;

function ListingData({ item }: { item: ListingSnapshot }) {
  return <><dt>EAN / GTIN</dt><dd>{item.ean || 'Não informado'}</dd><dt>Saldo no anúncio</dt><dd>{item.stock??'Indisponível'}</dd><dt>Vendidos</dt><dd>{item.sold??'Indisponível'}</dd><dt>Frete vendedor estimado</dt><dd>{money(item.freightEstimate)}</dd><dt>Taxa estimada</dt><dd>{money(item.feeEstimate)}{item.feePercent!=null&&<small>{item.feePercent}%</small>}</dd><dt>Forma de envio</dt><dd>{shippingLabels(item.shipping).method}</dd><dt>Categoria / tipo</dt><dd>{item.category} · {item.listingType}</dd><dt>Condição</dt><dd>{item.condition === 'new' ? 'Novo' : item.condition === 'used' ? 'Usado' : item.condition}</dd><dt>Dimensões/peso informados pelo marketplace</dt><dd>{item.shipping.dimensions || 'Indisponíveis'}</dd><dt>Retirada pessoal</dt><dd>{item.shipping.pickup == null ? 'Não informado' : item.shipping.pickup ? 'Sim' : 'Não'}</dd><dt>Dados consultados em</dt><dd>{dateLabel(item.syncedAt)}</dd><dt>Criado em</dt><dd>{dateLabel(item.createdAt)}</dd><dt>Atualizado no marketplace</dt><dd>{dateLabel(item.updatedAt)}</dd><dt>Alertas / substatus</dt><dd>{[...item.substatus, ...item.warnings].join(' · ') || 'Nenhum retornado pela API'}</dd>{item.attributes.map((attr, index) => <Fragment key={`${attr.name}-${index}`}><dt>{attr.name}</dt><dd>{attr.value}</dd></Fragment>)}</>;
}

export async function marketplaceClientRequest(path: string, body?: unknown, signal?: AbortSignal, method?: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no AvantaLab.');
  let response: Response;
  try {
    response = await fetch(`/api/modulos/marketplaces/${path}`, { method: method || (body ? 'POST' : 'GET'), cache: 'no-store', signal,
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch (failure) {
    if (signal?.aborted || (failure instanceof Error && failure.name === 'AbortError')) throw failure;
    throw new Error((method || (body ? 'POST' : 'GET')) === 'GET'
      ? 'Não foi possível conectar ao AvantaLab. Confira sua conexão e tente consultar novamente.'
      : 'Não recebemos a confirmação da operação. Confira o resultado na lista antes de repetir, pois a solicitação pode ter sido recebida.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw Object.assign(new Error(payload?.message || 'Não foi possível confirmar a resposta do sistema. Confira a lista antes de repetir a operação.'), { code: payload?.code, fields: payload?.fields, details: payload?.details });
  if(path==='anunciados/editar'&&method==='PATCH'&&body&&typeof body==='object'&&!payload.pending){
    const edit=body as {empresaId?:unknown;connectionId?:unknown;id?:unknown};
    if(typeof edit.empresaId==='string'&&typeof edit.connectionId==='string'&&typeof edit.id==='string'&&payload.listing?.id===edit.id&&Array.isArray(payload.listing.substatus)&&typeof payload.listing.status==='string')notifyListingConfirmed({companyId:edit.empresaId,connectionId:edit.connectionId,listing:payload.listing});
  }
  return payload;
}

export default function Anunciados({ noticeTarget, companyId, percentages=null, marketplace = 'mercado_livre', accountNames, readAccounts, dark, brand, onAccountsLoaded, onAccountSelectionLockedChange, onPublishInAnotherAccount, onViewProductInStock, refreshKey = 0, reorderHandle, panelExpanded:controlledExpanded,onPanelExpandedChange }: PanelExpansionProps & { noticeTarget?:NoticeTarget; companyId: string;percentages?:PricePercentages|null; marketplace?: MarketplaceId; accountNames?: MarketplaceAccount[]; readAccounts?: () => Promise<MarketplaceAccountsResult>; magaluCatalogCheck?: MagaluCatalogCheck; dark: boolean; brand: string; onAccountsLoaded: (accounts: MarketplaceAccount[], canDisconnect: boolean, labelsAvailable?: boolean) => void; onAccountSelectionLockedChange: (locked: boolean) => void; onPublishInAnotherAccount: (sourceConnectionId: string, listingId: string, targetConnectionId: string) => void; onViewProductInStock?:(productId:string)=>void; refreshKey?: number; reorderHandle?: ReactNode }) {
  const [accountSelection, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const scopedAccounts = accountsForMarketplace(accounts.map(account => preserveNewerAccountLabel(accountNames?.find(known => known.id === account.id), account)), marketplace);
  const accountId = scopedAccounts.some(account => account.id === accountSelection && salesAccountAvailable(account)) ? accountSelection : '';
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [groupReview,setGroupReview]=useState<ReviewSource|null>(null);
  const [listingGroups,setListingGroups]=useState<ListingGroup[]>([]),[openGroup,setOpenGroup]=useState(''),[listingTotal,setListingTotal]=useState<number|null>(null);
  const listingConfirmations=useRef(createListingConfirmationTracker());
  useEffect(()=>{
    const confirmed=(event:Event)=>{
      const update=(event as CustomEvent<ListingConfirmation>).detail;
      if(update?.companyId!==companyId||!update.connectionId||!update.listing?.id||!Array.isArray(update.listing.substatus))return;
      listingConfirmations.current.confirm(update);
      setRows(current=>mergeConfirmedListings(current,[update]));
      setListingGroups(current=>mergeConfirmedGroups(current,[update]));
    };
    window.addEventListener(LISTING_CONFIRMED,confirmed);
    return()=>window.removeEventListener(LISTING_CONFIRMED,confirmed);
  },[companyId]);
  const [rowsAccountId, setRowsAccountId] = useState('');
  useEffect(()=>{
    const changed=(event:Event)=>{
      const detail=(event as CustomEvent<{companyId:string;product:{id:string;empresa_id:string;price_cents:number|null}}>).detail;
      if(detail?.companyId!==companyId||detail.product?.empresa_id!==companyId)return;
      const cents=detail.product.price_cents,referencePriceCents=typeof cents==='number'&&Number.isSafeInteger(cents)&&cents>0?cents:null;
      setListingGroups(groups=>groups.map(group=>group.productId===detail.product.id?{...group,referencePriceCents}:group));
    };
    window.addEventListener(PRODUCT_REFERENCE_CHANGED,changed);
    return()=>window.removeEventListener(PRODUCT_REFERENCE_CHANGED,changed);
  },[companyId]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [order, setOrder] = useState<DateOrder>('desc');
  const [qualityFilter,setQualityFilter]=useState('');
  const [pageSelection, setPageSelection] = useState({ accountId: '', page: 1 });
  const page = pageSelection.accountId === accountId ? pageSelection.page : 1;
  const setPage = (nextPage: number) => setPageSelection({ accountId, page: nextPage });
  const [total, setTotal] = useState(0);
  const [totalScope, setTotalScope] = useState('');
  const [rowsFilter, setRowsFilter] = useState('');
  const confirmedListingCount = useRef({scope:'',total:0});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [error, setError] = useState('');
  const [expandedState, setExpandedState] = useState({ accountId: '', id: '' });
  const expanded = expandedState.accountId === accountId ? expandedState.id : '';
  const setExpanded = (id: string) => setExpandedState({ accountId, id });
  const [panelExpanded, setPanelExpanded] = usePanelExpansion({panelExpanded:controlledExpanded,onPanelExpandedChange});
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const tableScroll = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null), pageScrollRequested = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [copyingListing, setCopyingListing] = useState<ListingSnapshot | null>(null);
  const [copyTargetId, setCopyTargetId] = useState('');
  const [acting, setActing] = useState(false);
  const actionLock=useRef(false);
  const syncController = useRef<AbortController | null>(null);
  const listController = useRef<AbortController | null>(null);
  const activeAccountId = rows.find(row => listingRowKey(marketplace,row.connectionId,row.snapshot.id) === expanded)?.connectionId || accountId;
  const consumedNotice=useRef('');
  const [noticeListing,setNoticeListing]=useState<NoticeTarget>();
  useEffect(()=>{setNoticeListing(undefined);},[companyId,marketplace]);
  useEffect(()=>{
    if(!noticeTarget || noticeTarget.panel!=='listing' || noticeTarget.provider!==marketplace || consumedNotice.current===noticeTarget.key || acting)return;
    consumedNotice.current=noticeTarget.key;
    setPanelExpanded(true);setCopyingListing(null);setExpanded('');setQuery('');setStatus('');setPageSelection({accountId:noticeTarget.connectionId || '',page:1});setAccountId(noticeTarget.connectionId || '');setNoticeListing(noticeTarget);
    requestAnimationFrame(()=>{if(panel.current)scrollMarketplacePageTop(panel.current);});
  },[noticeTarget,marketplace,acting,syncing]);
  const account = scopedAccounts.find((candidate) => candidate.id === activeAccountId);
  useEffect(() => {
    if (loading || !pageScrollRequested.current) return;
    pageScrollRequested.current = false;
    return scrollMarketplacePageTop(panel.current);
  }, [loading]);
  function changeListingPage(next: number) {
    if (loading || acting || next < 1 || (next > page && next > Math.ceil(total / 25)) || next === page) return;
    pageScrollRequested.current = true;
    setLoading(true); setExpanded(''); setCopyingListing(null); setCopyTargetId(''); setPage(next);
  }
  const connectedSignature = scopedAccounts.filter(salesAccountAvailable).map(candidate => candidate.id).sort().join(',');
  const rowFilter = JSON.stringify([query,status,order,qualityFilter,page,noticeListing?.listingId]);
  const visibleRows = marketplaceIntegrated(marketplace) && rowsAccountId === JSON.stringify([companyId,marketplace,accountId]) && rowsFilter === rowFilter ? rows : [];
  const visibleGroups=visibleRows.length?(listingGroups.length?listingGroups.map(group=>({...group,listings:visibleRows.filter(row=>group.listings.some(member=>member.connectionId===row.connectionId&&member.snapshot.id===row.snapshot.id))})).filter(group=>group.listings.length):unlinkedListingGroups(visibleRows)):[];
  useEffect(()=>{setOpenGroup('');},[companyId,marketplace,accountId,query,status,order,qualityFilter,page]);
  useEffect(()=>{if(expanded){const group=visibleGroups.find(group=>group.listings.some(row=>listingRowKey(marketplace,row.connectionId,row.snapshot.id)===expanded));if(group)setOpenGroup(group.key);}},[expanded,rows,listingGroups]);
  const displayedTotal = marketplaceIntegrated(marketplace) ? total : 0;
  const countScope = JSON.stringify([companyId, marketplace, accountId, query, status,qualityFilter,noticeListing?.listingId]);
  const announcedCount = panelCountText(totalScope === countScope ? displayedTotal : null, loading || totalScope !== countScope, !!error && totalScope !== countScope);
  const listingEmptyOutcome = marketplaceListingEmptyOutcome({
    loading, syncing: false,
    failed: !!error || syncNotice.startsWith('Dados anteriores') || syncNotice.startsWith('Sincronização parcial'),
    filtered: !!query.trim() || !!status || page > 1,
    connectedAccounts: scopedAccounts.filter(candidate => salesAccountAvailable(candidate) && (!accountId || candidate.id === accountId)),
  });
  const visibleSignature = useRef('');
  const backgroundSignature = useRef('');
  useEffect(() => { visibleSignature.current = listingDisplaySignature({ listings: rows, total }); }, [rows, total]);
  const editing = !!expanded && canManage && !!account && salesAccountAvailable(account);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    const data = readAccounts ? await readAccounts() : await marketplaceClientRequest(`conexoes?empresaId=${encodeURIComponent(companyId)}`, undefined, signal);
    if (signal?.aborted) return;
    setAccounts(data.accounts); setCanManage(data.canManage);
    onAccountsLoaded(data.accounts, data.canConnect, data.labelsAvailable !== false);
  }, [companyId, onAccountsLoaded, readAccounts]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void loadAccounts(controller.signal).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); }); });
    return () => controller.abort();
  }, [loadAccounts]);

  useEffect(() => { onAccountSelectionLockedChange(acting); }, [acting, onAccountSelectionLockedChange]);
  useEffect(() => {
    const dismiss = (event: Event) => {
      const keep=(event as CustomEvent<{keepDetail?:string}>).detail?.keepDetail;
      const group=listingGroups.find(group=>group.key===openGroup);
      if(openGroup&&(keep===`announced-group:${openGroup}`||group?.listings.some(row=>keep===`announced:${listingRowKey(marketplace,row.connectionId,row.snapshot.id)}`))){return;}
      if (shouldDismissMarketplaceDetail(event, companyId, expanded ? `announced:${expanded}` : openGroup?`announced-group:${openGroup}`:'', acting)) {
        setExpandedState({ accountId, id: '' }); setOpenGroup('');setCopyingListing(null); setCopyTargetId('');
      }
    };
    window.addEventListener(MARKETPLACE_DETAIL_NAVIGATION, dismiss);
    return () => window.removeEventListener(MARKETPLACE_DETAIL_NAVIGATION, dismiss);
  }, [companyId, accountId, marketplace,expanded, acting,openGroup,listingGroups]);

  const loadList = useCallback(async (recount = true, silent = false) => {
    listController.current?.abort();
    if (!marketplaceIntegrated(marketplace)) { setRows([]); setListingGroups([]); setListingTotal(0); setTotal(0); setLoading(false); setError(''); setSyncNotice(''); return; }
    const controller = new AbortController(); listController.current = controller;
    const readSequence=listingConfirmations.current.beginRead(companyId);
    if(!silent)setLoading(true);
    try {
      const params = new URLSearchParams({ empresaId: companyId, marketplace, ...(accountId ? { connectionId: accountId } : { scope: 'all' }), q: query, status, order, quality:qualityFilter, page: String(page),grouped:'1' });
      if(noticeListing?.listingId){params.set('listingId',noticeListing.listingId);params.set('connectionId',noticeListing.connectionId!);params.delete('scope');params.set('page','1');}
      const scope=JSON.stringify([companyId,marketplace,accountId,query,status,qualityFilter,noticeListing?.listingId]);
      if(recount || confirmedListingCount.current.scope!==scope){
        const countParams=new URLSearchParams(params);countParams.set('countOnly','1');
        const count=await marketplaceClientRequest(`anunciados?${countParams}`,undefined,controller.signal);
        if(controller.signal.aborted)return;
        if(!Number.isSafeInteger(count.total)||count.total<0)throw new Error('Não foi possível conferir o total de anúncios.');
        confirmedListingCount.current={scope,total:count.total};setTotal(count.total);setListingTotal(Number.isSafeInteger(count.listingTotal)?count.listingTotal:count.total);setTotalScope(scope);
      }
      params.set('skipCount','1');
      let data = await marketplaceClientRequest(`anunciados?${params}`, undefined, controller.signal);
      const confirmed=listingConfirmations.current.updatesSince(companyId,readSequence);
      if(confirmed.length)data={...data,listings:mergeConfirmedListings(data.listings,confirmed),groups:mergeConfirmedGroups(data.groups||[],confirmed)};
      if(!controller.signal.aborted && noticeListing){
        const found=data.listings.find((row:Row)=>row.connectionId===noticeListing.connectionId && row.snapshot.id===noticeListing.listingId);
        if(!found)throw new Error('O anúncio desta pendência não foi encontrado na conta indicada.');
        setExpandedState({accountId:noticeListing.connectionId!,id:listingRowKey(marketplace,found.connectionId,found.snapshot.id)});
        requestAnimationFrame(()=>{if(panel.current)scrollMarketplacePageTop(panel.current);});
      }
      if (!controller.signal.aborted) { setRows(data.listings);setListingGroups(data.groups||[]);if(Number.isSafeInteger(data.listingTotal))setListingTotal(data.listingTotal); setRowsFilter(JSON.stringify([query,status,order,qualityFilter,page,noticeListing?.listingId])); setRowsAccountId(JSON.stringify([companyId,marketplace,accountId])); if(data.total!=null){confirmedListingCount.current={scope,total:data.total};setTotal(data.total);} backgroundSignature.current=listingDisplaySignature({...data,total:confirmedListingCount.current.total}); setTotalScope(scope); if(!silent)setError(''); }
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Falha ao carregar anúncios.'); }
    finally { if (!controller.signal.aborted && !silent) setLoading(false); }
  }, [companyId, marketplace, accountId, query, status, order, qualityFilter, page,noticeListing]);
  const loadListRef = useRef(loadList);
  useEffect(() => { loadListRef.current = loadList; }, [loadList]);
  const [listingRemovalVersion,setListingRemovalVersion]=useState(0);
  const appliedRemovalVersion=useRef(0);
  useEffect(()=>{
    const changed=(event:Event)=>{if((event as CustomEvent<{companyId:string}>).detail?.companyId===companyId)setListingRemovalVersion(value=>value+1);};
    window.addEventListener(PRODUCT_LISTINGS_REMOVED,changed);
    window.addEventListener(MARKETPLACE_ACCOUNT_SYNCED,changed);
    window.addEventListener(CATALOG_CONTENT_CHANGED,changed);
    return()=>{window.removeEventListener(PRODUCT_LISTINGS_REMOVED,changed);window.removeEventListener(MARKETPLACE_ACCOUNT_SYNCED,changed);window.removeEventListener(CATALOG_CONTENT_CHANGED,changed);};
  },[companyId]);
  useEffect(()=>{
    if(appliedRemovalVersion.current===listingRemovalVersion||expanded||acting||copyingListing||syncing)return;
    appliedRemovalVersion.current=listingRemovalVersion;void loadListRef.current(true,true);
  },[listingRemovalVersion,expanded,acting,copyingListing,syncing]);
  const consumedRefreshKey = useRef(refreshKey);
  useEffect(() => { if (consumedRefreshKey.current!==refreshKey && !expanded && !acting && !copyingListing) {consumedRefreshKey.current=refreshKey;void loadListRef.current();} }, [refreshKey, expanded, acting, copyingListing]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadList(false); }, query ? 250 : 0);
    return () => { clearTimeout(timer); listController.current?.abort(); };
  }, [loadList]);

  const synchronize = useCallback(async () => {
    if (!marketplaceIntegrated(marketplace) || acting || syncController.current) return;
    const targets = accountsForMarketplace(accounts, marketplace).filter(candidate => salesAccountAvailable(candidate) && (!accountId || candidate.id === accountId));
    if (!targets.length) return;
    const controller = new AbortController(); syncController.current = controller;
    setSyncing(true); setError(''); setSyncNotice('');
    const accountErrors: string[] = [];
    try {
      for (const target of targets) {
        if(controller.signal.aborted)return;
        try {
          if (marketplace === 'mercado_livre') {
            try {
              const checked = await marketplaceClientRequest('anunciados/sincronizar', { empresaId: companyId, connectionId: target.id, reconcileKnown: true }, controller.signal);
              if (checked.partial || checked.busy) accountErrors.push(`${accountDisplayName(target)}: a conferência dos anúncios existentes ficou pendente.`);
            } catch(failure) {
              if(controller.signal.aborted)return;
              accountErrors.push(`${accountDisplayName(target)} — conferir situação: ${failure instanceof Error?failure.message:'Não foi possível conferir os anúncios existentes.'}`);
            }
          }
          let complete = false;
          for (let batch = 0; batch < 200; batch++) {
            if(controller.signal.aborted)return;
            const progress = await marketplaceClientRequest('anunciados/sincronizar', { empresaId: companyId, connectionId: target.id }, controller.signal);
            if (controller.signal.aborted) return;
            if (progress.complete) { complete = true; await refreshAccountSales(marketplaceClientRequest, companyId, target.id, controller.signal); break; }
          }
          if (!complete) accountErrors.push(`${accountDisplayName(target)}: ainda há anúncios para consultar. Use Atualizar para continuar.`);
        } catch (failure) {
          if (controller.signal.aborted) return;
          accountErrors.push(`${accountDisplayName(target)}: ${failure instanceof Error ? failure.message : 'Não foi possível concluir a atualização.'}`);
        }
      }
      if (!controller.signal.aborted && accountErrors.length) setError(accountErrors.join(' '));
    } finally {
      if (syncController.current === controller) { syncController.current = null; setSyncing(false); }
    }
  }, [accountId, accounts, marketplace, acting, companyId]);

  // Filtros e edição não cancelam a fila iniciada pelo usuário.
  useEffect(() => () => { syncController.current?.abort(); syncController.current = null; }, [companyId]);
  function cancelEditing(id: string) {
    if (acting) return;
    setCopyingListing(null); setCopyTargetId('');
    setExpanded('');
    editButtons.current.get(id)?.focus();
    requestAnimationFrame(() => editButtons.current.get(id)?.focus());
  }

  function openEditing(id: string) {
    if (acting) return;
    setExpanded(expanded === id ? '' : id);
    setCopyingListing(null); setCopyTargetId('');
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
    if (!confirmation || acting || actionLock.current) return;
    if(confirmation.companyId!==companyId || confirmation.provider!==marketplace || !canManage || !scopedAccounts.some(a=>a.id===confirmation.connectionId&&a.status==='connected')){
      setError('O contexto da conta mudou. Reabra a confirmação do anúncio. Nenhuma ação foi enviada.');setConfirmation(null);return;
    }
    actionLock.current=true;setActing(true); setError('');
    try {
      const actionResult=await marketplaceClientRequest('anunciados/acao', { empresaId: companyId, connectionId: confirmation.connectionId, id: confirmation.id, action: confirmation.action, confirmation: confirmation.id, requestKey: confirmation.requestKey, source: 'anunciados' },AbortSignal.timeout(55_000));
      if(actionResult.success!==true&&actionResult.pending!==true)throw new Error('O marketplace não confirmou a alteração. Confira a situação antes de repetir.');
      await loadListRef.current();
      setExpanded('');
      setSyncNotice(actionResult.pending?'Alteração enviada; aguardando confirmação do marketplace.':'Ação confirmada pelo marketplace.');
      requestAnimationFrame(() => editButtons.current.get(listingRowKey(marketplace,confirmation.connectionId,confirmation.id))?.focus());
    } catch (failure) { await loadListRef.current();setError(failure instanceof Error ? failure.message : 'Falha na alteração.'); }
    finally { actionLock.current=false;setActing(false); setConfirmation(null);notifyProductStockChanged(companyId); }
  }



  const renderListing=({ snapshot: item, status: rowStatus, operationalStatus, operations, connectionId }: Row) => {
          const sourceAccountId = connectionId || accountId;
          const itemKey=listingRowKey(marketplace,sourceAccountId,item.id);
          const sourceAccount = scopedAccounts.find(candidate => candidate.id === sourceAccountId);
          const shipping = shippingLabels(item.shipping);
          const publishOtherAccountAction = canManage && sourceAccount?.status === 'connected' && <div className={styles.publishOtherAccountAction}>
            <Tooltip texto="Preparar este anúncio em outra conta para revisar antes de publicar"><button type="button" className={styles.publishOtherAccountButton} disabled={acting || (!!copyingListing && copyingListing.id !== item.id)} aria-expanded={copyingListing?.id === item.id} aria-controls={`listing-copy-${item.id}`} onClick={() => onPublishInAnotherAccount(sourceAccountId,item.id,sourceAccountId)}>Anunciar em mais contas</button></Tooltip>
          </div>;
          return <Fragment key={itemKey}><tr className={styles.listingRow} data-marketplace-detail={`announced:${itemKey}`} id={`listing-header-${itemKey}`}>
          <th scope="row" title={item.title} className={expanded === itemKey && editing ? styles.editingListingTitle : undefined}><div className={styles.announcedAccountIdentity}><strong>{accountDisplayName(sourceAccount)}</strong><small>{item.id}</small>{expanded===itemKey&&<><small className={styles.editingListingLabel}>Em edição</small><small>{item.title}</small></>}</div></th>
          <td><strong>{statusNames[rowStatus] || rowStatus}</strong>{operations?.count ? <><small>{operations.count} pedido(s) em andamento</small><small>{operations.labels.join(' / ')}</small></> : null}{item.stock===0&&<small>Sem estoque</small>}</td><td>{money(item.price, item.currency)}</td><td>{item.id}</td>
          <td className={styles.listingActions}><button type="button" ref={(button) => { if (button) editButtons.current.set(itemKey, button); else editButtons.current.delete(itemKey); }} className={styles.editListing} aria-label={`Editar anúncio: ${item.title}`} title="Editar anúncio" aria-expanded={expanded === itemKey} aria-controls={`details-${itemKey}`} disabled={acting} onClick={() => openEditing(itemKey)}><Icon name="edit" size={18} />Editar</button>{item.permalink&&<a className={styles.announcedListingLink} href={item.permalink} target="_blank" rel="noopener noreferrer">Abrir ↗</a>}</td>
        </tr>{expanded === itemKey && <tr id={`details-${itemKey}`} data-marketplace-detail={`announced:${itemKey}`}><td colSpan={5}><DetalhesRolaveis cabecalhoId={`listing-header-${itemKey}`} rotulo={`Detalhes do anúncio ${item.title}`}><div className={styles.listingDetails}>
          {editing ? <>{copyingListing?.id === item.id && <div id={`listing-copy-${item.id}`} className={styles.listingCopy}>
            <MarketplaceAccountPicker label="Conta de destino" value={copyTargetId} options={scopedAccounts.filter((candidate) => candidate.status === 'connected' && candidate.id !== sourceAccountId).map((candidate) => ({ id: candidate.id, name: accountDisplayName(candidate), detail: accountReferenceDetail(candidate) }))} placeholder="Selecione outra conta conectada" disabled={acting} onChange={setCopyTargetId} />
            <div className={styles.actionBar}><button type="button" onClick={() => { setCopyingListing(null); setCopyTargetId(''); }}>Cancelar</button><button type="button" className={styles.primary} disabled={!copyTargetId || acting} onClick={() => { onPublishInAnotherAccount(sourceAccountId, item.id, copyTargetId); setCopyingListing(null); setCopyTargetId(''); }}>Preparar publicação</button></div>
            <p>O AvantaLab consulta os dados atuais, prepara a ficha no destino e abre o formulário para sua revisão. Nada é publicado nesta etapa.</p>
          </div>}<ListingEditor key={`${sourceAccountId}-${item.id}`} companyId={companyId} accountId={sourceAccountId} itemId={item.id} snapshot={item} permalink={item.permalink} additionalAction={publishOtherAccountAction} dark={dark} brand={brand} request={marketplaceClientRequest} onBusy={setActing} onClose={() => cancelEditing(itemKey)} onListingAction={(action) => setConfirmation({ action, id: item.id, name: item.title, connectionId: sourceAccountId,companyId,provider:marketplace,requestKey:crypto.randomUUID() })} onSaved={(listing, pending, message) => {
            setRows((current) => current.map((row) => row.connectionId === sourceAccountId && row.snapshot.id === listing.id ? { ...row, snapshot: listing, status: listing.substatus.includes('deleted') ? 'deleted' : listing.status } : row));
            if (!pending) setExpanded(''); setSyncNotice(message || (pending ? 'Alteração enviada; aguardando confirmação do marketplace.' : 'Alterações confirmadas pelo marketplace.')); if (!pending) requestAnimationFrame(() => editButtons.current.get(itemKey)?.focus());
          }}><ListingData item={item} /></ListingEditor></> : <>
          <div className={styles.actionBar}><button type="button" disabled={acting || !!copyingListing} onClick={() => cancelEditing(itemKey)}>Cancelar</button>{canManage && sourceAccount && salesAccountAvailable(sourceAccount) && (marketplace==='magalu'?['pause','resume']:['pause', 'resume', 'close', 'delete']).map((action) => {
            const allowed = !item.substatus.includes('deleted') && (action === 'pause' ? item.status === 'active' : action === 'resume' ? item.status === 'paused' : action === 'close' ? ['active', 'paused'].includes(item.status) : item.status === 'closed');
            return <button key={action} type="button" disabled={!allowed || acting} onClick={() => setConfirmation({ action: action as ListingAction, id: item.id, name: item.title, connectionId: sourceAccountId,companyId,provider:marketplace,requestKey:crypto.randomUUID() })}>{actionNames[action as ListingAction]}</button>;
          })}{item.permalink && <a href={item.permalink} target="_blank" rel="noopener noreferrer">Abrir no marketplace ↗</a>}{publishOtherAccountAction}</div>
          <dl><ListingData item={item} /></dl>{copyingListing?.id === item.id && <div id={`listing-copy-${item.id}`} className={styles.listingCopy}>
            <MarketplaceAccountPicker label="Conta de destino" value={copyTargetId} options={scopedAccounts.filter((candidate) => candidate.status === 'connected' && candidate.id !== sourceAccountId).map((candidate) => ({ id: candidate.id, name: accountDisplayName(candidate), detail: accountReferenceDetail(candidate) }))} placeholder="Selecione outra conta conectada" disabled={acting} onChange={setCopyTargetId} />
            <div className={styles.actionBar}><button type="button" onClick={() => { setCopyingListing(null); setCopyTargetId(''); }}>Cancelar</button><button type="button" className={styles.primary} disabled={!copyTargetId || acting} onClick={() => { onPublishInAnotherAccount(sourceAccountId, item.id, copyTargetId); setCopyingListing(null); setCopyTargetId(''); }}>Preparar publicação</button></div>
            <p>O AvantaLab consulta os dados atuais, prepara a ficha no destino e abre o formulário para sua revisão. Nada é publicado nesta etapa.</p>
          </div>}</>}
          {item.variations.length > 0 && <div><strong>Variações</strong>{item.variations.map((variation) => <p key={variation.id}>{variation.attributes} · {money(variation.price, item.currency)} · Estoque: {variation.stock ?? 'Indisponível'}</p>)}</div>}
        </div></DetalhesRolaveis></td></tr>}</Fragment>;
        };

  return <section ref={panel} data-marketplace-page-card="" className={`${styles.panel} ${styles.listingsPanel}`} aria-labelledby="announced-title">
    {noticeListing&&<div role="status">Anúncio da pendência <BotaoAcaoCompacto disabled={acting} onClick={()=>{setNoticeListing(undefined);setExpanded('');}}>Voltar à lista</BotaoAcaoCompacto></div>}
    <div className={`${styles.panelHeading} ${!panelExpanded ? styles.panelHeadingCollapsed : ''}`}><div><h2 id="announced-title" tabIndex={-1}>Anunciados · {announcedCount} produtos / {totalScope===countScope&&listingTotal!=null?listingTotal:'…'} anúncios</h2></div><div className={styles.panelHeadingActions}>{reorderHandle}<MarketplaceSelect label="" ariaLabel="Conta dos anúncios" className={styles.announcedAccountFilter} value={accountId} placeholder="Todas as contas" options={[{ value: '', label: 'Todas as contas' }, ...scopedAccounts.filter(salesAccountAvailable).map(candidate => ({ value: candidate.id, label: accountDisplayName(candidate) }))]} disabled={loading || acting} onChange={value => { setNoticeListing(undefined);setAccountId(value); setPageSelection({ accountId: value, page: 1 }); setSyncNotice(''); setError(''); }} /><DateOrderButton context="Anunciados" order={order} disabled={loading || acting} onChange={(value) => { setOrder(value); setPage(1); }} /><Tooltip texto="Atualizar anúncios das contas selecionadas"><BotaoAcaoCompacto disabled={!connectedSignature || syncing || acting} onClick={() => void synchronize()}>{syncing ? 'Atualizando…' : 'Atualizar'}</BotaoAcaoCompacto></Tooltip><BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="Anunciados" controlsId="announced-content" expandido={panelExpanded} onClick={() => setPanelExpanded((current) => !current)} corPrimaria={brand} darkMode={dark} /></div></div>
    <div id="announced-content" hidden={!panelExpanded} aria-busy={loading}>
    <div className={`${styles.listingFilters} ${marketplace==='mercado_livre'?styles.listingFiltersWithQuality:''}`}>
      <label>Pesquisar<CampoBusca disabled={acting} aria-label="Pesquisar por nome, código, EAN ou SKU" value={query} onChange={(value) => { setNoticeListing(undefined);setExpanded(''); setCopyingListing(null); setCopyTargetId(''); setQuery(value); setPage(1); }} placeholder="Nome, código, EAN ou SKU" /></label>
      <MarketplaceSelect label="Situação" value={status} options={[{ value: '', label: 'Todas' }, ...['active', 'paused', 'closed', 'under_review', 'inactive', 'deleted'].map((value) => ({ value, label: value === 'active' ? 'Ativos / em andamento' : statusNames[value] }))]} placeholder="Todas" disabled={acting} onChange={(value) => { setNoticeListing(undefined);setStatus(value); setPage(1); }} />
      {marketplace==='mercado_livre'&&<MarketplaceSelect label="Qualidade" placeholder="Todas as avaliações" value={qualityFilter} options={[{value:'',label:'Todas as avaliações'},{value:'lowest',label:'Menor qualidade primeiro'},{value:'low',label:'Abaixo de 70'},{value:'unknown',label:'Sem avaliação'}]} disabled={acting} onChange={value=>{setNoticeListing(undefined);setQualityFilter(value);setPage(1);}}/>}
    </div>
    {error && <p role="alert" className={styles.connectionMessage}>{error}</p>}
    {status === 'active' && <p className={styles.help}>Exibindo somente anúncios ativos ou com pedidos em andamento. <BotaoAcaoCompacto disabled={loading || acting} onClick={()=>{setNoticeListing(undefined);setStatus('');setPage(1);}}>Ver todas as situações</BotaoAcaoCompacto></p>}
    <CarregamentoDadosModulo ativo={loading} variante="local" esqueletos titulo="Anunciados" mensagem="Carregando anúncios…" corPrimaria={brand} temaEscuro={dark} />
    {!loading && <p role="status" className={styles.help}>{(marketplace === 'mercado_livre' ? syncNotice : '') || `${displayedTotal} produto(s) · ${listingTotal??'—'} anúncio(s) nesta seleção.`}</p>}
    <div ref={tableScroll} className={styles.announcedGroups} aria-busy={loading}>
      {visibleGroups.map(group=>{
        const groupOpen=openGroup===group.key,detailsId=`group-listings-${group.key}`;
        return <section key={group.key} id={`group-header-${group.key}`} className={styles.announcedGroup} data-marketplace-detail={`announced-group:${group.key}`} aria-label={group.title}>
          <ListingGroupHeader group={group} provider={marketplace} percentages={percentages} open={groupOpen} disabled={acting} controlsId={detailsId} onViewStock={onViewProductInStock&&group.productId?()=>{if(acting)return;setOpenGroup('');setExpanded('');setCopyingListing(null);onViewProductInStock(group.productId!);}:undefined} onToggle={()=>{
            setOpenGroup(groupOpen?'':group.key);setExpanded('');setCopyingListing(null);
            if(!groupOpen)requestAnimationFrame(()=>{const header=document.getElementById(`group-header-${group.key}`);if(header)scrollMarketplaceRow(header);});
          }}/>
          {groupOpen&&<div id={detailsId}>
            <div className={styles.announcedSharedStock}><span>Estoque Online compartilhado<small>Mesmo saldo para todas as contas · não somar</small></span><div className={styles.announcedSharedStockActions}><strong>{group.stockQuantity===0?(group.stockPending?'0 un. · confirmar saldo zero':'Sem estoque · 0 un.'):group.stockPending?'Conferir saldo local':`${group.stockQuantity} un.`}</strong>{canManage&&group.productId&&marketplace==='mercado_livre'&&<BotaoAcaoCompacto disabled={acting} onClick={()=>{const source=group.listings.find(row=>!['closed','deleted'].includes(row.operationalStatus||row.status))||group.listings[0];if(acting||!source)return;setGroupReview({companyId,productId:group.productId!,sourceConnectionId:source.connectionId,sourceId:source.snapshot.id});}}>Editar todos os anúncios</BotaoAcaoCompacto>}</div></div>
            <div className={styles.tableScroll} role="region" tabIndex={0} aria-label={`Anúncios de ${group.title}, role horizontalmente para ver todas as colunas`}>
              <table className={styles.listingTable}><caption className={styles.srOnly}>Contas e anúncios de {group.title}</caption><colgroup><col style={{width:'23%'}}/><col style={{width:'15%'}}/><col style={{width:'17%'}}/><col style={{width:'25%'}}/><col style={{ width: 180 }}/></colgroup>
              <thead><tr>{['Conta','Situação','Preço','Anúncio','Ações'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
              <tbody>{group.listings.map(renderListing)}</tbody></table>
            </div>
          </div>}
        </section>;
      })}
      {!visibleRows.length && !loading && <p className={styles.help}>{marketplaceListingEmptyMessage(listingEmptyOutcome)}</p>}
    </div>
    <nav className={styles.pagination} aria-label="Páginas dos anúncios"><button type="button" disabled={page <= 1 || loading || acting} onClick={() => changeListingPage(page - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(displayedTotal / 25))}</span><button type="button" disabled={page * 25 >= displayedTotal || loading || acting} onClick={() => changeListingPage(page + 1)}>Próxima</button></nav>
    <div className={`${styles.panelHeadingActions} ${styles.panelFooterActions}`}><BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="Anunciados" controlsId="announced-content" expandido={panelExpanded} onClick={() => collapseMarketplacePanel('announced-content', () => setPanelExpanded(false))} corPrimaria={brand} darkMode={dark} /></div>
    </div>
    {groupReview&&groupReview.companyId===companyId&&marketplace==='mercado_livre'&&<ProductListingReview allListings source={groupReview} accounts={scopedAccounts} request={marketplaceClientRequest} dark={dark} brand={brand} onBusy={setActing} onSaved={()=>{notifyProductStockChanged(companyId);void loadListRef.current(true,true);}} onClose={()=>{setGroupReview(null);void loadListRef.current(true,true);}}/>}
    <ModalConfirmacao aberto={!!confirmation} titulo={confirmation ? `${actionNames[confirmation.action]}?` : ''} mensagem={confirmation ? `${confirmation.name}. ${confirmation.action === 'close' ? 'Esta ação encerra definitivamente o anúncio e não permite reativação.' : confirmation.action === 'delete' ? 'O anúncio será marcado como excluído no Mercado Livre. O histórico local é preservado.' : confirmation.action === 'pause' ? 'O anúncio deixará de vender até ser reativado.' : 'O anúncio voltará a vender se o Mercado Livre permitir.'}` : ''} textoConfirmar={confirmation ? actionNames[confirmation.action] : 'Confirmar'} carregando={acting} darkMode={dark} corPrimaria={brand} variante={confirmation?.action === 'resume' ? 'primaria' : 'destrutiva'} aoCancelar={() => { if (!acting) setConfirmation(null); }} aoConfirmar={executeAction} />
  </section>;
}
