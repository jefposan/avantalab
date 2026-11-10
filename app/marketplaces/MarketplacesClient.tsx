'use client';
import CatalogCompletion from './CatalogCompletion';
import { destinoInicioModulo } from '@/app/lib/retorno-modulos';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import TransicaoNavegacaoInterna from '@/app/components/TransicaoNavegacaoInterna';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import { watchMarketplaceNoticeOpening, cancelMarketplaceNoticeOpening } from './notice-opening';
import ModuloHeader from '@/app/components/ModuloHeader';
import RodapeAvanta from '@/app/components/RodapeAvanta';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { MarketplaceLiveMonitor } from '@/app/components/MarketplaceLiveMonitor';
import AvantaKanban from '@/app/components/AvantaKanban';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import DetalhesRolaveis from '@/app/components/DetalhesRolaveis';
import Tooltip from '@/app/components/Tooltip';
import AuthorizationRenewal from './AuthorizationRenewal';
import usePanelOrder from './usePanelOrder';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import { consumirNavegacaoModulo, solicitarRetornoAoModuloHospedeiro, type ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { supabase } from '@/app/lib/supabase';
import styles from './marketplaces.module.css';
import Anunciados, { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import {QualityCacheProvider} from './QualitySummary';
import NewListing, { type ListingCopyRequest } from './NewListing';
import MagaluListing from './MagaluListing';
import {PreparationPriceReference} from './LocalProductPricing';
import ProductsStock from './ProductsStock';
import SalesReport from './SalesReport';
import { captureMarketplaceDetailNavigation, MARKETPLACE_DETAIL_NAVIGATION, notifyProductStockChanged } from './product-stock-events';
import {useMarketplacePanelGroup, type MarketplacePanel} from './panel-expansion';
import BotaoProximoScroll from '@/app/components/BotaoProximoScroll';
import ProductSearchShortcut, { type ProductSearchHandle } from './ProductSearchShortcut';
import PriceUsersPanel from './PriceUsersPanel';
import PriceToolsActions from './PriceToolsActions';
import usePriceSettings from './usePriceSettings';
import useTemaResolvido from '@/app/hooks/useTemaResolvido';
import PriceLotsPanel from './PriceLotsPanel';
import { marketplaceDateTimeLabel } from '@/app/modules/marketplaces/date-format';
import PriceLotWebReader, { type PendingLotRead } from './PriceLotWebReader';
import usePriceLotCapture, { lotsPath } from './usePriceLotCapture';
import type { PriceLotDetail, PriceLotItem, PriceLot } from '@/app/modules/marketplaces/price-lots';
import Vendas from './Vendas';
import SalesFilters from './SalesFilters';
import WarehousesPanel from './WarehousesPanel';
import { saleGroup, salesInPeriod, salesSummary, type SaleGroup, type SalePeriod } from '@/app/modules/marketplaces/sales-status';
import { SALES_MARKETPLACES, saleMarketplace, salesByMarketplaces, salesByView, type SalesMarketplace, type SalesView } from '@/app/modules/marketplaces/sales-marketplace-filter';
import {DIRECT_SALES_CHANGED} from '@/app/modules/marketplaces/direct-sales';
import type { MarketplaceSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import { salesAccountAvailable } from '@/app/modules/marketplaces/magalu-sales-model';
import { type InventoryNotice, type MarketplaceLiveFeed, type SaleAlert } from '@/app/modules/marketplaces/live-feed';
import { inventoryNoticeTarget, type NoticeTarget } from '@/app/modules/marketplaces/notice-navigation';
import InventoryNotices from './InventoryNotices';
import { createPassiveRefresh } from './passive-refresh';
import {createStartupAccountSync,MARKETPLACE_ACCOUNT_SYNCED} from './startup-account-sync';
import { Icon } from '@/app/projetos/components/Icon';
import { connectionTarget, validateConnectionAuthorization } from './connection-target';
import { accountsForMarketplace, publicationAccount, publicationAccountAvailable } from './marketplace-scope';
import { accountDisplayName, connectedAccountForIdentification, preserveNewerAccountLabel } from './account-identification';
import AccountIdentification, { type AccountLabelResult } from './AccountIdentification';
import { scrollMarketplaceRow, scrollMarketplacePreparation, captureMarketplacePanelExpansion, marketplaceNavigationBottom } from './scroll-panel-row';
import { MAGALU_CATALOG_MESSAGES, magaluCatalogOutcome, type MagaluCatalogCheck } from './magalu-catalog-state';
import { accountReadMessage, createAccountReader, type MarketplaceAccountsResult } from './account-reader';

const rolagemDosBlocos: Partial<Record<MarketplacePanel | '', { id: string; rotulo: string }>> = {
  sales: { id: 'sales-content', rotulo: 'Vendas' },
  announced: { id: 'announced-content', rotulo: 'Anunciados' },
  warehouses: { id: 'warehouses-content', rotulo: 'Estoques' },
  products: { id: 'products-content', rotulo: 'Produtos cadastrados' },
};

const providers: Array<{ id: MarketplaceId; name: string; logo: string; width: number; height: number; available: boolean; selectable?: boolean }> = [
  { id: 'mercado_livre', name: 'Mercado Livre', logo: 'mercado-livre.png', width: 224, height: 58, available: true },
  { id: 'shopee', name: 'Shopee', logo: 'shopee.svg', width: 116, height: 36, available: false },
  { id: 'tiktok_shop', name: 'TikTok Shop', logo: 'tiktok-shop.svg', width: 160, height: 30, available: false },
  { id: 'magalu', name: 'Magalu', logo: 'magalu.svg', width: 122, height: 32, available: true, selectable: true },
  { id: 'casas_bahia', name: 'Casas Bahia', logo: 'casas-bahia.svg', width: 288, height: 75, available: false },
  { id: 'amazon', name: 'Amazon', logo: 'amazon.svg', width: 97, height: 30, available: false },
];

export default function MarketplacesClient({ companyId, initialContext, connectionStatus, connectionMessage, connectedAccountId }: { companyId: string; initialContext: ContextoNavegacaoModulo | null; connectionStatus?: string; connectionMessage?: string; connectedAccountId?: string }) {
  const router = useRouter();
  const pageRef = useRef<HTMLElement>(null);
  const productSearchRef = useRef<ProductSearchHandle>(null);
  const panelOrder = usePanelOrder(companyId);
  const [context] = useState(() => initialContext ?? consumirNavegacaoModulo('marketplaces', companyId));
  const [empresa, setEmpresa] = useState(() => context?.empresa ?? { nome: 'Perfil empresarial', corPrimaria: '#003E73', temaEscuro: false, logoUrl: '' });
  const [accessState, setAccessState] = useState<'loading' | 'ready' | 'error'>(() => context ? 'ready' : 'loading');
  const [accessError, setAccessError] = useState('');
  const [marketplace, setMarketplace] = useState<MarketplaceId>('mercado_livre');
  const [canManage, setCanManage] = useState(() => context
    ? ['gestor_master', 'administrador', 'operador_completo'].includes(context.perfil)
    : false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [connectionsRefreshing, setConnectionsRefreshing] = useState(false);
  const [accountsRead, setAccountsRead] = useState({ companyId, pending: 0, settled: false });
  const [accountsError, setAccountsError] = useState({ companyId, message: '' });
  const [startupSyncError,setStartupSyncError]=useState<{companyId:string;issues:Record<string,string>}>({companyId,issues:{}});
  const startupSync=useRef<ReturnType<typeof createStartupAccountSync>|null>(null);
  const accountsScope = useRef(companyId);
  useEffect(() => {
    accountsScope.current = companyId;
    return () => { accountsScope.current = ''; };
  }, [companyId]);
  const readAccounts = useMemo(() => createAccountReader(signal => marketplaceClientRequest(`conexoes?empresaId=${encodeURIComponent(companyId)}`, undefined, signal) as Promise<MarketplaceAccountsResult>), [companyId]);
  const accountsLoading = accountsRead.companyId !== companyId || !accountsRead.settled || accountsRead.pending > 0;
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [connectedAccountsExpanded, setConnectedAccountsExpanded] = useState(false);
  const [canManageConnections, setCanManageConnections] = useState(false);
  const [magaluCatalogAuthorizationEnabled, setMagaluCatalogAuthorizationEnabled] = useState(false);
  const [magaluCatalogChecks, setMagaluCatalogChecks] = useState<Record<string, MagaluCatalogCheck>>({});
  const [magaluCatalogRefresh, setMagaluCatalogRefresh] = useState(0);
  const [identificationAvailable, setIdentificationAvailable] = useState(true);
  const [identificationAccountId, setIdentificationAccountId] = useState('');
  const initialConnectionHandled = useRef(false);
  const [accountSelectionLocked, setAccountSelectionLocked] = useState(false);
  const [publicationBusy, setPublicationBusy] = useState(false);
  const [newListingPriceReference, setNewListingPriceReference] = useState<number | null | undefined>(undefined);
  const [copyRequest, setCopyRequest] = useState<ListingCopyRequest | null>(null);
  const scrollToNewListing = useCallback(() => {
    requestAnimationFrame(() => {
      const title = document.getElementById('new-listing-title');
      if (!title?.isConnected) return;
      title.focus({ preventScroll: true });
      scrollMarketplacePreparation(title);
    });
  }, []);
  useEffect(() => { if (copyRequest) scrollToNewListing(); }, [copyRequest, scrollToNewListing]);
  const handleCopyPrepared = useCallback(() => { setCopyRequest(null); scrollToNewListing(); }, [scrollToNewListing]);
  const [connectionNotice, setConnectionNotice] = useState(() => connectionStatus === 'error' ? connectionMessage || 'Não foi possível conectar a conta do Mercado Livre.' : '');
  const [priceUsersOpen, setPriceUsersOpen] = useState(false);
  const [priceLotsPanel, setPriceLotsPanel] = useState<{ id?: string; create?: boolean } | null>(null);
  const [priceLotReading, setPriceLotReading] = useState(false);
  const [priceLotPending, setPriceLotPending] = useState<PendingLotRead | undefined>();
  const [priceLotError, setPriceLotError] = useState('');
  const priceLotCompany = useRef(companyId);
  useEffect(() => { priceLotCompany.current = companyId; }, [companyId]);
  const priceLotsRequest = useCallback((path: string, options?: RequestInit) => marketplaceClientRequest(path.replace('/api/modulos/marketplaces/', ''), options?.body ? JSON.parse(String(options.body)) : undefined, options?.signal || undefined, options?.method), []);
  const priceLotCapture = usePriceLotCapture(companyId, priceLotsRequest);
  const priceSettings = usePriceSettings(accessState === 'ready' ? companyId : '', priceLotsRequest);
  const effectiveDark = useTemaResolvido(priceSettings.settings?.theme || 'profile', empresa.temaEscuro);
  async function refreshPriceLot() {
    if (!priceLotCapture.active) return;
    const detail = await priceLotsRequest(`${lotsPath}?empresaId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(priceLotCapture.active.lot.id)}`) as PriceLotDetail;
    if (priceLotCompany.current !== companyId) return;
    if (!detail.canEdit || detail.lot.status !== 'open') {
      priceLotCapture.activate(null);
      setPriceLotError('Este lote não está disponível para novas leituras. Abra Editar Lotes para conferir o estado e as permissões atuais.');
      return;
    }
    priceLotCapture.activate(detail);
  }
  async function resolvePriceLotItem(item: PriceLotItem, lot: PriceLot) {
    setPriceLotError('');
    try {
      const detail = await priceLotsRequest(`${lotsPath}?empresaId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(lot.id)}`) as PriceLotDetail;
      if (priceLotCompany.current !== companyId) return;
      if (!detail.canEdit || detail.lot.status !== 'open') throw new Error('Retome ou reabra este lote antes de consultar o item pendente.');
      setPriceLotPending({ code: item.scanned_code, read: { companyId, lotId: lot.id, itemId: item.id } });
      priceLotCapture.activate(detail);
    } catch (reason) { if (priceLotCompany.current === companyId) setPriceLotError((reason as Error).message); }
  }
  const [priceLinkStatus, setPriceLinkStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [disconnectAccount, setDisconnectAccount] = useState<MarketplaceAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [renewAccount, setRenewAccount] = useState<MarketplaceAccount | null>(null);
  const [sales, setSales] = useState<MarketplaceSale[]>([]);
  const [salesSnapshot, setSalesSnapshot] = useState<MarketplaceSale[]>([]);
  const [backgroundRefresh, setBackgroundRefresh] = useState(0);
  const [updatesAvailable, setUpdatesAvailable] = useState(false);
  const [inventorySnapshot, setInventorySnapshot] = useState<{companyId: string; feed: MarketplaceLiveFeed} | null>(null);
  type SalesData = { sales: MarketplaceSale[]; awaitingUpdates: number; warnings?: string[] };
  const [salesWarnings, setSalesWarnings] = useState<string[]>([]);
  const salesReader = useRef<ReturnType<typeof createPassiveRefresh<SalesData>> | null>(null);
  const [liveUnavailable, setLiveUnavailable] = useState(false);
  const liveVersion = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    liveVersion.current = undefined;
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId: string; feed?: MarketplaceLiveFeed; unavailable?: boolean;refreshInventory?:boolean }>).detail;
      if (detail?.companyId !== companyId) return;
      setLiveUnavailable(Boolean(detail.unavailable));
      if (!detail.feed) return;
      if (detail.refreshInventory !== false) setInventorySnapshot({companyId, feed: detail.feed});
      if (liveVersion.current !== undefined && detail.feed.updatedAt !== liveVersion.current) { setUpdatesAvailable(true); setBackgroundRefresh(value => value + 1); }
      liveVersion.current = detail.feed.updatedAt;
    };
    window.addEventListener('avanta:marketplace-live-feed', update);
    const listingUpdate = (event: Event) => {
      if ((event as CustomEvent<{ companyId: string }>).detail?.companyId === companyId) setUpdatesAvailable(true);
    };
    window.addEventListener('avanta:marketplace-background-change', listingUpdate);
    return () => { window.removeEventListener('avanta:marketplace-live-feed', update); window.removeEventListener('avanta:marketplace-background-change', listingUpdate); };
  }, [companyId]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState('');
  const [salesRefresh, setSalesRefresh] = useState(0);
  const consumedSalesRefresh = useRef({refreshKey,salesRefresh});
  const [awaitingUpdates, setAwaitingUpdates] = useState(0);
  const [salesAccount, setSalesAccount] = useState('');
  const [salesMarketplaces, setSalesMarketplaces] = useState<SalesMarketplace[]>([]);
  const [salesView, setSalesView] = useState<SalesView>('online');
  const salesViewRef = useRef(salesView);
  useEffect(() => { salesViewRef.current = salesView; }, [salesView]);
  const {activePanel,changePanel}=useMarketplacePanelGroup(companyId);
  const salesExpanded=activePanel==='sales';
  const blocoRolavel = rolagemDosBlocos[activePanel];
  const setSalesExpanded=useCallback((expanded:boolean)=>changePanel('sales',expanded),[changePanel]);
  const [salesGroup, setSalesGroup] = useState<SaleGroup | ''>('');
  const [salesPeriod, setSalesPeriod] = useState<SalePeriod>({ start: '', end: '' });
  const [saleToOpen, setSaleToOpen] = useState('');
  const [noticeNavigation,setNoticeNavigation]=useState<{companyId:string;target:NoticeTarget}>();
  const [noticeNavigationError,setNoticeNavigationError]=useState('');
  const [noticeOpening,setNoticeOpening]=useState(false);
  const lastAdjustedNotice=useRef<InventoryNotice|null>(null);
  const lastViewedStockProduct=useRef('');
  useEffect(()=>{
    const page=pageRef.current,target=noticeNavigation?.companyId===companyId?noticeNavigation.target:undefined;
    if(!noticeOpening || !page || !target || target.panel==='sale')return;
    return watchMarketplaceNoticeOpening(page,target,()=>setNoticeOpening(false),(error)=>{
      setNoticeOpening(false);setNoticeNavigationError(error||(target.origin==='announced'?'Não foi possível abrir o produto no estoque. Tente novamente.':'Não foi possível concluir a abertura da pendência. Tente novamente.'));
    });
  },[noticeOpening,noticeNavigation,companyId]);
  const noticeNavigationGeneration=useRef(0);
  useEffect(()=>{
    const cancel=()=>{noticeNavigationGeneration.current++;setNoticeOpening(false);};
    window.addEventListener(MARKETPLACE_DETAIL_NAVIGATION,cancel);
    return()=>{window.removeEventListener(MARKETPLACE_DETAIL_NAVIGATION,cancel);noticeNavigationGeneration.current++;};
  },[]);
  useEffect(()=>{noticeNavigationGeneration.current++;lastAdjustedNotice.current=null;lastViewedStockProduct.current='';setNoticeOpening(false);setNoticeNavigation(undefined);setNoticeNavigationError('');},[companyId]);
  const noticeTarget=noticeNavigation?.companyId===companyId ? noticeNavigation.target : undefined;
  function cancelNoticeOpening(){
    noticeNavigationGeneration.current++;
    if(noticeTarget)cancelMarketplaceNoticeOpening(noticeTarget.key);
    setNoticeOpening(false);setNoticeNavigation(undefined);setNoticeNavigationError('');
  }
  async function adjustNotice(notice:InventoryNotice){
    if(publicationBusy || accountSelectionLocked){setNoticeNavigationError('Conclua a operação em andamento antes de conferir outra pendência.');return;}
    const target=inventoryNoticeTarget(notice);
    if(!target)return;
    lastAdjustedNotice.current=notice;
    lastViewedStockProduct.current='';
    setNoticeNavigationError('');
    window.dispatchEvent(new CustomEvent(MARKETPLACE_DETAIL_NAVIGATION,{detail:{companyId,keepDetail:''}}));
    const generation=++noticeNavigationGeneration.current;
    setNoticeNavigation(undefined);setNoticeOpening(true);
    if(target.panel==='sale'){
      setNoticeOpening(true);
      try{
        // Apenas dados locais: abrir uma pendência nunca sincroniza nem altera saldo.
        const data=await marketplaceClientRequest(`vendas?${new URLSearchParams({empresaId:companyId,scope:'all',localOnly:'1'})}`,undefined,AbortSignal.timeout(20_000));
        if(generation!==noticeNavigationGeneration.current)return;
        const sale=(data.sales as MarketplaceSale[]).find(s=>s.orderId===target.orderId && s.connectionId===target.connectionId && (s.provider || 'mercado_livre')===target.provider);
        if(!sale)throw new Error('O pedido desta pendência ainda não está disponível em Vendas. Atualize os avisos e tente novamente.');
        setSalesSnapshot(data.sales);setSalesView('online');setSalesAccount(sale.connectionId);setSalesMarketplaces([]);setSalesGroup('');setSalesPeriod({start:'',end:''});setSaleToOpen(sale.id);setSalesExpanded(true);scrollToSales();
      }catch(error){if(generation===noticeNavigationGeneration.current)setNoticeNavigationError(error instanceof Error ? error.message : 'Não foi possível abrir o pedido.');}
      finally{if(generation===noticeNavigationGeneration.current)setNoticeOpening(false);}
      return;
    }
    if(target.panel==='listing'){
      if(!['mercado_livre','magalu'].includes(target.provider)){setNoticeOpening(false);setNoticeNavigationError('Esta plataforma ainda não oferece a conferência do anúncio nesta tela.');return;}
      setMarketplace(target.provider as MarketplaceId);
    }
    setNoticeNavigation({companyId,target:{...target,key:crypto.randomUUID()}});
  }
  function viewProductInStock(productId:string) {
    if (publicationBusy) { setConnectionNotice('Conclua ou limpe a preparação em Novo anúncio antes de abrir o estoque.'); return; }
    setNoticeNavigationError('');
    window.dispatchEvent(new CustomEvent(MARKETPLACE_DETAIL_NAVIGATION,{detail:{companyId,keepDetail:''}}));
    lastAdjustedNotice.current=null;lastViewedStockProduct.current=productId;
    setNoticeOpening(true);
    setNoticeNavigation({companyId,target:{key:crypto.randomUUID(),panel:'stock',provider:marketplace,productId,origin:'announced'}});
  }
  function scrollToSales() {
    requestAnimationFrame(() => {
      const card = document.getElementById('sales-title')?.closest('section');
      if (card?.isConnected) scrollMarketplaceRow(card);
    });
  }
  function selectSalesFromHeader(selection: { period?: SalePeriod; group?: SaleGroup | '' }) {
    setSalesSnapshot(sales);
    setSalesAccount('');
    setSalesMarketplaces([]);
    setSalesExpanded(true);
    if (selection.period !== undefined) setSalesPeriod(selection.period);
    if (selection.group !== undefined) {
      setSalesGroup(selection.group);
      scrollToSales();
    }
  }
  function selectSalesInPanel(group: SaleGroup | '') {
    setSalesSnapshot(sales);
    setSalesGroup(group);
  }
  function selectSalesView(view: SalesView) {
    setSalesSnapshot(sales); setSalesView(view); setSalesAccount(''); setSalesMarketplaces([]); setSalesGroup(''); setSaleToOpen('');
  }
  function openAlertSale(alert: SaleAlert) {
    setSalesView('online');
    const saleDate = new Date(alert.sold_at);
    const dateParts = Number.isNaN(saleDate.getTime()) ? [] : new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(saleDate);
    const dateValues = Object.fromEntries(dateParts.filter(part => ['year', 'month', 'day'].includes(part.type)).map(part => [part.type, part.value]));
    const date = dateValues.year && dateValues.month && dateValues.day ? `${dateValues.year}-${dateValues.month}-${dateValues.day}` : '';
    setSalesSnapshot(sales);
    setSalesAccount(alert.connection_id);
    setSalesMarketplaces([]);
    setSalesGroup('');
    setSalesPeriod(date ? { start: date, end: date } : { start: '', end: '' });
    setSalesExpanded(true);
    setSaleToOpen(alert.sale_id || '');
    setSalesRefresh(value => value + 1);
  }
  const updateSale = useCallback((updated: MarketplaceSale) => {
    setSales((current) => current.map((sale) => sale.id === updated.id && sale.connectionId === updated.connectionId ? updated : sale));
    // A consulta acionada pelo usuário atualiza só a linha aberta, não a lista toda.
    setSalesSnapshot((current) => current.map((sale) => sale.id === updated.id && sale.connectionId === updated.connectionId ? updated : sale));
  }, []);
  const oauthWindow = useRef<Window | null>(null);
  const connectionAttempt = useRef(0);
  const returnHref = `/gestao?inicio=1&empresaId=${encodeURIComponent(companyId)}`;
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === marketplace)!, [marketplace]);
  const loadAccounts = useCallback((available: MarketplaceAccount[], canManageConnection: boolean, labelsAvailable = true, catalogAuthorizationEnabled?: boolean) => {
    setAccountsError(current => ({ ...current, message: '' }));
    setAccounts(previous => available.map(account => preserveNewerAccountLabel(previous.find(known => known.id === account.id), account)));
    setSalesAccount(current => available.some(account => account.id === current && salesAccountAvailable(account)) ? current : '');
    setCanManageConnections(canManageConnection);
    if (catalogAuthorizationEnabled !== undefined) setMagaluCatalogAuthorizationEnabled(catalogAuthorizationEnabled);
    setIdentificationAvailable(labelsAvailable);
    setSelectedAccount((current) => {
      if (available.some((account) => account.id === current && publicationAccountAvailable(account))) return current;
      const connected = available.filter(publicationAccountAvailable);
      return connected[0]?.id || '';
    });
  }, []);

  const refreshConnections = useCallback(async () => {
    setAccountsRead(current => ({ companyId, pending: (current.companyId === companyId ? current.pending : 0) + 1, settled: current.companyId === companyId && current.settled }));
    setAccountsError({ companyId, message: '' });
    try {
      const data = await readAccounts();
      if (accountsScope.current !== companyId) throw Object.assign(new Error('Consulta substituída pela troca de perfil.'), { name: 'AbortError' });
      loadAccounts(data.accounts, data.canConnect, data.labelsAvailable !== false, data.magaluCatalogAuthorizationEnabled === true);
      setAccountsError({ companyId, message: '' });
      setMagaluCatalogRefresh(value => value + 1);
      return data;
    } catch (error) {
      if (accountsScope.current === companyId) setAccountsError({ companyId, message: accountReadMessage(error) });
      throw error;
    } finally {
      setAccountsRead(current => current.companyId === companyId ? { companyId, pending: Math.max(0, current.pending - 1), settled: true } : current);
    }
  }, [companyId, loadAccounts, readAccounts]);

  const magaluAccountSignature = accounts.filter(account => account.provider === 'magalu' && salesAccountAvailable(account))
    .map(account => account.id).sort().join('|');
  useEffect(() => {
    if (accessState !== 'ready' || marketplace !== 'magalu' || !magaluAccountSignature) return;
    let active = true;
    const ids = magaluAccountSignature.split('|');
    queueMicrotask(() => {
      if (active) setMagaluCatalogChecks(current => ({ ...current, ...Object.fromEntries(ids.map(id => [id, 'checking'])) }));
    });
    for (const id of ids) {
      void marketplaceClientRequest(`conexoes/magalu/anuncios?empresaId=${encodeURIComponent(companyId)}&connectionId=${encodeURIComponent(id)}`, undefined, AbortSignal.timeout(15_000))
        .then(data => {
          if (!active) return;
          const status = (data as { status?: string }).status;
          setMagaluCatalogChecks(current => ({ ...current, [id]: magaluCatalogOutcome(status) }));
        })
        .catch(error => {
          if (!active) return;
          const code = (error as Error & { code?: string }).code;
          setMagaluCatalogChecks(current => ({ ...current, [id]: code === 'magalu_403' || code === 'magalu_missing_scopes' ? 'denied' : 'failed' }));
        });
    }
    return () => { active = false; };
  }, [accessState, companyId, magaluAccountSignature, magaluCatalogRefresh, marketplace]);

  const completeNewConnection = useCallback(async (connectionId: unknown) => {
    const data = await refreshConnections();
    const account = connectedAccountForIdentification(data.accounts, connectionId);
    if (account && data.canConnect) {
      setConnectedAccountsExpanded(true);
      setSelectedAccount(account.id);
      setMarketplace(account.provider ?? 'mercado_livre');
      setRenewAccount(null);
      setIdentificationAccountId(account.id);
      setConnectionNotice(account.provider === 'magalu'
        ? account.magalu_catalog_authorized ? ''
          : data.magaluCatalogAuthorizationEnabled ? 'Loja Magalu autorizada. Informe uma identificação. Para publicar, reconecte a mesma loja e aceite as permissões de catálogo.'
            : 'Loja Magalu conectada para vendas e pós-venda. A publicação aguarda a liberação das permissões de catálogo no aplicativo Magalu.'
        : '');
    } else if (account) setConnectionNotice('');
    else throw new Error('Não foi possível confirmar a conta na lista. Use Atualizar contas.');
  }, [refreshConnections]);

  const completeAccountRenewal = useCallback((updated: MarketplaceAccount) => {
    setAccounts((current) => current.map((account) => account.id === updated.id ? preserveNewerAccountLabel(account, updated) : account));
    setRenewAccount((current) => current?.id === updated.id ? updated : current);
    setSelectedAccount((current) => current || updated.id);
    setConnectionNotice('');
  }, []);

  const updateAccountIdentification = useCallback((result: AccountLabelResult) => {
    setAccounts(current => current.map(account => account.id === result.connectionId ? { ...account, local_label: result.local_label, local_label_updated_at: result.local_label_updated_at } : account));
    setIdentificationAccountId('');
    setConnectionNotice('');
    requestAnimationFrame(() => document.getElementById(`edit-account-${result.connectionId}`)?.focus());
  }, []);

  function closeAccountIdentification() {
    const id = identificationAccountId;
    setIdentificationAccountId('');
    setConnectionNotice('');
    requestAnimationFrame(() => document.getElementById(`edit-account-${id}`)?.focus());
  }

  async function updateConnections() {
    if (connectionsRefreshing) return;
    setConnectionsRefreshing(true);
    setConnectionNotice('');
    try {
      await refreshConnections();
      setRefreshKey((value) => value + 1);
      setConnectionNotice('');
    } catch {
      // A falha de leitura é exibida no próprio card, separada da autorização.
    } finally { setConnectionsRefreshing(false); }
  }

  const connectedAccounts = accounts.filter(publicationAccountAvailable);
  const salesAccounts = accounts.filter(salesAccountAvailable);
  const availableSalesMarketplaces = useMemo(() => salesView === 'online' ? SALES_MARKETPLACES.filter(option =>
    accounts.some(account => salesAccountAvailable(account) && (account.provider ?? 'mercado_livre') === option.value)
    || sales.some(sale => saleMarketplace(sale) === option.value)
  ) : [...new Map(sales.filter(s=>s.directSale).map(s=>[`warehouse:${s.directSale!.warehouseId}`,{value:`warehouse:${s.directSale!.warehouseId}` as SalesMarketplace,label:s.directSale!.warehouseName}])).values()], [accounts, sales, salesView]);
  const selectedSalesMarketplaces = useMemo(() => salesMarketplaces.filter(value => availableSalesMarketplaces.some(option => option.value === value)), [salesMarketplaces, availableSalesMarketplaces]);
  const filteredSalesAccounts = salesView === 'online' ? salesAccounts.filter(account => !selectedSalesMarketplaces.length || selectedSalesMarketplaces.includes(account.provider === 'magalu' ? 'magalu' : 'mercado_livre')) : [];
  const renewableAccounts = accounts.filter((account) => ['connected', 'expired', 'attention'].includes(account.status));
  const marketplaceAccounts = accountsForMarketplace(accounts, marketplace);
  const displayedAccounts = accountsForMarketplace(renewableAccounts, marketplace);
  const displayedConnectedAccounts = accountsForMarketplace(connectedAccounts, marketplace);
  const publicationAccountId = publicationAccount(marketplaceAccounts, selectedAccount);
  const accountSignature = salesAccounts.map((account) => account.id).sort().join(',');
  const periodSales = useMemo(() => salesInPeriod(sales, salesPeriod), [sales, salesPeriod]);
  const summary = useMemo(() => salesSummary(salesByView(periodSales, salesView), salesGroup), [periodSales, salesGroup, salesView]);
  const accountSalesSummary = useMemo(() => salesSummary(salesByMarketplaces(salesByView(periodSales, salesView), selectedSalesMarketplaces).filter(sale => !salesAccount || sale.connectionId === salesAccount), ''), [periodSales, salesAccount, selectedSalesMarketplaces, salesView]);
  const pendingSales = summary.byConnection;
  const pendingSalesTotal = summary.filteredTotal;
  const visibleSales = useMemo(() => salesByMarketplaces(salesByView(salesInPeriod(salesSnapshot, salesPeriod), salesView), selectedSalesMarketplaces).filter((sale) => (!salesGroup || saleGroup(sale) === salesGroup) && (!salesAccount || sale.connectionId === salesAccount)), [salesSnapshot, salesPeriod, salesGroup, salesAccount, selectedSalesMarketplaces, salesView]);

  useEffect(() => {
    const page = pageRef.current;
    if (!page || accessState !== 'ready') return;
    const header = page.querySelector('header');
    const selector = page.querySelector('[data-marketplace-selector]');
    const preparationHeading = page.querySelector('#new-listing-heading');
    if (!header || !selector) return;
    const measure = () => {
      const headerHeight = header.getBoundingClientRect().height;
      const selectorHeight = selector.getBoundingClientRect().height;
      page.style.setProperty('--marketplace-header-height', `${headerHeight}px`);
      page.style.setProperty('--preparation-heading-height', `${preparationHeading?.getBoundingClientRect().height ?? 0}px`);
      page.style.setProperty('--marketplace-navigation-height', `${headerHeight + selectorHeight + 24}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header); observer.observe(selector);
    if (preparationHeading) observer.observe(preparationHeading);
    return () => observer.disconnect();
  }, [accessState]);

  useEffect(() => {
    if (accessState !== 'ready') return;
    let firstSalesRead=true;
    const reader = createPassiveRefresh<SalesData>({
      backgroundVisible: () => salesViewRef.current === 'online',
      read: signal => {const localOnly=firstSalesRead;firstSalesRead=false;return marketplaceClientRequest(`vendas?empresaId=${encodeURIComponent(companyId)}&scope=all${localOnly?'&localOnly=1':''}`, undefined, signal);},
      onLatest: data => setSales(previous=>JSON.stringify(previous)===JSON.stringify(data.sales||[]) ? previous : data.sales || []),
      onVisible: data => { setSalesSnapshot(previous=>JSON.stringify(previous)===JSON.stringify(data.sales||[]) ? previous : data.sales || []); setAwaitingUpdates(data.awaitingUpdates || 0); setSalesWarnings(data.warnings || []); },
      onLoading: loading => { setSalesLoading(loading); if (loading) setSalesError(''); },
      onError: error => setSalesError(error instanceof Error ? error.message : 'Não foi possível carregar as vendas.'),
    });
    salesReader.current = reader;
    void reader.manual();
    return () => { reader.stop(); if (salesReader.current === reader) salesReader.current = null; };
  }, [accessState, companyId]);
  useEffect(() => {const previous=consumedSalesRefresh.current;if(previous.refreshKey===refreshKey&&previous.salesRefresh===salesRefresh)return;consumedSalesRefresh.current={refreshKey,salesRefresh};void salesReader.current?.manual();}, [refreshKey, salesRefresh]);
  useEffect(()=>{
    if(accessState!=='ready')return;
    const sync=createStartupAccountSync(companyId,marketplaceClientRequest,(connectionId,message)=>setStartupSyncError(previous=>({companyId,issues:{...(previous.companyId===companyId?previous.issues:{}),[connectionId]:message}})));
    startupSync.current=sync;
    return()=>{sync.stop();if(startupSync.current===sync)startupSync.current=null;};
  },[accessState,companyId]);
  useEffect(()=>{if(accessState==='ready')startupSync.current?.update(accounts);},[accessState,companyId,accounts]);
  useEffect(()=>{
    const changed=(event:Event)=>{
      const detail=(event as CustomEvent).detail;if(detail?.companyId!==companyId)return;
      notifyProductStockChanged(companyId);
      void salesReader.current?.background();
      if(detail.salesUpdated)setStartupSyncError(previous=>{if(previous.companyId!==companyId||!previous.issues[detail.connectionId])return previous;const issues={...previous.issues};delete issues[detail.connectionId];return{companyId,issues};});
    };
    window.addEventListener(MARKETPLACE_ACCOUNT_SYNCED,changed);return()=>window.removeEventListener(MARKETPLACE_ACCOUNT_SYNCED,changed);
  },[companyId]);
  useEffect(()=>{const changed=(e:Event)=>{if((e as CustomEvent).detail?.companyId===companyId)void salesReader.current?.manual();};window.addEventListener(DIRECT_SALES_CHANGED,changed);return()=>window.removeEventListener(DIRECT_SALES_CHANGED,changed);},[companyId]);
  useEffect(() => { if (backgroundRefresh) void salesReader.current?.background(); }, [backgroundRefresh]);

  async function confirmDisconnectAccount() {
    if (!disconnectAccount || disconnecting) return;
    setDisconnecting(true);
    setConnectionNotice('');
    try {
      await marketplaceClientRequest('conexoes', { empresaId: companyId, connectionId: disconnectAccount.id, confirmation: disconnectAccount.id }, undefined, 'DELETE');
      await refreshConnections();
    } catch (error) {
      setConnectionNotice(error instanceof Error ? error.message : 'Não foi possível desconectar a conta.');
    } finally {
      setDisconnecting(false);
      setDisconnectAccount(null);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadIdentity() {
      // O contexto do iframe não leva logoUrl na URL, para não expor data URIs
      // grandes. Quando a prévia não tiver a marca, complementamos somente a
      // identidade visual pelo endpoint já autorizado, sem atrasar o módulo.
      if (!context) {
        setAccessState('loading');
        setAccessError('');
      }
      try {
        if (!companyId) throw new Error('Selecione um perfil empresarial na Gestão antes de abrir este módulo.');
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) throw new Error('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.');
        const response = await fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(companyId)}&moduloId=marketplaces`, { signal: controller.signal, headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.empresa) throw new Error(payload?.mensagem || 'Não foi possível abrir este módulo.');
        if (controller.signal.aborted) return;
        setEmpresa(payload.empresa);
        setCanManage(['gestor_master', 'administrador', 'operador_completo'].includes(payload.perfil));
        setAccessState('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        // A prévia evita a espera inicial, mas uma concessão revogada ainda
        // interrompe a tela quando o servidor responde.
        setAccessError(error instanceof Error ? error.message : 'Não foi possível abrir este módulo.');
        setAccessState('error');
      }
    }
    void loadIdentity();
    return () => controller.abort();
  }, [companyId, context]);

  useEffect(() => {
    if (accessState !== 'ready') return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const askIdentification = connectionStatus === 'connected' && !initialConnectionHandled.current;
      initialConnectionHandled.current = true;
      if (askIdentification) setConnecting(true);
      void (askIdentification ? completeNewConnection(connectedAccountId) : refreshConnections()).catch(() => {
        if (active && askIdentification) setConnectionNotice('A autorização foi concluída, mas a lista de contas ainda não pôde ser atualizada. Use Atualizar contas; não é necessário autorizar novamente por causa desta consulta.');
      }).finally(() => { if (active && askIdentification) setConnecting(false); });
    });
    return () => { active = false; };
  }, [accessState, refreshConnections, completeNewConnection, connectionStatus, connectedAccountId]);

  useEffect(() => {
    const receiveAuthorization = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== 'object') return;
      const data = event.data as { type?: string; provider?: string; empresaId?: string; status?: string; message?: string; renewal?: boolean; connectionId?: string };
      if (data.type !== 'avantalab-marketplace-oauth' || !['mercado_livre', 'magalu'].includes(data.provider || '') || data.empresaId !== companyId) return;
      if (!oauthWindow.current || event.source !== oauthWindow.current) return;
      if (data.renewal) return; // Renovação é confirmada pela solicitação autenticada, não pela mensagem da janela.
      oauthWindow.current = null;
      if (data.status === 'connected') {
        setConnecting(true);
        setConnectionNotice('');
        void completeNewConnection(data.connectionId).catch(() => setConnectionNotice('A autorização foi concluída, mas a lista de contas ainda não pôde ser atualizada. Use Atualizar contas.')).finally(() => setConnecting(false));
      } else {
        setConnecting(false);
        setConnectionNotice(data.message || 'Não foi possível concluir a conexão. Tente novamente.');
      }
    };
    window.addEventListener('message', receiveAuthorization);
    return () => window.removeEventListener('message', receiveAuthorization);
  }, [companyId, completeNewConnection]);

  useEffect(() => {
    if (!connecting || !oauthWindow.current) return;
    const timer = window.setInterval(() => {
      if (oauthWindow.current?.closed) {
        connectionAttempt.current += 1;
        oauthWindow.current = null;
        setConnecting(false);
        if (marketplace === 'magalu') setConnectionNotice('A janela de autorização foi fechada sem conectar a conta. Você pode tentar novamente.');
      }
    }, 400);
    const timeout = marketplace === 'magalu' ? window.setTimeout(() => {
      if (!oauthWindow.current) return;
      connectionAttempt.current += 1;
      oauthWindow.current.close();
      oauthWindow.current = null;
      setConnecting(false);
      setConnectionNotice('A autorização não foi concluída em dez minutos. Inicie uma nova conexão quando o acesso ao ID Magalu estiver disponível.');
    }, 600_000) : null;
    return () => { window.clearInterval(timer); if (timeout !== null) window.clearTimeout(timeout); };
  }, [connecting, marketplace]);

  useEffect(() => {
    if (priceLinkStatus !== 'copied') return;
    const timer = window.setTimeout(() => setPriceLinkStatus('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [priceLinkStatus]);

  function voltar() {
    if (!solicitarRetornoAoModuloHospedeiro()) router.push(destinoInicioModulo(companyId));
  }

  async function copyPriceLink() {
    const link = new URL('/marketplaces/consulta', window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(link);
      setPriceLinkStatus('copied');
    } catch {
      setPriceLinkStatus('error');
    }
  }

  async function connectMarketplace() {
    if (!['mercado_livre', 'magalu'].includes(marketplace) || connecting || !companyId || accountSelectionLocked || publicationBusy || identificationAccountId) return;
    const attempt = ++connectionAttempt.current;
    const target = connectionTarget(marketplace);
    // A abertura acontece no gesto de clique para evitar bloqueio de popup e manter a tela atual intacta.
    const popup = window.open('', target.popup, 'popup=yes,width=560,height=760,resizable=yes,scrollbars=yes');
    if (popup) {
      oauthWindow.current = popup;
      popup.document.title = `Conectando ${target.name}`;
    }
    setConnecting(true);
    setConnectionNotice('');
    try {
      const { data } = await supabase.auth.getSession();
      if (attempt !== connectionAttempt.current) return;
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Volte à Gestão e entre novamente.');
      const response = await fetch(target.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresaId: companyId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (attempt !== connectionAttempt.current) return;
      if (!response.ok || !payload.authorizationUrl) throw new Error(payload.message || 'Não foi possível iniciar a conexão.');
      const authorizationUrl = validateConnectionAuthorization(marketplace, payload.authorizationUrl);
      if (popup && !popup.closed) popup.location.replace(authorizationUrl);
      else window.location.assign(authorizationUrl);
    } catch (error) {
      if (attempt !== connectionAttempt.current) return;
      if (popup && !popup.closed) popup.close();
      oauthWindow.current = null;
      setConnectionNotice(error instanceof Error ? error.message : 'Não foi possível iniciar a conexão.');
      setConnecting(false);
    }
  }

  function cancelMarketplaceConnection() {
    connectionAttempt.current += 1;
    oauthWindow.current?.close();
    oauthWindow.current = null;
    setConnecting(false);
    setConnectionNotice('');
  }

  if (accessState === 'loading') {
    return <TransicaoNavegacaoInterna destino="Anúncios em marketplaces" empresa={context?.empresa} />;
  }

  if (accessState === 'error') {
    return <main className={styles.accessState}>
      <div>
        <span aria-hidden="true">◇</span>
        <h1>Anúncios em marketplaces</h1>
        <p>{accessError}</p>
        <button type="button" onClick={() => router.push('/gestao')}>‹ Início</button>
      </div>
    </main>;
  }

  const prepareLocalProduct = (localProductId: string, targetConnectionId: string) => {
    if (publicationBusy || accountSelectionLocked || !marketplaceAccounts.some(account => account.id === targetConnectionId && publicationAccountAvailable(account))) return;
    setSelectedAccount(targetConnectionId); setCopyRequest({ id: crypto.randomUUID(), localProductId, targetConnectionId });
  };
  const completePublication = () => {
    setCopyRequest(null); setPublicationBusy(false); setRefreshKey(value => value + 1);
    if (marketplace === 'magalu') setMagaluCatalogRefresh(value => value + 1);
    requestAnimationFrame(() => {
      document.getElementById('module-title')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
  };
  const productContext = { accounts, publicationAccounts: marketplaceAccounts, percentages: priceSettings.settings?.percentages ?? null, preparationLocked: publicationBusy || accountSelectionLocked || !selectedProvider.available, onPrepare: prepareLocalProduct };
  return <QualityCacheProvider companyId={companyId} request={marketplaceClientRequest}><main className={`${styles.page} ${effectiveDark ? styles.dark : ''}`} style={{ '--marketplace-brand': empresa.corPrimaria } as CSSProperties} ref={pageRef} onClickCapture={event => { captureMarketplaceDetailNavigation(companyId, event); captureMarketplacePanelExpansion(event); }}>
    <CarregamentoDadosModulo ativo={noticeOpening} escurecerFundo titulo={noticeTarget?.origin==='announced'?'Abrindo produto':'Abrindo pendência'} mensagem="Localizando e preparando o item…" corPrimaria={empresa.corPrimaria} temaEscuro={effectiveDark} onCancelar={cancelNoticeOpening} />
    <MarketplaceLiveMonitor key={companyId} companyId={companyId} brand={empresa.corPrimaria} dark={effectiveDark} onOpenSale={openAlertSale} />
    <ModuloHeader empresa={{ ...empresa, temaEscuro: effectiveDark }} onBack={voltar} productFocusNavigation className={styles.salesHeader} returnTooltip="Voltar à Gestão" returnTooltipPosition="bottom">
      <div className={styles.headerToolbar}>
      <SalesFilters period={salesPeriod} onPeriodChange={period => selectSalesFromHeader({ period })} group={salesGroup} onGroupChange={group => selectSalesFromHeader({ group })} counts={summary.byGroup} total={summary.total} dark={effectiveDark} brand={empresa.corPrimaria}
        notices={<InventoryNotices key={companyId} companyId={companyId} canManage={canManage} feed={inventorySnapshot?.companyId===companyId ? inventorySnapshot.feed : null} unavailable={liveUnavailable} dark={effectiveDark} brand={empresa.corPrimaria} onAdjust={notice=>void adjustNotice(notice)} onDismiss={async notice=>{
          const result = await marketplaceClientRequest('avisos', {
            empresaId: companyId, action: 'dismiss_inventory_notice', noticeId: notice.id, code: notice.code,
          }, AbortSignal.timeout(20_000));
          if (result.ok !== true) throw new Error('Não foi possível confirmar a dispensa do aviso. Atualize a lista.');
        }} />} />
      {noticeNavigationError&&<div role="alert"><p className={styles.connectionMessage}>{noticeNavigationError}</p>{!noticeOpening&&(lastAdjustedNotice.current||lastViewedStockProduct.current)&&<BotaoAcaoCompacto onClick={()=>{if(lastAdjustedNotice.current)void adjustNotice(lastAdjustedNotice.current);else if(lastViewedStockProduct.current)viewProductInStock(lastViewedStockProduct.current);}}>Tentar novamente</BotaoAcaoCompacto>}</div>}
      <div className={styles.headerActionGroup} role="group" aria-labelledby="header-actions-heading">
        <span id="header-actions-heading" className={styles.headerGroupLabel}>Atualização e avisos</span>
        <div className={styles.headerActionButtons}>
      <Tooltip posicao="bottom" texto="Atualizar anuncios">
        <button type="button" className={`${styles.settingsButton} ${styles.backgroundUpdateControl} ${styles.headerTextAction}`} disabled={salesLoading || accountSelectionLocked || publicationBusy} aria-label={updatesAvailable || liveUnavailable ? 'Atualizar novidades de anúncios e vendas' : 'Atualizar listas de anúncios e vendas'} onClick={() => { setUpdatesAvailable(false); setRefreshKey(value => value + 1); }}>
          <Icon name="refresh" size={20} />
          <span className={styles.headerButtonText}>Atualizar</span>
          {(updatesAvailable || liveUnavailable) && <span className={styles.backgroundUpdateDot} aria-hidden="true" />}
        </button>
      </Tooltip>
      <Tooltip texto="Ver vendas do período selecionado" posicao="bottom"><button type="button" className={`${styles.salesNotification} ${styles.headerTextAction}`} onClick={() => { setSalesExpanded(true); setSalesAccount(''); setSalesMarketplaces([]); setSalesSnapshot(sales); scrollToSales(); }} aria-label={`${pendingSalesTotal} vendas nos filtros selecionados. Ver todas as contas e marketplaces.`} aria-busy={salesLoading}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><span className={styles.headerButtonText}>Ver vendas</span>{pendingSalesTotal > 0 && <b>{pendingSalesTotal}</b>}
      </button></Tooltip>
        </div>
      </div>
      </div>
    </ModuloHeader>
    <div className={styles.content}>
    <section className={styles.hero} aria-labelledby="module-title">
      <div><h1 id="module-title" tabIndex={-1}>Anúncios em marketplaces</h1></div>
      <PriceToolsActions brand={empresa.corPrimaria} canManage={canManage} reading={priceLotReading} canManageConnections={canManageConnections} copyStatus={priceLinkStatus}
        onCreate={() => setPriceLotsPanel({ create: true })} onEdit={() => setPriceLotsPanel({})} onSettings={() => setPriceUsersOpen(true)} onCopy={() => void copyPriceLink()} />
    </section>

    {priceLotError && <p className={styles.connectionMessage} role="alert">{priceLotError}</p>}
    {priceLotCapture.active && <PriceLotWebReader key={`${companyId}:${priceLotCapture.active.lot.id}:${priceLotPending?.read.itemId || ''}`} companyId={companyId} detail={priceLotCapture.active} request={priceLotsRequest} capture={priceLotCapture.capture} resolve={priceLotCapture.resolve} initialRead={priceLotPending} onShowLot={() => setPriceLotsPanel({ id: priceLotCapture.active!.lot.id })} onPause={() => { priceLotCapture.activate(null); setPriceLotPending(undefined); }} onBusyChange={setPriceLotReading} onRefresh={refreshPriceLot} dark={effectiveDark} brand={empresa.corPrimaria} />}

    <nav data-product-focus-navigation className={styles.marketplaceSelector} data-marketplace-selector aria-label="Selecionar marketplace">
        <h2 className={styles.srOnly}>Marketplace</h2>
        <div className={styles.providerGrid}>
          {providers.map((provider) => <button key={provider.id} type="button" data-provider={provider.id} disabled={connecting || accountSelectionLocked || publicationBusy || disconnecting || !!identificationAccountId} className={`${styles.provider} ${marketplace === provider.id ? styles.providerSelected : ''}`} onClick={() => { setMarketplace(provider.id); setRenewAccount(null); setConnectionNotice(''); }} aria-pressed={marketplace === provider.id}>
            <strong className={styles.providerName}>{provider.name}</strong>
            <Image className={styles.providerLogo} src={`/images/marketplaces/${provider.logo}`} alt="" width={provider.width} height={provider.height} unoptimized />
            {!provider.available && <small className={styles.providerAvailability}>{provider.selectable ? 'Em preparação' : 'Em breve'}</small>}
            {marketplace === provider.id && <span className={styles.providerCheck} aria-hidden="true"><Icon name="check" size={14} /></span>}
          </button>)}
        </div>
    </nav>

    <section className={styles.grid} aria-label="Configuração de publicação">
      <article className={styles.panel}>
        <div className={styles.connectedAccounts} aria-labelledby="connected-accounts-title" aria-busy={accountsLoading}>
          <div className={styles.connectedAccountsHeading}>
            <div className={styles.connectedAccountsTitle}><h3 id="connected-accounts-title">Contas conectadas</h3><span>{displayedConnectedAccounts.length}</span></div>
            {accountsLoading && <div className={styles.connectedAccountsLoading}><CarregamentoDadosModulo ativo variante="indicador" compacto={false} mostrarMensagem titulo="Contas conectadas" mensagem="Conectando contas..." corPrimaria={empresa.corPrimaria} temaEscuro={effectiveDark} /></div>}
          <div className={styles.connectionGeneralActions}>
            <button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton} ${styles.renewalPrimary}`} disabled={connecting || connectionsRefreshing || accountSelectionLocked || publicationBusy || !!identificationAccountId || !companyId || !canManageConnections || (marketplace !== 'mercado_livre' && marketplace !== 'magalu')} onClick={() => void connectMarketplace()}>{connecting ? `Abrindo ${selectedProvider.name}…` : connectedAccounts.length ? 'Conectar outra conta' : 'Conectar conta'}</button>
            {marketplace === 'magalu' && connecting && <button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} onClick={cancelMarketplaceConnection}>Cancelar conexão</button>}
            <Tooltip texto={marketplace === 'magalu' ? 'Recarregar contas e verificar anúncios Magalu; não renova autorizações' : 'Recarregar a lista de todas as contas desta empresa; não renova autorizações nem consulta reclamações'}><button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={connecting || connectionsRefreshing || disconnecting || accountSelectionLocked || publicationBusy || !companyId} onClick={() => void updateConnections()}>{connectionsRefreshing ? 'Atualizando…' : 'Atualizar contas'}</button></Tooltip>
            <BotaoExpandirCard variante="painel" modo="lista" somenteIcone contexto="contas conectadas" controlsId="connected-accounts-content" expandido={connectedAccountsExpanded} corPrimaria={empresa.corPrimaria} darkMode={effectiveDark} onClick={() => setConnectedAccountsExpanded(value => !value)} />
          </div>
          </div>
          {connectionNotice && <p className={styles.connectionMessage} role="alert">{connectionNotice}</p>}
          {accountsError.companyId === companyId && accountsError.message && <p className={styles.connectionMessage} role="alert">{accountsError.message}</p>}
          {startupSyncError.companyId===companyId&&Object.keys(startupSyncError.issues).length>0&&<p className={styles.connectionMessage} role="alert">Atualização automática pendente: {Object.values(startupSyncError.issues).join(' ')}</p>}
          <CatalogCompletion companyId={companyId} enabled={accessState==='ready'&&canManage&&accounts.some(account=>account.provider==='mercado_livre'&&account.status==='connected')} request={marketplaceClientRequest}/>
          <div id="connected-accounts-content" hidden={!connectedAccountsExpanded}>
            {displayedAccounts.length ? <div className={styles.connectedAccountsList}>{displayedAccounts.map((account) => {
            const accountProvider = providers.find(provider => provider.id === (account.provider ?? 'mercado_livre'));
            return <article key={account.id} data-provider={account.provider ?? 'mercado_livre'} className={`${styles.connectedAccount} ${account.id === selectedAccount ? styles.connectedAccountSelected : ''}`}>
            <button type="button" className={styles.connectedAccountSelect} onClick={() => setSelectedAccount(account.id)} disabled={accountSelectionLocked || publicationBusy} aria-pressed={account.id === publicationAccountId}>
              <span className={styles.accountMarketplaceBrand}>{accountProvider ? <Image src={`/images/marketplaces/${accountProvider.logo}`} alt={accountProvider.name} width={accountProvider.width} height={accountProvider.height} unoptimized /> : 'Marketplace'}</span>
              <strong className={styles.accountName}>{accountDisplayName(account)}{pendingSales[account.id] ? <em className={styles.accountSalesBadge} title="Vendas nos filtros selecionados">{pendingSales[account.id]}</em> : null}</strong>
              {account.local_label && <small className={styles.accountReference}>{account.seller_name || `Vendedor ${account.seller_reference}`}</small>}
              <small className={styles.accountReference}>ID {account.seller_reference}</small>
              <small className={styles.accountStatus} data-status={account.status}>{account.provider === 'magalu' && account.status === 'attention' && account.last_error_code === 'magalu_connector_pending' ? (account.magalu_catalog_authorized ? 'Autorizada · publicação em teste' : magaluCatalogAuthorizationEnabled ? 'Autorizada · reautorize para publicar' : 'Autorizada para vendas · publicação não liberada') : account.status === 'connected' ? 'Conectada' : account.status === 'expired' ? 'Autorização expirada' : 'Requer atenção'}</small>
              {account.provider === 'magalu'
                ? <small className={styles.accountCatalog} data-state={salesAccountAvailable(account) ? magaluCatalogChecks[account.id] || 'checking' : 'unverified'}>{salesAccountAvailable(account) ? MAGALU_CATALOG_MESSAGES[magaluCatalogChecks[account.id] || 'checking'].account : `${MAGALU_CATALOG_MESSAGES.unverified.account} · ${account.status === 'expired' ? 'reautorize a conta' : 'revise a conexão'}`}</small>
                : <small className={styles.accountSync}>Última sincronização: {account.last_synced_at ? marketplaceDateTimeLabel(account.last_synced_at) : 'Ainda não sincronizado'}</small>}
            </button>
            {canManageConnections && <div className={styles.accountConnectionActions}>
              <Tooltip texto="Editar identificação da conta"><button id={`edit-account-${account.id}`} type="button" className={styles.editListing} disabled={disconnecting || connecting || accountSelectionLocked || publicationBusy || !!identificationAccountId} aria-label={`Editar identificação de ${accountDisplayName(account)}`} aria-expanded={identificationAccountId === account.id} aria-controls={`account-identification-${account.id}`} onClick={() => { setRenewAccount(null); setConnectionNotice(''); setIdentificationAccountId(account.id); }}><Icon name="edit" size={18} /></button></Tooltip>
              {(!account.provider || account.provider === 'mercado_livre') && <Tooltip texto="Renovar a autorização desta conta sem excluir a conexão ou o histórico"><button id={`renew-account-${account.id}`} type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={disconnecting || connecting || accountSelectionLocked || publicationBusy || !!identificationAccountId} aria-label={`Renovar autorização de ${account.seller_name || account.seller_reference}`} aria-expanded={renewAccount?.id === account.id} aria-controls={`account-renewal-${account.id}`} onClick={() => setRenewAccount((current) => current?.id === account.id ? null : account)}>Renovar</button></Tooltip>}
              <button type="button" className={`${styles.disconnectAccountButton} ${styles.compactConnectionButton}`} disabled={disconnecting || accountSelectionLocked || publicationBusy || !!identificationAccountId} onClick={() => setDisconnectAccount(account)}>Desconectar</button>
            </div>}
            {canManageConnections && identificationAccountId === account.id && <div id={`account-identification-${account.id}`}><AccountIdentification key={account.id} companyId={companyId} account={account} canEdit={canManageConnections} available={identificationAvailable} onSaved={updateAccountIdentification} onCancel={closeAccountIdentification} /></div>}
            {canManageConnections && renewAccount?.id === account.id && <div id={`account-renewal-${account.id}`}><AuthorizationRenewal companyId={companyId} account={account} onCompleted={completeAccountRenewal} onClose={() => { setRenewAccount(null); document.getElementById(`renew-account-${account.id}`)?.focus(); }} /></div>}
            </article>; })}</div> : <p className={styles.emptyConnectedAccounts}>Nenhuma conta conectada ao {selectedProvider.name}.</p>}
          </div>
        </div>
      </article>

      <article className={styles.panel}>
        <DetalhesRolaveis cabecalhoId="new-listing-heading" cabecalhoInterno rotulo="Novo anúncio" className={styles.preparationScroll}>
        <div id="new-listing-heading" className={`${styles.panelHeading} ${styles.newListingHeading}`}><div><h2 id="new-listing-title" tabIndex={-1}>Novo anúncio</h2></div>{newListingPriceReference !== undefined && <PreparationPriceReference id="new-listing-price-reference" reference={newListingPriceReference} percentages={priceSettings.settings?.percentages??null}/>}</div>
        {marketplace === 'magalu'
          ? <MagaluListing key={`${companyId}:${publicationAccountId}`} companyId={companyId} brand={empresa.corPrimaria} dark={effectiveDark} accountId={publicationAccountId} accounts={marketplaceAccounts} catalogAuthorizationEnabled={magaluCatalogAuthorizationEnabled} accountSelectionLocked={accountSelectionLocked || !!identificationAccountId || connecting} onSelectAccount={setSelectedAccount} onBusyChange={setPublicationBusy} onPriceReferenceChange={setNewListingPriceReference} pricePercentages={priceSettings.settings?.percentages??null} canManage={canManage && !connecting} multiAccountEnabled onPublished={completePublication} copyRequest={copyRequest} onCopyHandled={handleCopyPrepared} />
          : <NewListing key={companyId} companyId={companyId} brand={empresa.corPrimaria} dark={effectiveDark} marketplaceName={selectedProvider.name} accountId={publicationAccountId} marketplaceAvailable={selectedProvider.available} accounts={marketplaceAccounts} accountSelectionLocked={accountSelectionLocked || !!identificationAccountId || connecting} onSelectAccount={setSelectedAccount} onBusyChange={setPublicationBusy} onPriceReferenceChange={setNewListingPriceReference} canManage={canManage && selectedProvider.available && !connecting} multiAccountEnabled onPublished={completePublication} copyRequest={copyRequest} onCopyHandled={handleCopyPrepared} />}
        </DetalhesRolaveis>
      </article>
    </section>

    <AvantaKanban className={styles.panelOrder} order={panelOrder.order} onOrderChange={panelOrder.change} disabled={!panelOrder.ready || publicationBusy || priceUsersOpen || !!disconnectAccount} items={[
      { id: 'warehouses', title: 'Estoques', render: (handle) => <WarehousesPanel panelExpanded={activePanel==='warehouses'} onPanelExpandedChange={expanded=>changePanel('warehouses',expanded)} key={`warehouses:${companyId}`} noticeTarget={noticeTarget?.panel==='stock'?noticeTarget:undefined} companyId={companyId} canManage={canManage} dark={effectiveDark} brand={empresa.corPrimaria} refreshKey={refreshKey} reorderHandle={handle} productContext={productContext} /> },
      { id: 'sales', title: 'Vendas', render: (handle) => <Vendas companyId={companyId} view={salesView} onViewChange={selectSalesView} accountId={salesAccount} onAccountChange={account => { setSalesSnapshot(sales); setSalesAccount(account); }} group={salesGroup} onGroupChange={selectSalesInPanel} counts={accountSalesSummary.byGroup} total={accountSalesSummary.total} accounts={filteredSalesAccounts} marketplaceOptions={availableSalesMarketplaces} selectedMarketplaces={selectedSalesMarketplaces} onMarketplacesChange={values => {
        const valid = values.filter(value => availableSalesMarketplaces.some(option => option.value === value));
        const next = valid.length === availableSalesMarketplaces.length ? [] : valid;
        setSalesSnapshot(sales);
        setSalesMarketplaces(next);
        setSalesAccount(current => !current || !next.length || next.includes(current.startsWith('warehouse:')?current as SalesMarketplace:salesAccounts.find(account => account.id === current)?.provider === 'magalu' ? 'magalu' : 'mercado_livre') ? current : '');
      }} sales={visibleSales} canManage={canManage} loading={salesLoading} error={salesError} warnings={salesWarnings} awaitingUpdates={awaitingUpdates} onRefresh={() => setSalesRefresh((value) => value + 1)} onSaleUpdated={updateSale} expanded={salesExpanded} onExpandedChange={setSalesExpanded} saleToOpen={saleToOpen} key={`${saleToOpen}:${visibleSales.some(sale => sale.id === saleToOpen)}`} dark={effectiveDark} brand={empresa.corPrimaria} reorderHandle={handle} /> },
      { id: 'products', title: 'Produtos cadastrados', render: (handle) => <ProductsStock {...productContext} panelExpanded={activePanel==='products'} onPanelExpandedChange={expanded=>changePanel('products',expanded)} searchRef={productSearchRef} key={companyId} companyId={companyId} canManage={canManage} dark={effectiveDark} brand={empresa.corPrimaria} refreshKey={refreshKey} reorderHandle={handle} /> },
      { id: 'announced', title: 'Anunciados', render: (handle) => <Anunciados companyId={companyId} marketplace={marketplace} percentages={priceSettings.settings?.percentages??null} panelExpanded={activePanel==='announced'} onPanelExpandedChange={expanded=>changePanel('announced',expanded)} onViewProductInStock={viewProductInStock} noticeTarget={noticeTarget?.panel==='listing'?noticeTarget:undefined} accountNames={accounts} readAccounts={readAccounts} magaluCatalogCheck={publicationAccountId ? magaluCatalogChecks[publicationAccountId] || 'checking' : undefined} dark={effectiveDark} brand={empresa.corPrimaria} onAccountsLoaded={loadAccounts} onAccountSelectionLockedChange={setAccountSelectionLocked} onPublishInAnotherAccount={(sourceConnectionId, listingId, targetConnectionId) => {
      if (publicationBusy) { setConnectionNotice('Conclua ou limpe a preparação em Novo anúncio antes de abrir outra.'); return; }
      setSelectedAccount(targetConnectionId);
      setCopyRequest({ id: crypto.randomUUID(), sourceConnectionId, listingId, targetConnectionId });
    }} refreshKey={refreshKey} reorderHandle={handle} /> },
    ]} />
    {blocoRolavel && <BotaoProximoScroll
      key={blocoRolavel.id}
      trechoPaginaId={blocoRolavel.id}
      topoFixo={marketplaceNavigationBottom}
      distanciaInferior={80}
      temaEscuro={effectiveDark}
      ariaLabel={`Rolar para baixo em ${blocoRolavel.rotulo}`}
      title={`Continuar em ${blocoRolavel.rotulo}`}
    />}
    <SalesReport panelExpanded={activePanel==='results'} onPanelExpandedChange={expanded=>changePanel('results',expanded)} key={`sales-report:${companyId}`} companyId={companyId} brand={empresa.corPrimaria} dark={effectiveDark} refreshKey={refreshKey} />
    {panelOrder.notice && <p className={styles.connectionMessage} role="status">{panelOrder.notice}</p>}
    <ProductSearchShortcut onClick={() => productSearchRef.current?.focusSearch()} />
    {priceSettings.error && <p className={styles.connectionMessage} role="alert">{priceSettings.error} Os preços sugeridos não puderam ser calculados. <button type="button" onClick={priceSettings.refresh}>Tentar novamente</button></p>}
    {priceUsersOpen && <PriceUsersPanel key={companyId} companyId={companyId} settings={priceSettings.settings} settingsError={priceSettings.error} onSettingsSaved={priceSettings.accept} onReloadSettings={priceSettings.refresh} dark={effectiveDark} brand={empresa.corPrimaria} onClose={() => setPriceUsersOpen(false)} />}
    {priceLotsPanel && <PriceLotsPanel key={companyId} companyId={companyId} request={priceLotsRequest} initialId={priceLotsPanel.id} createInitially={priceLotsPanel.create} onClose={() => setPriceLotsPanel(null)} onActivate={detail => { setPriceLotPending(undefined); setPriceLotError(''); priceLotCapture.activate(detail); }} onUpdated={detail => { if (priceLotCapture.active?.lot.id === detail.lot.id) priceLotCapture.activate(detail.lot.status === 'open' && detail.canEdit ? detail : null); }} onResolve={(item, lot) => { void resolvePriceLotItem(item, lot); }} dark={effectiveDark} brand={empresa.corPrimaria} />}
    <ModalConfirmacao aberto={!!disconnectAccount} titulo="Desconectar conta?" mensagem={disconnectAccount ? `${accountDisplayName(disconnectAccount)}. O AvantaLab apagará os tokens desta conexão. Os anúncios na plataforma não serão alterados.` : ''} textoConfirmar="Desconectar" carregando={disconnecting} darkMode={effectiveDark} corPrimaria={empresa.corPrimaria} variante="destrutiva" aoCancelar={() => { if (!disconnecting) setDisconnectAccount(null); }} aoConfirmar={() => void confirmDisconnectAccount()} />
    </div>
    <RodapeAvanta darkMode={effectiveDark} />
  </main></QualityCacheProvider>;
}
