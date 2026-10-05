'use client';

import Image from 'next/image';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { isValidEan, normalizeEan } from '@/app/modules/marketplaces/services/ean';
import styles from './marketplaces-mobile.module.css';

type Company = { id: string; nome: string; perfil: string; [key: string]: unknown };
type Candidate = { id: string; name: string; picture: string | null };
type Consultation = {
  status: 'found' | 'not_found' | 'choose';
  ean: string | null;
  query: string | null;
  product?: { id: string; name: string; description: string; image: string | null; attributes: Array<{ id: string; name: string; value: string }> };
  candidates?: Candidate[];
  prices?: { market: number; minimum: number; medium: number; ideal: number };
  sample?: { count: number; minimum: number; maximum: number; source: 'active_offers' | 'catalog_reference' };
  notice?: string;
  historyId?: string;
  consultedAt?: string;
};
type HistoryRow = {
  id: string; ean: string | null; input_type: 'ean' | 'text'; input_value: string; provider_product_id: string;
  product_name: string; product_description: string | null; image_url: string | null; currency: string;
  market_price_cents: number; minimum_price_cents: number; medium_price_cents: number; ideal_price_cents: number;
  sample_count: number; sample_min_cents: number; sample_max_cents: number; sample_source: 'active_offers' | 'catalog_reference'; created_at: string;
};
type Account = { id: string; status: string; seller_name: string | null; seller_reference: string };

const SESSION_COMPANY_KEY = 'avantalab_marketplaces_mobile_empresa_id';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

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

function MobilePicker({ label, value, options, onChange }: {
  label: string;
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
    <button type="button" className={styles.pickerTrigger} aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
      <span>{selected?.label || 'Selecione'}</span><Icon name="chevron" size={17} />
    </button>
    {open && <div className={styles.pickerList} role="listbox" aria-label={label}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setOpen(false); }}><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</button>)}
    </div>}
  </div>;
}

function historyToConsultation(row: HistoryRow): Consultation {
  return {
    status: 'found', ean: row.ean, query: row.input_type === 'text' ? row.input_value : null,
    product: { id: row.provider_product_id, name: row.product_name, description: row.product_description || '', image: row.image_url, attributes: [] },
    prices: { market: row.market_price_cents / 100, minimum: row.minimum_price_cents / 100, medium: row.medium_price_cents / 100, ideal: row.ideal_price_cents / 100 },
    sample: { count: row.sample_count, minimum: row.sample_min_cents / 100, maximum: row.sample_max_cents / 100, source: row.sample_source },
    historyId: row.id, consultedAt: row.created_at,
  };
}

function ScannerModal({ initialEan, onClose, onConsult }: { initialEan: string; onClose: () => void; onConsult: (ean: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [ean, setEan] = useState(initialEan);
  const [state, setState] = useState<'opening' | 'reading' | 'read' | 'error'>('opening');
  const [message, setMessage] = useState('Abrindo a câmera…');

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        setState('error'); setMessage('A câmera não está disponível neste navegador. Digite o EAN abaixo.'); return;
      }
      try {
        const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser');
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 90, delayBetweenScanSuccess: 600 });
        reader.possibleFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (!result || cancelled) return;
            const value = normalizeEan(result.getText());
            if (!isValidEan(value)) return;
            controlsRef.current?.stop();
            setEan(value); setState('read'); setMessage('Código lido com sucesso');
            if ('vibrate' in navigator) navigator.vibrate?.(80);
          },
        );
        if (cancelled) controls.stop();
        else { controlsRef.current = controls; setState('reading'); setMessage('Centralize o código de barras no visor'); }
      } catch (error) {
        const denied = error instanceof DOMException && ['NotAllowedError', 'PermissionDeniedError'].includes(error.name);
        setState('error');
        setMessage(denied ? 'Permita o uso da câmera para ler o código ou digite o EAN abaixo.' : 'Não foi possível iniciar a câmera. Digite o EAN abaixo.');
      }
    };
    void start();
    return () => { cancelled = true; controlsRef.current?.stop(); controlsRef.current = null; };
  }, []);

  const valid = isValidEan(ean);
  return <div className={styles.scannerOverlay} role="dialog" aria-modal="true" aria-labelledby="scanner-title">
    <div className={styles.scannerTop}>
      <button type="button" className={styles.iconButtonLight} onClick={onClose} aria-label="Fechar leitor"><Icon name="back" /></button>
      <div><strong id="scanner-title">Ler código de barras</strong><span>{message}</span></div>
    </div>
    <div className={styles.cameraStage}>
      <video ref={videoRef} muted playsInline aria-label="Imagem da câmera para leitura do código" />
      <div className={styles.cameraShade} aria-hidden="true" />
      <div className={`${styles.scanWindow} ${state === 'read' ? styles.scanComplete : ''}`} aria-hidden="true">
        {state === 'read' ? <Icon name="check" size={36} /> : <span />}
      </div>
    </div>
    <div className={styles.scannerSheet}>
      <label htmlFor="scanner-ean">EAN encontrado</label>
      <input id="scanner-ean" value={ean} onChange={(event) => setEan(normalizeEan(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="Digite o EAN" />
      {!valid && ean && <p role="alert">Confira o código: o dígito verificador não é válido.</p>}
      <button type="button" className={styles.primaryButton} disabled={!valid} onClick={() => onConsult(ean)}>Consultar</button>
    </div>
  </div>;
}

export default function MarketplaceMobileApp() {
  const [access, setAccess] = useState<'loading' | 'guest' | 'choose-company' | 'ready' | 'no-company'>('loading');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [connectionId, setConnectionId] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ean, setEan] = useState('');
  const [query, setQuery] = useState('');
  const [pendingInput, setPendingInput] = useState<{ ean?: string; query?: string }>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [result, setResult] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

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
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(path, { ...options, cache: 'no-store', headers: { ...(options?.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(options?.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Não foi possível concluir a consulta.');
    return body;
  }, []);

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

  const loadHistory = useCallback(async (companyId: string) => {
    setHistoryLoading(true);
    try {
      const body = await request(`/api/modulos/marketplaces/precos/historico?empresaId=${encodeURIComponent(companyId)}`);
      setHistory(Array.isArray(body.history) ? body.history : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o histórico.'); }
    finally { setHistoryLoading(false); }
  }, [request]);

  useEffect(() => {
    if (!company?.id) return;
    setAccounts([]); setConnectionId(''); setConnectionMessage(''); setHistory([]); setResult(null); setCandidates([]); setError('');
    void (async () => {
      try {
        const body = await request(`/api/modulos/marketplaces/precos/contexto?empresaId=${encodeURIComponent(company.id)}`);
        const connected = (Array.isArray(body.accounts) ? body.accounts : []).filter((account: Account) => account.status === 'connected');
        setAccounts(connected); setConnectionId(connected[0]?.id || '');
        if (!connected.length) setConnectionMessage('O Mercado Livre ainda não está conectado nesta empresa. Conecte-o no módulo Anúncios em marketplaces.');
        await loadHistory(company.id);
      } catch (reason) { setConnectionMessage(reason instanceof Error ? reason.message : 'Não foi possível validar a integração.'); }
    })();
  }, [company?.id, loadHistory, request]);

  const consult = useCallback(async (input: { ean?: string; query?: string; productId?: string }) => {
    if (!company) return;
    setLoading(true); setError(''); setCandidates([]);
    const clean = input.ean ? { ean: normalizeEan(input.ean) } : { query: String(input.query || '').trim() };
    setPendingInput(clean);
    try {
      const body = await request('/api/modulos/marketplaces/precos', { method: 'POST', body: JSON.stringify({ empresaId: company.id, connectionId: connectionId || undefined, ...clean, productId: input.productId }) });
      const next = body.result as Consultation;
      if (next.status === 'choose') { setCandidates(next.candidates || []); setError(''); }
      else if (next.status === 'not_found') { setResult(null); setError(next.notice || 'Produto não localizado.'); }
      else { setResult(next); setCandidates([]); await loadHistory(company.id); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível consultar o produto.'); }
    finally { setLoading(false); }
  }, [company, connectionId, loadHistory, request]);

  const logout = async () => {
    try { localStorage.removeItem(SESSION_COMPANY_KEY); } catch {}
    await supabase.auth.signOut({ scope: 'local' });
    setCompany(null); setCompanies([]); setAccess('guest');
  };

  const startEanReading = () => {
    setEan('');
    setQuery('');
    setPendingInput({});
    setCandidates([]);
    setResult(null);
    setError('');
    setScannerOpen(true);
  };

  if (access === 'loading') return <main className={styles.loadingScreen}><Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={260} height={65} priority /><span /><p>Preparando seu acesso…</p></main>;
  if (access === 'guest') return <main className={styles.loginScreen}>
    <Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={220} height={55} preload />
    <section className={styles.loginCard} aria-labelledby="avantaprecos-login-title">
      <h1 id="avantaprecos-login-title">AvantaPreços</h1><p>Entre para consultar produtos e preços.</p>
      <form onSubmit={signIn}>
        <label htmlFor="price-login">Login</label><input id="price-login" value={login} onChange={(event) => setLogin(event.target.value)} autoCapitalize="none" autoComplete="username" placeholder="Digite seu login" />
        <label htmlFor="price-password">Senha</label><div className={styles.passwordField}><input id="price-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Digite sua senha" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'} aria-pressed={showPassword} title={showPassword ? 'Ocultar senha' : 'Exibir senha'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={20} /></button></div>
        {loginError && <p className={styles.loginError} role="alert">{loginError}</p>}
        <div className={styles.loginSubmitTarget}><button className={styles.loginSubmit} type="submit" disabled={loginLoading}>{loginLoading ? 'Entrando…' : 'Entrar'}</button></div>
      </form>
    </section>
  </main>;
  if (access === 'no-company') return <main className={styles.emptyAccess}><Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={240} height={60} /><h1>Acesso não liberado</h1><p>Peça ao gestor da empresa para cadastrar seu usuário no módulo Marketplaces.</p><button type="button" onClick={() => void logout()}>Sair</button></main>;
  if (access === 'choose-company') return <main className={styles.companySelection}>
    <Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab" width={230} height={58} priority />
    <section className={styles.companySelectionCard} aria-labelledby="company-selection-title">
      <h1 id="company-selection-title">Escolha a empresa</h1>
      <p>Selecione o perfil que será usado nesta sessão.</p>
      <div className={styles.companySelectionList}>{companies.map((item) => <button key={item.id} type="button" onClick={() => void selectCompany(item)}><strong>{item.nome}</strong><small>Abrir consulta de preços</small></button>)}</div>
      <button type="button" className={styles.companySelectionLogout} onClick={() => void logout()}>Sair</button>
    </section>
  </main>;

  return <main className={styles.app}>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brand}><strong>{company?.nome || 'Perfil da empresa'}</strong><span>Consulta rápida de produtos e preços</span></div>
        <button type="button" className={styles.logoutButton} onClick={() => void logout()}>Sair</button>
      </div>
    </header>

    {result?.status === 'found' && result.product && result.prices ? <section className={styles.resultPage} aria-labelledby="result-title">
      <button type="button" className={styles.backButton} onClick={() => setResult(null)}><Icon name="back" /> Nova consulta</button>
      <article className={styles.resultCard}>
        <div className={styles.productTop}>
          <div className={styles.productImage}>{result.product.image ? <img src={result.product.image} alt={`Imagem de ${result.product.name}`} /> : <Icon name="barcode" size={44} />}</div>
          <div><p className={styles.eyebrow}>Produto localizado</p><h1 id="result-title">{result.product.name}</h1>{result.ean && <p className={styles.ean}>EAN {result.ean}</p>}</div>
        </div>
        {result.product.description && <p className={styles.description}>{result.product.description}</p>}
        <div className={styles.priceGrid}>
          <div className={styles.marketPrice}><span>Preço médio Mercado Livre</span><strong>{money.format(result.prices.market)}</strong></div>
          <div className={styles.minimumPrice}><span>Preço mínimo</span><small>50% do preço médio</small><strong>{money.format(result.prices.minimum)}</strong></div>
          <div className={styles.mediumPrice}><span>Preço médio de venda</span><small>70% do preço médio</small><strong>{money.format(result.prices.medium)}</strong></div>
          <div className={styles.idealPrice}><span>Preço ideal</span><small>90% do preço médio</small><strong>{money.format(result.prices.ideal)}</strong></div>
        </div>
        {result.sample && <p className={styles.sampleNote}>{result.sample.count} {result.sample.count === 1 ? 'referência considerada' : 'referências consideradas'} · faixa de {money.format(result.sample.minimum)} a {money.format(result.sample.maximum)}</p>}
        {result.consultedAt && <p className={styles.consultedAt}>Consultado em {dateTime.format(new Date(result.consultedAt))}</p>}
        <button type="button" className={styles.secondaryButton} disabled={loading} onClick={() => void consult({ ...(result.ean ? { ean: result.ean } : { query: result.query || result.product!.name }), productId: result.product!.id })}><Icon name="refresh" />{loading ? 'Atualizando…' : 'Consultar novamente'}</button>
      </article>
    </section> : <div className={styles.content}>
      <section className={styles.hero} aria-labelledby="marketplace-mobile-title">
        <p className={styles.eyebrow}>Consulta rápida</p><h1 id="marketplace-mobile-title">Qual é o preço?</h1><p>Leia o código do produto e compare em poucos segundos.</p>
        <button type="button" className={styles.scanButton} onClick={startEanReading} disabled={!connectionId || loading}><span><Icon name="camera" size={34} /></span><strong>Ler EAN</strong><small>Abrir câmera</small></button>
        {connectionMessage ? <p className={styles.connectionAlert} role="alert">{connectionMessage}</p> : <p className={styles.connectionOk}><span /> Mercado Livre conectado{accounts.length > 1 ? ` em ${accounts.length} contas` : ''}</p>}
        {accounts.length > 1 && <div className={styles.accountPicker}><MobilePicker label="Conta usada na consulta" value={connectionId} options={accounts.map((account) => ({ value: account.id, label: account.seller_name || account.seller_reference, detail: `ID ${account.seller_reference}` }))} onChange={setConnectionId} /></div>}
      </section>

      <section className={styles.manualCard} aria-labelledby="manual-title">
        <h2 id="manual-title">Consultar manualmente</h2>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); if (isValidEan(ean)) void consult({ ean }); }}>
          <label htmlFor="manual-ean">EAN / código de barras</label>
          <div className={styles.inputAction}><input id="manual-ean" value={ean} onChange={(event) => setEan(normalizeEan(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="Ex.: 7898996110321" /><button type="submit" aria-label="Consultar EAN" disabled={!isValidEan(ean) || loading || !connectionId}><Icon name="search" /></button></div>
        </form>
        <div className={styles.divider}><span>ou</span></div>
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); if (query.trim().length >= 3) void consult({ query }); }}>
          <label htmlFor="product-query">Pesquisar produto</label>
          <div className={styles.inputAction}><input id="product-query" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" placeholder="Nome, marca ou modelo" /><button type="submit" aria-label="Pesquisar produto" disabled={query.trim().length < 3 || loading || !connectionId}><Icon name="search" /></button></div>
        </form>
        {loading && <div className={styles.inlineLoading} role="status"><span />Pesquisando no Mercado Livre…</div>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {candidates.length > 0 && <div className={styles.candidates}><h3>Selecione o produto</h3>{candidates.map((candidate) => <button key={candidate.id} type="button" onClick={() => void consult({ ...pendingInput, productId: candidate.id })}>{candidate.picture ? <img src={candidate.picture} alt="" /> : <span className={styles.candidateFallback}><Icon name="barcode" /></span>}<span><strong>{candidate.name}</strong><small>{candidate.id}</small></span></button>)}</div>}
      </section>

      <section className={styles.historySection} aria-labelledby="history-title">
        <div className={styles.sectionTitle}><span><Icon name="history" /><h2 id="history-title">Últimas consultas</h2></span><button type="button" onClick={() => company && void loadHistory(company.id)} aria-label="Atualizar histórico" title="Atualizar histórico" disabled={historyLoading}><Icon name="refresh" size={20} /></button></div>
        {historyLoading && !history.length ? <div className={styles.historySkeleton}><span /><span /><span /></div> : history.length ? <div className={styles.historyList}>{history.map((item) => <button type="button" key={item.id} onClick={() => setResult(historyToConsultation(item))}><span className={styles.historyImage}>{item.image_url ? <img src={item.image_url} alt="" /> : <Icon name="barcode" />}</span><span className={styles.historyText}><strong>{item.product_name}</strong><small>{item.ean ? `EAN ${item.ean}` : item.input_value} · {dateTime.format(new Date(item.created_at))}</small></span><span className={styles.historyPrice}>{money.format(item.market_price_cents / 100)}</span></button>)}</div> : <p className={styles.emptyHistory}>Suas consultas aparecerão aqui.</p>}
      </section>
    </div>}
    {scannerOpen && <ScannerModal initialEan={ean} onClose={() => setScannerOpen(false)} onConsult={(value) => { setEan(value); setScannerOpen(false); void consult({ ean: value }); }} />}
  </main>;
}
