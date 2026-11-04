'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import CampoBusca from '@/app/components/CampoBusca';
import CampoMoeda from '@/app/components/CampoMoeda';
import { formatarMoedaDigitada } from '@/app/lib/formatters';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import DetalhesRolaveis from '@/app/components/DetalhesRolaveis';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import { scrollMarketplacePageTop } from '../scroll-panel-row';
import { isValidEan, normalizeEan } from '@/app/modules/marketplaces/services/ean';
import styles from './marketplaces-mobile.module.css';
import recebimentosStyles from '@/app/recebimentos/recebimentos.module.css';
import ColaboradorTopbar from '@/app/recebimentos/components/ColaboradorTopbar';
import PriceLotsPanel from '../PriceLotsPanel';
import usePriceSettings from '../usePriceSettings';
import PriceProductStock from '../PriceProductStock';
import ProductPost from '../ProductPost';
import {PRODUCT_STOCK_CHANGED} from '../product-stock-events';
import PriceLabelReader from '../PriceLabelReader';
import PriceSearchProgress from '../PriceSearchProgress';
import InstalarPwa from '@/app/components/InstalarPwa';
import useInstalacaoPwa from '@/app/hooks/useInstalacaoPwa';
import useTemaResolvido from '@/app/hooks/useTemaResolvido';
import usePriceLotCapture, { type LotRead } from '../usePriceLotCapture';
import { lotTotals } from '@/app/modules/marketplaces/price-lots';
import lotStyles from '../price-lots.module.css';
import { marketplaceDateTime as dateTime } from '@/app/modules/marketplaces/date-format';
import { boundedPriceRequest, waitForPriceSearch } from '@/app/modules/marketplaces/price-search-cancellation';
import CatalogCandidateChooser from '../CatalogCandidateChooser';
import type { CatalogCandidate } from '@/app/modules/marketplaces/services/catalog-publication';

type Company = { id: string; nome: string; perfil: string; [key: string]: unknown };
type PriceSource = 'active_offers' | 'catalog_reference' | 'manual_reference' | 'google_shopping' | 'openai_web_search' | 'local_reference';
type PriceOffer = { title: string; seller: string; price: number; url: string };
type Consultation = {
  status: 'found' | 'not_found' | 'choose';
  ean: string | null;
  query: string | null;
  product?: { id: string; name: string; description: string; image: string | null; internalNotes?:string; attributes: Array<{ id: string; name: string; value: string }>; sources?:string[] };
  candidates?: CatalogCandidate[];
  prices?: { market: number; minimum: number; medium: number; ideal: number };
  sample?: { count: number; minimum: number; maximum: number; source: PriceSource; offers?: PriceOffer[] };
  notice?: string;
  historyId?: string;
  localProductId?: string;
  localProductRevision?: number;
  referenceStatus?: 'saved' | 'missing' | 'preserved';
  consultedAt?: string;
};
type HistoryRow = {
  local_product_id?: string | null;
  id: string; ean: string | null; input_type: 'ean' | 'text'; input_value: string; provider_product_id: string;
  product_name: string; product_description: string | null; image_url: string | null; currency: string;
  market_price_cents: number; minimum_price_cents: number; medium_price_cents: number; ideal_price_cents: number;
  sample_count: number; sample_min_cents: number; sample_max_cents: number; sample_source: PriceSource; source_offers?: PriceOffer[]; created_at: string;
  updated_at: string; last_researched_at: string; manually_updated_at: string | null;
};
type Account = { id: string; status: string; seller_name: string | null; seller_reference: string };
type CatalogProduct = { id: string; name: string; ean: string | null; description: string; pictures: string[]; price_cents: number | null; stock_quantity: number; selected_stock_quantity?:number|null; stock_confirmed_at: string | null; updated_at: string; allocations?:import('@/app/modules/marketplaces/warehouses').WarehouseAllocation[];total_stock_quantity?:number|null };

const SESSION_COMPANY_KEY = 'avantalab_marketplaces_mobile_empresa_id';
const PRICE_CONTINUATION_TIMEOUT_MS = 180_000;
const PRICE_CONTINUATION_INTERVAL_MS = 2_000;
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function priceReferenceLabel(source?: PriceSource) {
  if (source === 'local_reference') return 'Referência cadastrada';
  if (source === 'google_shopping' || source === 'openai_web_search') return 'Média dos até 5 menores preços';
  if (source === 'manual_reference') return 'Preço informado';
  if (source === 'catalog_reference') return 'Preço de catálogo';
  return 'Preço médio Mercado Livre';
}

function priceReferenceNote(source?: PriceSource) {
  if (source === 'local_reference') return 'Valor salvo no cadastro do produto. Use Atualizar preço para pesquisar o mercado novamente.';
  if (source === 'openai_web_search') return 'Média das até 5 menores ofertas atuais verificadas pela pesquisa web com IA.';
  if (source === 'google_shopping') return 'Média das até 5 menores ofertas comparáveis localizadas no Google Shopping.';
  if (source === 'manual_reference') return 'Preço confirmado por você após a consulta pública.';
  if (source === 'catalog_reference') return 'Preço obtido de uma referência de catálogo anterior.';
  return 'Preço obtido de ofertas públicas anteriores do Mercado Livre.';
}

function Icon({ name, size = 22 }: { name: 'barcode' | 'search' | 'history' | 'back' | 'refresh' | 'check' | 'camera' | 'chevron' | 'eye' | 'eyeOff'; size?: number }) {
  const paths = {
    barcode: <><path d="M4 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14" /><path d="M2 8V4a2 2 0 0 1 2-2h4M22 8V4a2 2 0 0 0-2-2h-4M2 16v4a2 2 0 0 0 2 2h4M22 16v4a2 2 0 0 1-2 2h-4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    back: <><path d="m15 18-6-6 6-6" /></>,
    refresh: <><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z" /><circle cx="12" cy="13" r="3" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    eye: <><path d="M3 9.5S6.5 4 12 4s9 5.5 9 5.5S17.5 15 12 15 3 9.5 3 9.5Z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    eyeOff: <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5.5 9 5.5a15 15 0 0 1-2.2 2.8M6.6 6.6A15.8 15.8 0 0 0 3 9.5S6.5 15 12 15a10.3 10.3 0 0 0 3.4-.6" />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function MobilePicker({ label, value, options, onChange, disabled=false }: {
  label: string;
  disabled?:boolean;
  value: string;
  options: Array<{ value: string; label: string; detail?: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return <div ref={rootRef} className={styles.picker}>
    <span className={styles.pickerLabel}>{label}</span>
    <button type="button" className={styles.pickerTrigger} disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
      <span>{selected?.label || 'Selecione'}</span><Icon name="chevron" size={17} />
    </button>
    {open && !disabled && <div className={styles.pickerList} role="listbox" aria-label={label}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false); }}><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</button>)}
    </div>}
  </div>;
}

function historyToConsultation(row: HistoryRow): Consultation {
  return {
    status: 'found', ean: row.ean, query: row.input_type === 'text' ? row.input_value : null,
    product: { id: row.provider_product_id, name: row.product_name, description: row.product_description || '', image: row.image_url, attributes: [] },
    prices: { market: row.market_price_cents / 100, minimum: row.minimum_price_cents / 100, medium: row.medium_price_cents / 100, ideal: row.ideal_price_cents / 100 },
    sample: { count: row.sample_count, minimum: row.sample_min_cents / 100, maximum: row.sample_max_cents / 100, source: row.sample_source, ...(row.source_offers?.length ? { offers: row.source_offers } : {}) },
    historyId: row.id, localProductId: row.local_product_id || undefined, consultedAt: row.sample_source === 'local_reference' ? undefined : row.last_researched_at || row.created_at,
  };
}

function historyDate(row: HistoryRow) {
  return row.last_researched_at || row.created_at;
}

type ScannerIssue = 'denied' | 'error' | null;

function ScannerModal({ initialEan, issue, onClose, onConsult }: { initialEan: string; issue: ScannerIssue; onClose: () => void; onConsult: (ean: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [ean, setEan] = useState(initialEan);
  const [state, setState] = useState<'opening' | 'reading' | 'read' | 'denied' | 'error'>(issue || 'opening');
  const [message, setMessage] = useState(issue === 'denied'
    ? 'A câmera está bloqueada para este app. Libere-a nos ajustes do aparelho ou digite o EAN abaixo.'
    : issue === 'error'
      ? 'Não foi possível iniciar a câmera. Digite o EAN abaixo.'
      : 'Abrindo a câmera…');

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setState('error'); setMessage('A câmera não está disponível neste navegador. Digite o EAN abaixo.'); return;
    }
    controlsRef.current?.stop();
    setState('opening'); setMessage('Ativando a câmera…');
    try {
      const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser');
      if (!videoRef.current) return;
      const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 90, delayBetweenScanSuccess: 600 });
      reader.possibleFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
      const controls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current,
        (result) => {
          if (!result) return;
          const value = normalizeEan(result.getText());
          if (!isValidEan(value)) return;
          controlsRef.current?.stop();
          setEan(value); setState('read'); setMessage('Código lido com sucesso');
          if ('vibrate' in navigator) navigator.vibrate?.(80);
        },
      );
      controlsRef.current = controls;
      setState('reading'); setMessage('Centralize o código de barras no visor');
    } catch (error) {
      const denied = error instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name);
      setState(denied ? 'denied' : 'error');
      setMessage(denied
        ? 'A câmera está bloqueada para este app. Libere-a nos ajustes do aparelho ou digite o EAN abaixo.'
        : 'Não foi possível iniciar a câmera. Digite o EAN abaixo.');
    }
  }, []);

  useEffect(() => {
    if (!issue) void startCamera();
    return () => { controlsRef.current?.stop(); controlsRef.current = null; };
  }, [issue, startCamera]);

  const valid = isValidEan(ean);
  const cameraActive = state === 'reading' || state === 'read';
  return <div className={styles.scannerOverlay} role="dialog" aria-modal="true" aria-labelledby="scanner-title">
    <div className={styles.scannerTop}>
      <button type="button" className={styles.iconButtonLight} onClick={onClose} aria-label="Fechar leitor"><Icon name="back" /></button>
      <div><strong id="scanner-title">Ler código de barras</strong><span>{message}</span></div>
    </div>
    <div className={styles.cameraStage}>
      <video ref={videoRef} className={cameraActive ? undefined : styles.cameraVideoInactive} muted playsInline aria-label="Imagem da câmera para leitura do código" />
      {cameraActive ? <><div className={styles.cameraShade} aria-hidden="true" />
        <div className={`${styles.scanWindow} ${state === 'read' ? styles.scanComplete : ''}`} aria-hidden="true">
          {state === 'read' ? <Icon name="check" size={36} /> : <span />}
        </div></> : <div className={styles.cameraPrompt} role="status" aria-live="polite">
          {state === 'opening' ? <span className={styles.cameraSpinner} aria-hidden="true" /> : <><strong>{state === 'denied' ? 'Câmera bloqueada' : 'Leitor de código de barras'}</strong><span>{message}</span></>}
        </div>}
    </div>
    <div className={styles.scannerSheet}>
      <label htmlFor="scanner-ean">EAN encontrado</label>
      <CampoBusca id="scanner-ean" value={ean} onChange={value => setEan(normalizeEan(value))} inputMode="numeric" autoComplete="off" placeholder="Digite o EAN" rotuloLimpar="Limpar EAN lido" />
      {!valid && ean && <p role="alert">Confira o código: o dígito verificador não é válido.</p>}
      <button type="button" className={styles.primaryButton} disabled={!valid} onClick={() => onConsult(ean)}>Consultar</button>
    </div>
  </div>;
}

export default function MarketplaceMobileApp() {
  const instalacaoPwa=useInstalacaoPwa();
  const [access, setAccess] = useState<'loading' | 'guest' | 'choose-company' | 'ready' | 'no-company'>('loading');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pricedProducts, setPricedProducts] = useState<CatalogProduct[]>([]);
  const [pricedProductsLoading, setPricedProductsLoading] = useState(false);
  const [pricedProductsOpen, setPricedProductsOpen] = useState(false);
  const [catalogSearchRequested,setCatalogSearchRequested] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [loadedCatalogKey, setLoadedCatalogKey] = useState('');
  const [historySort, setHistorySort] = useState<'alpha' | 'date' | 'created' | 'advertised' | 'with_stock' | 'without_stock'>('alpha');
  const [catalogWarehouseId,setCatalogWarehouseId]=useState('all');
  const [catalogWarehouses,setCatalogWarehouses]=useState<Array<{id:string;name:string;is_online:boolean}>>([]);
  const [catalogWarehouseError,setCatalogWarehouseError]=useState('');
  const [catalogWarehousesLoading,setCatalogWarehousesLoading]=useState(false);
  const catalogKey = JSON.stringify([company?.id, historySearch, catalogPage, historySort, catalogWarehouseId, catalogRefresh]);
  const catalogPending = catalogSearchRequested && (pricedProductsLoading || loadedCatalogKey !== catalogKey);
  const catalogCard = useRef<HTMLElement>(null), catalogPageScrollRequested = useRef(false);
  useEffect(() => {
    if (!pricedProductsOpen) { catalogPageScrollRequested.current = false; return; }
    if (catalogPending || !catalogPageScrollRequested.current) return;
    catalogPageScrollRequested.current = false;
    return scrollMarketplacePageTop(catalogCard.current);
  }, [catalogPending, pricedProductsOpen]);
  function changeCatalogPage(next: number) {
    if (catalogPending || next < 1 || (next > catalogPage && next > Math.ceil(catalogTotal / 25)) || next === catalogPage) return;
    catalogPageScrollRequested.current = true;
    setCatalogPage(next);
  }
  const [ean, setEan] = useState('');
  const [query, setQuery] = useState('');
  const [pendingInput, setPendingInput] = useState<{ ean?: string; query?: string }>({});
  const [candidates, setCandidates] = useState<CatalogCandidate[]>([]);
  const [result, setResult] = useState<Consultation | null>(null);
  const [resultDetailsOpen, setResultDetailsOpen] = useState(false);
  const [stockRefreshContainer,setStockRefreshContainer]=useState<HTMLDivElement|null>(null);
  const [productFactsExpanded, setProductFactsExpanded] = useState(false);
  useEffect(()=>{setProductFactsExpanded(false);},[resultDetailsOpen,result?.product?.id,result?.localProductId,result?.historyId,result?.ean]);
  const [resultFromCatalog, setResultFromCatalog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultError, setResultError] = useState('');
  const [priceResearchFeedback, setPriceResearchFeedback] = useState<{productId:string;message:string;error?:boolean}|null>(null);
  // Feedback pertence à ação atual, nunca ao cadastro/histórico do produto.
  useEffect(()=>{setPriceResearchFeedback(null);setResultError('');},[company?.id,result?.localProductId,resultDetailsOpen]);
  useEffect(()=>{
    if(!priceResearchFeedback&&!resultError)return;
    const timer=setTimeout(()=>{setPriceResearchFeedback(null);setResultError('');},20_000);
    return ()=>clearTimeout(timer);
  },[priceResearchFeedback,resultError]);
  useEffect(()=>{
    if(loading||!result?.notice&&!result?.referenceStatus)return;
    const productId=result?.localProductId,historyId=result?.historyId,notice=result?.notice,referenceStatus=result?.referenceStatus;
    const clear=()=>setResult(current=>current&&current.localProductId===productId&&current.historyId===historyId&&current.notice===notice&&current.referenceStatus===referenceStatus?{...current,notice:undefined,referenceStatus:undefined}:current);
    if(!resultDetailsOpen){clear();return;}
    const timer=setTimeout(clear,20_000);
    return ()=>clearTimeout(timer);
  },[result?.notice,result?.referenceStatus,result?.localProductId,result?.historyId,resultDetailsOpen,loading]);
  const [removalNotice, setRemovalNotice] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerIssue, setScannerIssue] = useState<ScannerIssue>(null);
  const [marketPriceDraft, setMarketPriceDraft] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [stockBusy, setStockBusy] = useState(false);
  const [postOpen,setPostOpen]=useState(false);
  const onStockUpdated = useCallback((revision: number) => setResult(current => current ? { ...current, localProductRevision: revision } : current), []);
  const [internalNotes,setInternalNotes] = useState<{companyId:string;productId:string;historyId?:string;notes:string}|null>(null);
  const onInternalNotesLoaded = useCallback((value:{productId:string;historyId?:string;notes:string}) => setInternalNotes({...value,companyId:company?.id || ''}), [company?.id]);
  const resultNotes = internalNotes?.companyId===company?.id && (result?.localProductId ? internalNotes?.productId===result.localProductId : !!result?.historyId && internalNotes?.historyId===result.historyId) ? internalNotes?.notes : undefined;
  const consultationRunRef = useRef(0);
  const historyRunRef = useRef(0);
  const priceSaveBusyRef = useRef(false);
  const consultationBusyRef = useRef(false);
  const consultationAbortRef = useRef<AbortController | null>(null);
  const catalogAbortRef = useRef<AbortController | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const [searchCancelable,setSearchCancelable] = useState(false);
  const [searchIsLocal,setSearchIsLocal] = useState(false);
  const [searchNotice,setSearchNotice] = useState('');
  useEffect(()=>{
    if(!searchNotice)return;
    const timer=setTimeout(()=>setSearchNotice(''),20_000);
    return ()=>clearTimeout(timer);
  },[searchNotice]);
  const pendingLotRead = useRef<LotRead | null>(null);

  const cancelPriceSearch = useCallback((silent = false) => {
    consultationRunRef.current++;
    historyRunRef.current++;
    consultationAbortRef.current?.abort(); consultationAbortRef.current = null;
    catalogAbortRef.current?.abort(); catalogAbortRef.current = null;
    setPricedProductsOpen(false); setPricedProductsLoading(false);
    consultationBusyRef.current = false; pendingLotRead.current = null;
    setLoading(false); setHistoryLoading(false); setSearchCancelable(false); setSearchNotice(silent ? '' : 'Pesquisa cancelada.');
    setCandidates([]); setError(''); setResultError('');
    if (!silent) requestAnimationFrame(() => searchTriggerRef.current?.focus());
  }, []);
  const [lotsPanel, setLotsPanel] = useState<{ id?: string; create?: boolean } | null>(null);

  const selectCompany = useCallback(async (selected: Company) => {
    setCompanies((current) => current.some((item) => item.id === selected.id) ? current : [...current, selected]);
    setCompany(selected); setAccess('ready');
    try { localStorage.setItem(SESSION_COMPANY_KEY, selected.id); } catch {}
  }, []);

  const selectCompanies = useCallback((items: Company[]) => {
    setCompanies(items);
    if (!items.length) { setAccess('no-company'); return; }
    if (items.length === 1) { void selectCompany(items[0]); return; }
    let selectedId = '';
    try { selectedId = localStorage.getItem(SESSION_COMPANY_KEY) || ''; } catch {}
    const selected = items.find((item) => item.id === selectedId);
    if (selected) void selectCompany(selected);
    else { setCompany(null); setAccess('choose-company'); }
  }, [selectCompany]);

  const request = useCallback(async (path: string, options?: RequestInit) => {
    return boundedPriceRequest(async signal => {
    const { data } = await supabase.auth.getSession();
    signal.throwIfAborted();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(path, { ...options, signal, cache: 'no-store', headers: { ...(options?.body&&!(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(options?.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body.message || 'Não foi possível concluir a consulta.'), {code:body.code});
    return body;
    }, options?.signal, options?.method && options.method !== 'GET' ? 65_000 : 25_000);
  }, []);
  const lotCapture = usePriceLotCapture(company?.id || '', request);
  const priceSettings = usePriceSettings(company?.id || '', request);
  const effectiveDark = useTemaResolvido(priceSettings.settings?.theme || 'profile', priceSettings.settings?.profileDark || false);
  const { capture: captureLotRead, resolve: resolveLotRead } = lotCapture;

  useEffect(() => {
    consultationRunRef.current++;
    consultationAbortRef.current?.abort(); consultationAbortRef.current = null;
    consultationBusyRef.current = false;
    pendingLotRead.current = null;
    const frame = requestAnimationFrame(() => { setLotsPanel(null); setLoading(false); setSearchCancelable(false); setSearchNotice(''); });
    return () => { cancelAnimationFrame(frame); consultationAbortRef.current?.abort(); catalogAbortRef.current?.abort(); consultationRunRef.current++; historyRunRef.current++; };
  }, [company?.id]);

  const loadAccesses = useCallback(async () => {
    const body = await request('/api/modulos/marketplaces/precos/acessos');
    const items = Array.isArray(body.companies) ? body.companies as Company[] : [];
    if (!items.length) setAccess('no-company'); else selectCompanies(items);
  }, [request, selectCompanies]);

  useEffect(() => {
    navigator.serviceWorker?.register('/marketplaces/consulta/sw.js', { scope: '/marketplaces/consulta' }).catch(() => undefined);
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) {
        try { localStorage.removeItem(SESSION_COMPANY_KEY); } catch {}
        setAccess('guest'); return;
      }
      try { await loadAccesses(); }
      catch { if (active) { await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined); setLoginError('Não foi possível carregar seu acesso. Entre novamente.'); setAccess('guest'); } }
    });
    return () => { active = false; };
  }, [loadAccesses]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = login.trim().toLowerCase();
    if (!normalized) { setLoginError('Informe seu login.'); return; }
    if (!password) { setLoginError('Informe sua senha.'); return; }
    setLoginLoading(true); setLoginError('');
    try {
      const resolution = await fetch('/api/modulos/marketplaces/precos/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: normalized }) });
      const accessData = await resolution.json().catch(() => ({}));
      if (!resolution.ok || !accessData.email) throw new Error(accessData.message || 'Login ou senha inválidos.');
      const { error } = await supabase.auth.signInWithPassword({ email: String(accessData.email), password });
      if (error) throw new Error('Login ou senha inválidos.');
      await loadAccesses(); setPassword('');
    } catch (reason) { await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined); setLoginError(reason instanceof Error ? reason.message : 'Não foi possível entrar.'); }
    finally { setLoginLoading(false); }
  };

  const loadHistory = useCallback(async (companyId: string, signal?: AbortSignal) => {
    const run = ++historyRunRef.current;
    setHistoryLoading(true);
    try {
      const body = await request(`/api/modulos/marketplaces/precos/historico?empresaId=${encodeURIComponent(companyId)}`, {signal});
      if (!signal?.aborted && run === historyRunRef.current) setHistory(Array.isArray(body.history) ? body.history.slice(0, 10) : []);
    } catch (reason) { if (!signal?.aborted && run === historyRunRef.current) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico.'); }
    finally { if (run === historyRunRef.current) setHistoryLoading(false); }
  }, [request]);

  const openCatalogProduct = useCallback(async (product: CatalogProduct) => {
    if (!company || consultationBusyRef.current || stockBusy) return;
    cancelPriceSearch(true); setSearchIsLocal(true); setPricedProductsOpen(true);
    const run = ++consultationRunRef.current;
    const controller = new AbortController(); consultationAbortRef.current = controller;
    consultationBusyRef.current = true; setLoading(true); setSearchCancelable(true); setCatalogError('');
    try {
      const body = await request('/api/modulos/marketplaces/precos/produto', { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]), body: JSON.stringify({ empresaId: company.id, productId: product.id }) });
      if (run !== consultationRunRef.current) return;
      if (!body.result) throw new Error('Produto não disponível neste perfil. Atualize a pesquisa.');
      setResultFromCatalog(true); setResultError(''); setResult(body.result); setResultDetailsOpen(true);
    } catch (reason) { if (run === consultationRunRef.current) setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o produto.'); }
    finally { if (run === consultationRunRef.current) { setLoading(false); setSearchCancelable(false); consultationAbortRef.current=null; consultationBusyRef.current = false; } }
  }, [company, request, stockBusy, cancelPriceSearch]);

  const openHistoryResult = useCallback((row: HistoryRow, fromCatalog = false) => {
    if (consultationBusyRef.current || stockBusy) return;
    cancelPriceSearch(true);setSearchIsLocal(true);
    const run = ++consultationRunRef.current;
    setResultError('');
    setResultFromCatalog(fromCatalog);
    const saved = historyToConsultation(row);
    setResult(saved); setResultDetailsOpen(true);
    if (!company || (!row.local_product_id && !row.ean)) return;
    const controller = new AbortController(); consultationAbortRef.current = controller;
    consultationBusyRef.current = true; setLoading(true); setSearchCancelable(true);
    void request('/api/modulos/marketplaces/precos/produto', { method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]), body: JSON.stringify({ empresaId: company.id, ...(row.local_product_id ? { productId: row.local_product_id } : { ean: row.ean }) }) })
      .then(body => { if (run === consultationRunRef.current && body.result) setResult({ ...body.result, historyId: saved.historyId, prices: saved.prices, sample: saved.sample, consultedAt: saved.consultedAt }); })
      .catch(reason => { if (run === consultationRunRef.current) setResultError(reason instanceof Error ? reason.message : 'Não foi possível conferir o cadastro atual.'); })
      .finally(() => { if (run === consultationRunRef.current) { setLoading(false); setSearchCancelable(false); consultationBusyRef.current=false; consultationAbortRef.current=null; } });
  }, [company, request, stockBusy, cancelPriceSearch]);

  useEffect(() => {
    setMarketPriceDraft(result?.prices ? formatarMoedaDigitada(String(Math.round(result.prices.market * 100))) : '');
  }, [result?.historyId, result?.prices?.market]);

  useEffect(()=>{
    if(!pricedProductsOpen||!company?.id)return;
    const controller=new AbortController();let active=true;
    setCatalogWarehousesLoading(true);setCatalogWarehouseError('');
    void request(`/api/modulos/marketplaces/precos/estoques?empresaId=${encodeURIComponent(company.id)}`,{signal:controller.signal})
      .then(body=>{if(active)setCatalogWarehouses(body.warehouses||[]);})
      .catch(reason=>{if(active)setCatalogWarehouseError(reason instanceof Error?reason.message:'Não foi possível consultar os estoques.');})
      .finally(()=>{if(active)setCatalogWarehousesLoading(false);});
    return()=>{active=false;controller.abort();};
  },[company?.id,pricedProductsOpen,catalogRefresh,request]);

  useEffect(() => {
    if (!pricedProductsOpen || !catalogSearchRequested || !company?.id) return;
    const controller = new AbortController(); let active = true;
    catalogAbortRef.current = controller;
    const timer = setTimeout(() => {
      if (controller.signal.aborted) return;
      setPricedProducts([]); setCatalogTotal(0); setPricedProductsLoading(true); setCatalogError('');
      void request(`/api/modulos/marketplaces/precos/produto?empresaId=${encodeURIComponent(company.id)}&q=${encodeURIComponent(historySearch)}&page=${catalogPage}&sort=${historySort}${catalogWarehouseId==='all'?'':`&warehouseId=${encodeURIComponent(catalogWarehouseId)}`}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) })
        .then(body => { if (active && !controller.signal.aborted) { setPricedProducts(Array.isArray(body.products) ? body.products : []); setCatalogTotal(body.total || 0); setLoadedCatalogKey(catalogKey); } })
        .catch(reason => { if (active && !controller.signal.aborted) { setCatalogError(reason instanceof Error ? reason.message : 'Não foi possível pesquisar os produtos.'); setLoadedCatalogKey(catalogKey); } })
        .finally(() => { if (active && !controller.signal.aborted) { setPricedProductsLoading(false); if (catalogAbortRef.current === controller) catalogAbortRef.current=null; } });
    }, historySearch.trim()?300:0);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [company?.id, historySort, historySearch, catalogPage, catalogRefresh, catalogWarehouseId, catalogKey, pricedProductsOpen, catalogSearchRequested, request]);

  useEffect(() => {
    if (!company?.id) return;
    let ativo = true;
    const empresaId = company.id;
    const quadro = window.requestAnimationFrame(() => {
      setConnectionId(''); setConnectionStatus(null); setHistory([]); setPricedProducts([]); setPricedProductsOpen(false); setHistorySearch(''); setCatalogWarehouseId('all'); setCatalogWarehouses([]); setCatalogWarehouseError(''); setCatalogPage(1); setCatalogError(''); setLoading(false); setResult(null); setCandidates([]); setError(''); setResultError('');
      void (async () => {
        try {
          const body = await request(`/api/modulos/marketplaces/precos/contexto?empresaId=${encodeURIComponent(empresaId)}`);
          if (!ativo) return;
          const connected = (Array.isArray(body.accounts) ? body.accounts : []).filter((account: Account) => account.status === 'connected');
          setConnectionId(connected[0]?.id || '');
          setConnectionStatus(connected.length ? 'connected' : 'disconnected');
          await loadHistory(empresaId);
        } catch { if (ativo) setError('Não foi possível preparar a consulta. Tente novamente.'); }
      })();
    });
    return () => { ativo = false; consultationRunRef.current++; consultationBusyRef.current = false; window.cancelAnimationFrame(quadro); };
  }, [company?.id, loadHistory, request]);

  const consult = useCallback(async (input: { ean?: string; query?: string; productId?: string; historyId?: string; lotRead?: LotRead }) => {
    if (!company || consultationBusyRef.current || stockBusy) return;
    setSearchIsLocal(false);
    catalogAbortRef.current?.abort(); catalogAbortRef.current=null; setPricedProductsOpen(false);
    consultationBusyRef.current = true;
    const run = ++consultationRunRef.current;
    const isHistoryRefresh = Boolean(input.historyId);
    const controller = new AbortController(); consultationAbortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(new Error('A pesquisa demorou mais que o esperado. Você pode tentar novamente.')), PRICE_CONTINUATION_TIMEOUT_MS);
    if (!isHistoryRefresh) { setResult(null); setResultDetailsOpen(false); }
    setLoading(true); setCandidates([]); setSearchCancelable(true); setSearchNotice('');
    if (isHistoryRefresh) setResultError(''); else setError('');
    const clean = input.ean ? { ean: normalizeEan(input.ean) } : { query: String(input.query || '').trim() };
    setPendingInput(clean);
    try {
      const read = input.historyId ? null : input.lotRead || (input.productId ? pendingLotRead.current : await captureLotRead(clean.ean || clean.query || ''));
      if (run !== consultationRunRef.current) return;
      pendingLotRead.current = read;
      // Um EAN já precificado é uma base da empresa: reapresentamos o cálculo
      // salvo antes de gastar tempo e crédito em uma nova pesquisa externa.
      if (clean.ean && !input.productId && !input.historyId) {
        setSearchIsLocal(true);
        const cached = await request('/api/modulos/marketplaces/precos/produto', { method: 'POST', signal: controller.signal, body: JSON.stringify({ empresaId: company.id, ean: clean.ean }) });
        if (run !== consultationRunRef.current) return;
        if (cached.result) { setResultFromCatalog(false); setResult(cached.result); setResultDetailsOpen(true); setCandidates([]); await resolveLotRead(read,cached.result.historyId); return; }
        setSearchIsLocal(false);
      }
      // Uma continuação apenas lê o mesmo task do Google Shopping; não repete
      // a identificação no Mercado Livre nem publica outra consulta cobrável.
      // A fila normal do provedor é assíncrona e pode ultrapassar o antigo
      // limite de seis leituras. Acompanhamos a MESMA tarefa por até três
      // minutos: não repetimos a identificação no Mercado Livre, não abrimos
      // uma segunda consulta cobrável e mantemos o resultado anterior visível.
      const priceContinuationDeadline = Date.now() + PRICE_CONTINUATION_TIMEOUT_MS;
      let continuation: unknown = null;
      while (run === consultationRunRef.current && Date.now() < priceContinuationDeadline) {
        const body = await request('/api/modulos/marketplaces/precos', {
          method: 'POST',
          signal: controller.signal,
          body: JSON.stringify(continuation
            ? { continuation }
            : { empresaId: company.id, connectionId: connectionId || undefined, ...clean, productId: input.productId, historyId: input.historyId, ...(input.historyId ? { refreshPrice: true } : {}) }),
        });
        const next = body.result as Consultation;
        if (run !== consultationRunRef.current) return;
        if (next.status === 'choose') { setCandidates(next.candidates || []); setError(''); return; }
        if (next.status === 'not_found') {
          setResult(null); setError('Produto não localizado. Confira o EAN ou tente pesquisar pela descrição na internet.');
          return;
        }
        setResult(next); setCandidates([]);
        if (clean.ean) setResultDetailsOpen(true);
        continuation = body.continuation;
        if (!continuation) {
          if (next.localProductId) {
            const local = await request('/api/modulos/marketplaces/precos/produto', { method: 'POST', signal: controller.signal, body: JSON.stringify({ empresaId: company.id, productId: next.localProductId }) });
            if (run !== consultationRunRef.current) return;
            if (local.result) setResult(local.result.prices?.market === next.prices?.market ? { ...local.result, sample: next.sample, notice: next.notice, consultedAt: next.consultedAt } : local.result);
          }
          await resolveLotRead(read,next.historyId);
          if (run !== consultationRunRef.current) return;
          if (next.prices) void loadHistory(company.id, controller.signal);
          return;
        }
        await waitForPriceSearch(PRICE_CONTINUATION_INTERVAL_MS, controller.signal);
      }
      if (run === consultationRunRef.current) {
        const message = 'O Google Shopping ainda não concluiu esta coleta. Nenhum valor foi alterado; tente novamente em alguns instantes.';
        if (isHistoryRefresh) setResultError(message); else setError(message);
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Não foi possível consultar o produto.';
      if (run === consultationRunRef.current) { setResultError(message); if (!isHistoryRefresh) setError(message); }
    }
    finally { clearTimeout(timeout); if (run === consultationRunRef.current) { consultationBusyRef.current=false; consultationAbortRef.current=null; setSearchCancelable(false); setLoading(false); } }
  }, [company, connectionId, loadHistory, request, captureLotRead, resolveLotRead, stockBusy]);

  const updateHistoryPrice = async (event: FormEvent) => {
    event.preventDefault();
    if (!company || !result || (!result.historyId && !result.localProductId) || priceSaveBusyRef.current || savingPrice || loading || stockBusy) return;
    priceSaveBusyRef.current=true;
    setSavingPrice(true); setError(''); setResultError('');
    try {
      const body = await request(result.localProductId ? '/api/modulos/marketplaces/precos/produto' : '/api/modulos/marketplaces/precos/historico', {
        method: 'PATCH',
        body: JSON.stringify({ empresaId: company.id, historyId: result.historyId, marketPrice: marketPriceDraft, ...(result.localProductId ? { action: 'edit', productId: result.localProductId, revision: result.localProductRevision, requestKey: crypto.randomUUID() } : {}) }),
      });
      const row = body.history as HistoryRow;
      setResult(body.result || historyToConsultation(row));
      void loadHistory(company.id);
    } catch (reason) { setResultError(`${reason instanceof Error ? reason.message : 'Não foi possível atualizar os cálculos.'} Reabra o produto para conferir o valor salvo antes de repetir.`); }
    finally { priceSaveBusyRef.current=false; setSavingPrice(false); }
  };

  const refreshProductPrice = async () => {
    if (!company || !result?.localProductId || loading || savingPrice || stockBusy || consultationBusyRef.current) return;
    setSearchIsLocal(false);
    consultationBusyRef.current = true; setLoading(true); setResultError('');
    setPriceResearchFeedback(null);
    const run = ++consultationRunRef.current;
    const controller = new AbortController(); consultationAbortRef.current = controller;
    setSearchCancelable(true); setSearchNotice('');
    try {
      const body = await request('/api/modulos/marketplaces/precos/produto', { method: 'PATCH', signal: AbortSignal.any([controller.signal,AbortSignal.timeout(65_000)]), body: JSON.stringify({ empresaId: company.id, action: 'research', productId: result.localProductId, revision: result.localProductRevision, requestKey: crypto.randomUUID() }) });
      if (run === consultationRunRef.current) {
        if (!body.result) throw new Error('A pesquisa terminou sem confirmar a referência do produto.');
        setResult(body.result);
        setPriceResearchFeedback({productId:result.localProductId,message:body.research?.message || body.result.notice || 'Pesquisa concluída. Referência conferida no servidor.'});
      }
    } catch (reason) { if (run === consultationRunRef.current) { const message=`${reason instanceof Error ? reason.message : 'Não foi possível atualizar o preço.'} Reabra o produto para conferir a referência antes de repetir.`;setResultError(message);setPriceResearchFeedback({productId:result.localProductId,message,error:true}); } }
    finally { if (run === consultationRunRef.current) { consultationBusyRef.current=false;consultationAbortRef.current=null;setSearchCancelable(false);setLoading(false); } }
  };

  const openPricedProducts = () => {
    if (!company || savingPrice || stockBusy) return;
    cancelPriceSearch(true); setResultDetailsOpen(false);
    setError(''); setResult(null); setResultFromCatalog(false); setHistorySearch(''); setHistorySort('alpha'); setCatalogWarehouseId('all'); setCatalogPage(1); setCatalogSearchRequested(true); setCatalogRefresh(value=>value+1); setPricedProducts([]); setCatalogTotal(0); setCatalogError(''); setPricedProductsOpen(true);
  };

  const searchCatalog = () => {
    if (!company || !query.trim() || savingPrice || stockBusy) return;
    cancelPriceSearch(true); setResult(null); setResultDetailsOpen(false);
    setHistorySearch(query.trim()); setCatalogPage(1); setCatalogSearchRequested(true); setCatalogRefresh(value => value + 1); setPricedProductsOpen(true);
  };

  const clearCatalogResults = () => {
    cancelPriceSearch(true); setPricedProductsOpen(true);
    setHistorySearch(''); setCatalogSearchRequested(true); setCatalogRefresh(value=>value+1); setPricedProducts([]); setCatalogTotal(0); setCatalogPage(1); setCatalogError(''); setPricedProductsLoading(false);
  };

  useEffect(()=>{
    const changed=(event:Event)=>{if((event as CustomEvent).detail?.companyId===company?.id)setCatalogRefresh(v=>v+1);};
    window.addEventListener(PRODUCT_STOCK_CHANGED,changed);return()=>window.removeEventListener(PRODUCT_STOCK_CHANGED,changed);
  },[company?.id]);

  const returnFromProduct = () => {
    const returnToCatalog=resultFromCatalog;
    cancelPriceSearch(true); setResult(null); setResultDetailsOpen(false); setResultError(''); setResultFromCatalog(false);
    if(returnToCatalog){setCatalogRefresh(v=>v+1);setPricedProductsOpen(true);}
  };

  const logout = async () => {
    try { localStorage.removeItem(SESSION_COMPANY_KEY); } catch {}
    await supabase.auth.signOut({ scope: 'local' });
    setCompany(null); setCompanies([]); setAccess('guest');
  };

  const startEanReading = () => {
    cancelPriceSearch(true); setResultDetailsOpen(false);
    consultationRunRef.current++;
    consultationAbortRef.current?.abort(); consultationAbortRef.current = null;
    setSearchCancelable(false); setSearchNotice('');
    consultationBusyRef.current = false;
    setLoading(false);
    setResultError('');
    setPricedProductsOpen(false);
    setEan('');
    setQuery('');
    setPendingInput({});
    setCandidates([]);
    setResult(null);
    setResultFromCatalog(false);
    setError('');
    setScannerIssue(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerIssue('error');
      setScannerOpen(true);
      return;
    }

    // A permissão nativa precisa nascer no gesto de "Ler EAN". Assim o PWA não
    // acrescenta uma confirmação própria antes do diálogo do sistema.
    void navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    }).then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
      setScannerOpen(true);
    }).catch((reason: unknown) => {
      const denied = reason instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(reason.name);
      setScannerIssue(denied ? 'denied' : 'error');
      setScannerOpen(true);
    });
  };


  if (access === 'loading') return <main className={styles.loginWrap} data-avantaprecos-viewport="access"><section className={styles.loadingStage} role="status" aria-live="polite"><Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={260} height={65} priority /><span /><p>Preparando seu acesso…</p></section></main>;
  if (access === 'guest') return <main className={styles.loginWrap} data-avantaprecos-viewport="access">
    <Image className={styles.brandLogo} src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={220} height={55} preload />
    <section className={styles.loginContent} aria-labelledby="avantaprecos-login-title"><div className={styles.loginCard}>
      <h1 id="avantaprecos-login-title">AvantaPreços</h1><p>Entre para consultar produtos e preços.</p>
      <form onSubmit={signIn}>
        <label htmlFor="price-login">Login</label><input id="price-login" value={login} onChange={(event) => setLogin(event.target.value)} autoCapitalize="none" autoComplete="username" placeholder="Digite seu login" />
        <label htmlFor="price-password">Senha</label><div className={styles.passwordField}><input id="price-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Digite sua senha" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'} aria-pressed={showPassword} title={showPassword ? 'Ocultar senha' : 'Exibir senha'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} /></button></div>
        {loginError && <p className={styles.loginError} role="alert">{loginError}</p>}
        <div className={styles.loginSubmitTarget}><button className={styles.loginSubmit} type="submit" disabled={loginLoading}>{loginLoading ? 'Entrando…' : 'Entrar'}</button></div>
      </form>
    </div><InstalarPwa nome="AvantaPreços" estado={instalacaoPwa}/></section>
  </main>;
  if (access === 'no-company') return <main className={styles.loginWrap} data-avantaprecos-viewport="access"><Image className={styles.brandLogo} src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={240} height={60} /><section className={`${styles.loginCard} ${styles.emptyAccessCard}`}><h1>Acesso não liberado</h1><p>Peça ao gestor da empresa para cadastrar seu usuário no módulo Marketplaces.</p><button type="button" onClick={() => void logout()}>Sair</button></section></main>;
  if (access === 'choose-company') return <main className={styles.loginWrap} data-avantaprecos-viewport="access">
    <Image className={styles.brandLogo} src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={230} height={58} priority />
    <section className={`${styles.loginCard} ${styles.companySelectionCard}`} aria-labelledby="company-selection-title">
      <h1 id="company-selection-title">Escolha a empresa</h1>
      <p>Selecione o perfil que será usado nesta sessão.</p>
      <div className={styles.companySelectionList}>{companies.map((item) => <button key={item.id} type="button" onClick={() => void selectCompany(item)}><strong>{item.nome}</strong><small>Abrir consulta de preços</small></button>)}</div>
      <button type="button" className={styles.companySelectionLogout} onClick={() => void logout()}>Sair</button>
    </section>
  </main>;

  return <div className={`${recebimentosStyles.page} ${styles.page} ${effectiveDark ? `${styles.dark} ${lotStyles.dark}` : ''}`} data-avantaprecos-viewport="ready">
    <ColaboradorTopbar nomeDoPerfil={(company?.nome || 'Perfil da empresa').toLocaleUpperCase('pt-BR')} descricaoDaOperacao="Consulta rápida de produtos e preços">
      <button type="button" className={`${recebimentosStyles.btn} ${recebimentosStyles.btnGhost} ${recebimentosStyles.btnSm}`} disabled={stockBusy} onClick={() => void logout()}>Sair</button>
    </ColaboradorTopbar>

    {!pricedProductsOpen&&!resultFromCatalog&&<section className={lotStyles.captureBar} aria-label="Lotes">
      <button type="button" disabled={loading||savingPrice||stockBusy} onClick={()=>setLotsPanel({create:true})}>Criar Lote</button>
      <button type="button" disabled={loading||savingPrice||stockBusy} onClick={()=>setLotsPanel({})}>Editar Lotes</button>
    </section>}
    {!pricedProductsOpen&&!resultFromCatalog&&lotCapture.active && <section className={lotStyles.activeLotBar} aria-label="Lote ativo">
      <strong>Lote {lotCapture.active.lot.name}</strong>
      <button type="button" disabled={loading||savingPrice||stockBusy} onClick={()=>setLotsPanel({id:lotCapture.active!.lot.id})} aria-label="Ver quantidade, totais e gerar PDF do lote"><span role="status">{lotTotals(lotCapture.active.items,lotCapture.active.lot.purchase_cost_cents).quantity} unidades</span> · Ver lote e totais</button>
      <button type="button" disabled={loading||savingPrice||stockBusy} onClick={()=>lotCapture.activate(null)}>Voltar ao modo comum</button>
    </section>}

    {removalNotice && <p className={styles.searchNotice} role="status">{removalNotice}<BotaoAcaoCompacto somenteIcone aria-label="Fechar aviso de remoção" onClick={()=>setRemovalNotice('')}>×</BotaoAcaoCompacto></p>}
    {resultDetailsOpen && result?.status === 'found' && result.product ? <section className={styles.resultPage} aria-labelledby="result-title">
      <nav className={styles.resultNavigation} aria-label="Navegação da consulta">
        <BotaoAcaoCompacto disabled={stockBusy || savingPrice} onClick={returnFromProduct}><Icon name="back" />Voltar</BotaoAcaoCompacto>
        <div className={styles.resultNavigationActions}><BotaoAcaoCompacto className={styles.newSearchButton} disabled={stockBusy || savingPrice} onClick={startEanReading}><Icon name="camera" />Nova pesquisa</BotaoAcaoCompacto><div className={styles.stockRefreshSlot} ref={setStockRefreshContainer}/></div>
      </nav>
      {searchCancelable && <PriceSearchProgress local={searchIsLocal} onCancel={() => cancelPriceSearch()} brand={priceSettings.settings?.profileColor}/>}
      {!loading && priceResearchFeedback && priceResearchFeedback.productId === result.localProductId && <p className={priceResearchFeedback.error ? styles.error : styles.searchNotice} role={priceResearchFeedback.error ? 'alert' : 'status'}>{priceResearchFeedback.message}</p>}
      {searchNotice && <p className={styles.searchNotice} role="status">{searchNotice}</p>}
      <article className={styles.resultCard}>
        {company && (result.historyId || result.localProductId) && <PriceProductStock compactSummary refreshContainer={stockRefreshContainer} key={`${company.id}:${result.historyId || result.localProductId}`} dark={effectiveDark} brand={priceSettings.settings?.profileColor} companyId={company.id} historyId={result.historyId} productId={result.localProductId} request={request} disabled={loading || savingPrice} onBusyChange={setStockBusy} onStockUpdated={onStockUpdated} onInternalNotesLoaded={onInternalNotesLoaded} onProductRemoved={()=>{setResult(null);setResultDetailsOpen(false);setResultError('');setError('');setCandidates([]);setPricedProducts([]);setCatalogPage(1);setCatalogRefresh(value=>value+1);setRemovalNotice('Produto removido da lista ativa. Histórico preservado quando existente.');void loadHistory(company.id);}} />}
        <div className={styles.productTop}>
          <div className={styles.productImage}>{result.product.image ? <img src={result.product.image} alt={`Imagem de ${result.product.name}`} /> : <Icon name="barcode" size={44} />}</div>
          <div><p className={styles.eyebrow}>Produto localizado</p><h1 id="result-title">{result.product.name}</h1>{result.ean && <p className={styles.ean}>EAN {result.ean}</p>}</div>
        </div>
        {(result.product.description || result.product.attributes?.some(attribute=>attribute.id!=='GTIN')) && <section className={styles.productFacts} aria-labelledby="product-facts-title"><div className={styles.productFactsHeading}><h2 id="product-facts-title">Características</h2><BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="características do produto" controlsId="product-facts-content" expandido={productFactsExpanded} onClick={()=>setProductFactsExpanded(value=>!value)} darkMode={effectiveDark} corPrimaria={priceSettings.settings?.profileColor}/></div><div id="product-facts-content" hidden={!productFactsExpanded}>{result.product.description && <p className={styles.description}>{result.product.description}</p>}<dl>{result.product.attributes?.filter(attribute=>attribute.id!=='GTIN').map(attribute=><div key={attribute.id}><dt>{attribute.name}</dt><dd>{attribute.value}</dd></div>)}</dl></div></section>}
        {!!result.product.sources?.length && <div className={styles.productFactSources}><span>Fontes da ficha:</span>{result.product.sources.map((url,index)=><a key={url} href={url} target="_blank" rel="noreferrer">Fonte {index+1}</a>)}</div>}
        {result.prices ? <><div className={styles.priceGrid}>
          <div className={styles.marketPrice}><span>{priceReferenceLabel(result.sample?.source)}</span><strong>{money.format(result.prices.market)}</strong></div>
          <div className={styles.minimumPrice}><span>Preço mínimo</span><strong>{money.format(result.prices.minimum)}</strong></div>
          <div className={styles.mediumPrice}><span>Preço médio de venda</span><strong>{money.format(result.prices.medium)}</strong></div>
          <div className={styles.idealPrice}><span>Preço ideal</span><strong>{money.format(result.prices.ideal)}</strong></div>
        </div><p className={styles.sampleNote}>{priceReferenceNote(result.sample?.source)}</p>
        {result.sample?.offers?.length ? <section className={styles.priceSources} aria-labelledby="price-sources-title"><h2 id="price-sources-title">Ofertas usadas no cálculo</h2><div>{result.sample.offers.map((offer) => <a key={`${offer.url}-${offer.price}`} href={offer.url} target="_blank" rel="noreferrer"><span><strong>{offer.seller}</strong><small>{offer.title}</small></span><b>{money.format(offer.price)}</b></a>)}</div></section> : null}</> : <section className={styles.assistedPrice} aria-labelledby="assisted-price-title">
          <h2 id="assisted-price-title">{loading ? 'Consultando preços' : searchNotice ? 'Pesquisa cancelada' : result.localProductId ? 'Produto cadastrado sem preço' : 'Preço indisponível'}</h2>
          <p role="status">{loading ? 'Estamos acompanhando a coleta de ofertas automaticamente.' : searchNotice ? 'Você pode iniciar uma nova pesquisa.' : result.localProductId ? 'Informe uma referência em Ajustar preço médio ou toque em Atualizar preço para pesquisar novamente.' : 'Não foram encontradas ofertas comparáveis para este produto neste momento.'}</p>
          {!loading && result.historyId && <button type="button" className={styles.secondaryButton} onClick={() => void consult({ historyId: result.historyId })}><Icon name="refresh" />Consultar novamente</button>}
        </section>}
        {result.referenceStatus && result.prices && !loading && <p className={styles.searchNotice} role="status">{result.referenceStatus === 'preserved' ? 'Referência anterior preservada e conferida no servidor.' : 'Referência salva e conferida no servidor.'}</p>}
        {result.notice && !loading && !searchNotice && !priceResearchFeedback && <p className={styles.sampleNote} role="status">{result.notice}</p>}
        {resultError && !priceResearchFeedback?.error && <p className={styles.error} role="alert">{resultError}</p>}
        {result.consultedAt && <p className={styles.consultedAt}>Preço pesquisado em {dateTime.format(new Date(result.consultedAt))}</p>}
        {((result.prices && result.historyId) || result.localProductId) && <form className={styles.manualPriceEdit} onSubmit={updateHistoryPrice}>
          <label htmlFor="history-market-price">Ajustar preço médio</label>
          <p>Altere a referência e atualize os três preços sugeridos.</p>
          <div><CampoMoeda id="history-market-price" value={marketPriceDraft} onChange={setMarketPriceDraft} placeholder="0,00" disabled={savingPrice || stockBusy} /><button type="submit" disabled={savingPrice || stockBusy}>{savingPrice ? 'Atualizando…' : 'Atualizar cálculos'}</button></div>
        </form>}
        <div className={styles.productResultActions}>
         {(result.localProductId || result.historyId) && <BotaoAcaoCompacto ref={searchTriggerRef} disabled={loading || savingPrice || stockBusy || (Boolean(result.localProductId) && !result.localProductRevision)} onClick={() => result.localProductId ? void refreshProductPrice() : void consult({ historyId: result.historyId })} aria-label={loading ? 'Calculando, aguarde' : 'Atualizar preço'}>{loading ? <><span className={styles.refreshingIcon} aria-hidden="true"><Icon name="refresh" /></span><span role="status" aria-live="polite">Calculando, aguarde…</span></> : <><Icon name="refresh" />Atualizar preço</>}</BotaoAcaoCompacto>}
         <BotaoAcaoCompacto variante="primario" disabled={loading||savingPrice||stockBusy||!priceSettings.settings||Boolean(result.localProductId||result.historyId)&&resultNotes===undefined} onClick={()=>setPostOpen(true)}>Criar post</BotaoAcaoCompacto>
        </div>
        {priceSettings.error&&<p role="alert" className={styles.error}>{priceSettings.error}<BotaoAcaoCompacto onClick={priceSettings.refresh}>Atualizar configurações</BotaoAcaoCompacto></p>}
        {postOpen&&company&&<ProductPost key={`${company.id}:${result.localProductId||result.historyId||result.product.id}`} product={{...result.product,internalNotes:resultNotes}} companyName={company.nome} request={request} storageScope={{companyId:company.id,...(result.localProductId?{productId:result.localProductId}:{historyId:result.historyId})}} referencePrice={result.prices?.market} primaryColor={priceSettings.settings?.profileColor} prices={result.prices?{minimum:result.prices.minimum,medium:result.prices.medium,ideal:result.prices.ideal}:undefined} dark={effectiveDark} onClose={()=>setPostOpen(false)} onBusyChange={setStockBusy}/>}
      </article>
    </section> : <div className={styles.content}>
      {pricedProductsOpen ? <section ref={catalogCard} data-marketplace-page-card="" className={styles.catalogWorkspace} aria-labelledby="priced-products-title">
        <div id="catalog-fixed-heading">
          <nav className={styles.catalogNavigation} aria-label="Pesquisa na base da empresa">
            <BotaoAcaoCompacto onClick={()=>{clearCatalogResults();cancelPriceSearch(true);}}><Icon name="back" />Voltar</BotaoAcaoCompacto>
            <CampoBusca value={historySearch} onChange={value=>{setHistorySearch(value);setCatalogPage(1);setCatalogSearchRequested(true);if(!value.trim())clearCatalogResults();}} aria-label="Pesquisar na base da empresa" placeholder="Nome, descrição ou EAN" maxLength={120} rotuloLimpar="Limpar pesquisa da base" />
          </nav>
          <header className={`${styles.resultCard} ${styles.catalogFixedHeader}`}>
            <div className={styles.catalogHeading}><div><p className={styles.eyebrow}>Base da empresa</p><h2 id="priced-products-title" tabIndex={-1}>Resultados da pesquisa</h2></div><BotaoAcaoCompacto onClick={clearCatalogResults}>Limpar resultados</BotaoAcaoCompacto></div>
            <div className={styles.catalogSort}><MobilePicker label="Visualizar produtos" value={catalogWarehouseId} disabled={catalogWarehousesLoading||loading||stockBusy} options={[{value:'all',label:'Todos'},...catalogWarehouses.map(w=>({value:w.id,label:w.name}))]} onChange={value=>{setCatalogWarehouseId(value);setCatalogPage(1);setCatalogSearchRequested(true);if(historySort==='with_stock'||historySort==='without_stock')setHistorySort('alpha');}} /></div>
            {catalogWarehouseError&&<p className={styles.error} role="alert">{catalogWarehouseError}<BotaoAcaoCompacto onClick={()=>setCatalogRefresh(v=>v+1)}>Tentar novamente</BotaoAcaoCompacto></p>}
            <div className={styles.catalogSort}><MobilePicker label="Ordenar produtos" value={historySort} options={[{ value: 'alpha', label: 'Ordem alfabética (A–Z)' }, { value: 'date', label: 'Última atualização' }, { value: 'created', label: 'Data de cadastro' }, { value: 'advertised', label: 'Anunciados' }, ...(catalogWarehouseId==='all'?[{ value: 'with_stock', label: 'Com estoque' }, { value: 'without_stock', label: 'Sem estoque' }]:[])]} onChange={value => { setHistorySort(value as typeof historySort); setCatalogPage(1);setCatalogSearchRequested(true); }} /></div>
          </header>
        </div>
        <div className={`${styles.resultCard} ${styles.catalogResultsCard}`}>
          <DetalhesRolaveis cabecalhoId="catalog-fixed-heading" rotulo="Lista de produtos da empresa">
            {catalogError && !catalogPending && <p className={styles.error} role="alert">{catalogError}<BotaoAcaoCompacto onClick={() => setCatalogRefresh(value => value + 1)}>Tentar novamente</BotaoAcaoCompacto></p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            {loading&&<PriceSearchProgress local onCancel={()=>{cancelPriceSearch(true);setPricedProductsOpen(true);}} brand={priceSettings.settings?.profileColor}/>}
            {!catalogSearchRequested ? <p className={styles.emptyHistory}>Digite acima para pesquisar somente na base da empresa.</p> : catalogPending ? <CarregamentoDadosModulo ativo variante="local" esqueletos titulo="Base da empresa" mensagem="Carregando produtos…" corPrimaria={priceSettings.settings?.profileColor} temaEscuro={effectiveDark} /> : pricedProducts.length ? <div className={styles.historyList}>{pricedProducts.map(item => <button type="button" key={item.id} disabled={loading || stockBusy} onClick={() => void openCatalogProduct(item)}><span className={styles.historyImage}>{item.pictures?.[0] ? <img src={item.pictures[0]} alt="" /> : <Icon name="barcode" />}</span><span className={styles.historyText}><strong>{item.name}</strong><small>{item.ean ? `EAN ${item.ean}` : 'EAN não informado'} · {catalogWarehouseId!=='all'?`${catalogWarehouses.find(w=>w.id===catalogWarehouseId)?.name||'Estoque'}: ${item.selected_stock_quantity==null?'Indisponível':`${item.selected_stock_quantity} un.`}`:item.allocations ? `Total: ${item.total_stock_quantity ?? item.allocations.reduce((total,w)=>total+(w.quantity ?? 0),0)}` : `Online: ${item.stock_quantity ?? 0}`}</small>{item.allocations&&<small>{item.allocations.map(w=>`${w.name}: ${w.quantity ?? 0}`).join(' · ')}</small>}</span><span className={styles.historyPrice}>{item.price_cents ? money.format(item.price_cents / 100) : 'Sem referência'}</span></button>)}</div> : !catalogError && <p className={styles.emptyHistory}>{catalogWarehouseId==='all'?'Nenhum produto corresponde à busca.':'Nenhum produto com saldo disponível neste estoque corresponde à busca.'}</p>}
            {catalogSearchRequested&&<nav className={styles.catalogPagination} aria-label="Páginas dos produtos"><BotaoAcaoCompacto disabled={catalogPending || catalogPage <= 1} onClick={() => changeCatalogPage(catalogPage - 1)}>Anterior</BotaoAcaoCompacto><span role="status">{catalogPending ? 'Consultando…' : catalogError ? 'Consulta indisponível' : `${catalogPage} de ${Math.max(1, Math.ceil(catalogTotal / 25))}`}</span><BotaoAcaoCompacto disabled={catalogPending || !!catalogError || catalogPage * 25 >= catalogTotal} onClick={() => changeCatalogPage(catalogPage + 1)}>Próxima</BotaoAcaoCompacto></nav>}
          </DetalhesRolaveis>
        </div>
      </section> : <>
      <section className={styles.manualCard} aria-labelledby="manual-title">
        <h2 id="manual-title">Consultar manualmente</h2>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); if (isValidEan(ean)) void consult({ ean }); }}>
          <label htmlFor="manual-ean">EAN / código de barras</label>
          <div className={styles.inputAction}><CampoBusca id="manual-ean" value={ean} onChange={value => setEan(normalizeEan(value))} inputMode="numeric" autoComplete="off" placeholder="Ex.: 7898996110321" rotuloLimpar="Limpar EAN" /><button type="submit" aria-label="Consultar EAN" disabled={!isValidEan(ean) || loading}><Icon name="search" /></button></div>
        </form>
        <div className={styles.divider}><span>ou</span></div>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); searchCatalog(); }}>
          <label htmlFor="product-query">Pesquisar produto</label>
          <div className={styles.inputAction}><CampoBusca id="product-query" value={query} onChange={setQuery} placeholder="Descrição ou EAN" aria-label="Buscar todos os produtos da empresa" rotuloLimpar="Limpar pesquisa por descrição" /><button type="submit" aria-label="Pesquisar produto" disabled={!query.trim() || loading}><Icon name="search" /></button></div>
          {query.trim().length >= 3 && <button ref={searchTriggerRef} type="button" className={styles.secondaryButton} disabled={loading || !connectionId} onClick={() => void consult(isValidEan(query) ? { ean: query } : { query })}>Pesquisar na internet</button>}
        </form>
        {(searchCancelable || pricedProductsOpen && catalogPending) ? <PriceSearchProgress onCancel={() => cancelPriceSearch()} brand={priceSettings.settings?.profileColor}/> : loading && <div className={styles.inlineLoading} role="status"><span />Pesquisando produtos…</div>}
        {searchNotice && <p className={styles.searchNotice} role="status">{searchNotice}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {result?.status === 'found' && result.product && <div className={styles.historyList}><button type="button" disabled={stockBusy || savingPrice} onClick={() => setResultDetailsOpen(true)} aria-label={`Ver detalhes de ${result.product!.name}`}><span className={styles.historyImage}>{result.product.image ? <img src={result.product.image} alt="" /> : <Icon name="barcode" />}</span><span className={styles.historyText}><strong>{result.product.name}</strong><small>{result.ean ? `EAN ${result.ean} · ` : ''}Ver detalhes do produto</small></span><Icon name="chevron" /></button></div>}
        <CatalogCandidateChooser aberto={candidates.length > 0} ean={pendingInput.ean} candidates={candidates} dark={effectiveDark} onClose={() => setCandidates([])} onChoose={(productId) => void consult({ ...pendingInput, productId })} />
      </section>

      <section className={styles.scanSection} aria-label="Ler EAN com a câmera">
        <div className={styles.scanActions}><PriceLabelReader key={company?.id} companyId={company?.id||''} request={request} dark={effectiveDark} brand={priceSettings.settings?.profileColor} disabled={loading||stockBusy||!company} className={`${styles.scanButton} ${styles.labelScanButton}`}/><button type="button" className={styles.scanButton} onClick={startEanReading} disabled={loading}><span><Icon name="camera" size={30} /></span><strong>Ler EAN</strong><small>Abrir câmera</small></button></div>
        {connectionStatus !== null && <p className={connectionStatus === 'connected' ? styles.connectionOk : styles.connectionAlert} role="status">{connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}</p>}
      </section>

      <button type="button" className={styles.allPricedProductsButton} onClick={openPricedProducts}>Ver produtos e estoque</button>

      <section className={styles.historySection} aria-labelledby="history-title">
        <div className={styles.sectionTitle}><span><Icon name="history" /><h2 id="history-title">Últimas consultas</h2></span><button type="button" onClick={() => company && void loadHistory(company.id)} aria-label="Atualizar histórico" title="Atualizar histórico" disabled={historyLoading}><Icon name="refresh" size={20} /></button></div>
        {historyLoading && !history.length ? <div className={styles.historySkeleton}><span /><span /><span /></div> : history.length ? <div className={styles.historyList}>{history.map((item) => <button type="button" key={item.id} onClick={() => openHistoryResult(item)}><span className={styles.historyImage}>{item.image_url ? <img src={item.image_url} alt="" /> : <Icon name="barcode" />}</span><span className={styles.historyText}><strong>{item.product_name}</strong><small>{item.ean ? `EAN ${item.ean}` : item.input_value} · Pesquisa: {dateTime.format(new Date(historyDate(item)))}</small></span><span className={styles.historyPrice}>{money.format(item.market_price_cents / 100)}</span></button>)}</div> : <p className={styles.emptyHistory}>Suas consultas aparecerão aqui.</p>}
      </section>
      </>}
    </div>}
    {scannerOpen && <ScannerModal initialEan={ean} issue={scannerIssue} onClose={() => setScannerOpen(false)} onConsult={(value) => { setEan(value); setScannerOpen(false); void consult({ ean: value }); }} />}
    {lotsPanel&&company&&<PriceLotsPanel dark={effectiveDark} key={company.id} companyId={company.id} request={request} initialId={lotsPanel.id} createInitially={lotsPanel.create} onClose={()=>setLotsPanel(null)} onActivate={lotCapture.activate} onUpdated={detail=>{if(lotCapture.active?.lot.id===detail.lot.id)lotCapture.activate(detail.lot.status==='open'?detail:null);}} onResolve={(item,lot)=>{setResult(null);setPricedProductsOpen(false);const input=isValidEan(item.scanned_code)?{ean:item.scanned_code}:{query:item.scanned_code};void consult({...input,lotRead:{companyId:company.id,lotId:lot.id,itemId:item.id}});}}/>}
  </div>;
}
