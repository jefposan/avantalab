'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import TelaCarregandoAcesso from '@/app/components/TelaCarregandoAcesso';
import ModuloHeader from '@/app/components/ModuloHeader';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { MarketplaceLiveMonitor } from '@/app/components/MarketplaceLiveMonitor';
import AvantaKanban from '@/app/components/AvantaKanban';
import Tooltip from '@/app/components/Tooltip';
import AuthorizationRenewal from './AuthorizationRenewal';
import usePanelOrder from './usePanelOrder';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import { consumirNavegacaoModulo, solicitarRetornoAoModuloHospedeiro, type ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { supabase } from '@/app/lib/supabase';
import styles from './marketplaces.module.css';
import Anunciados, { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import NewListing, { type ListingCopyRequest } from './NewListing';
import ProductsStock from './ProductsStock';
import PriceUsersPanel from './PriceUsersPanel';
import Vendas from './Vendas';
import SalesFilters, { monthPeriod } from './SalesFilters';
import { saleGroup, salesInPeriod, salesSummary, type SaleGroup } from '@/app/modules/marketplaces/sales-status';
import type { MarketplaceSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import { inventoryIssueMessage, type MarketplaceLiveFeed } from '@/app/modules/marketplaces/live-feed';
import { createPassiveRefresh } from './passive-refresh';
import { Icon } from '@/app/projetos/components/Icon';

const providers: Array<{ id: MarketplaceId; name: string; available: boolean }> = [
  { id: 'mercado_livre', name: 'Mercado Livre', available: true },
  { id: 'shopee', name: 'Shopee', available: false },
  { id: 'tiktok_shop', name: 'TikTok Shop', available: false },
  { id: 'magalu', name: 'Magalu', available: false },
  { id: 'casas_bahia', name: 'Casas Bahia', available: false },
  { id: 'amazon', name: 'Amazon', available: false },
];

export default function MarketplacesClient({ companyId, initialContext, connectionStatus, connectionMessage }: { companyId: string; initialContext: ContextoNavegacaoModulo | null; connectionStatus?: string; connectionMessage?: string }) {
  const router = useRouter();
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
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [canManageConnections, setCanManageConnections] = useState(false);
  const [accountSelectionLocked, setAccountSelectionLocked] = useState(false);
  const [publicationBusy, setPublicationBusy] = useState(false);
  const [copyRequest, setCopyRequest] = useState<ListingCopyRequest | null>(null);
  const [connectionNotice, setConnectionNotice] = useState(() => connectionStatus === 'error' ? connectionMessage || 'Não foi possível conectar a conta do Mercado Livre.' : '');
  const [priceUsersOpen, setPriceUsersOpen] = useState(false);
  const [priceLinkStatus, setPriceLinkStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [disconnectAccount, setDisconnectAccount] = useState<MarketplaceAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [renewAccount, setRenewAccount] = useState<MarketplaceAccount | null>(null);
  const [sales, setSales] = useState<MarketplaceSale[]>([]);
  const [salesSnapshot, setSalesSnapshot] = useState<MarketplaceSale[]>([]);
  const [backgroundRefresh, setBackgroundRefresh] = useState(0);
  const [updatesAvailable, setUpdatesAvailable] = useState(false);
  const [inventorySnapshot, setInventorySnapshot] = useState<MarketplaceLiveFeed | null>(null);
  type SalesData = { sales: MarketplaceSale[]; awaitingUpdates: number };
  const salesReader = useRef<ReturnType<typeof createPassiveRefresh<SalesData>> | null>(null);
  const [liveFeed, setLiveFeed] = useState<MarketplaceLiveFeed | null>(null);
  const [liveUnavailable, setLiveUnavailable] = useState(false);
  const liveVersion = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    liveVersion.current = undefined;
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ companyId: string; feed?: MarketplaceLiveFeed; unavailable?: boolean }>).detail;
      if (detail?.companyId !== companyId) return;
      setLiveUnavailable(Boolean(detail.unavailable));
      if (!detail.feed) return;
      setLiveFeed(detail.feed);
      setInventorySnapshot(current => current ?? detail.feed!);
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
  const [awaitingUpdates, setAwaitingUpdates] = useState(0);
  const [salesAccount, setSalesAccount] = useState('');
  const [salesExpanded, setSalesExpanded] = useState(true);
  const [salesGroup, setSalesGroup] = useState<SaleGroup | ''>('');
  const [salesPeriod, setSalesPeriod] = useState(() => monthPeriod(new Date().getFullYear(), new Date().getMonth()));
  const updateSale = useCallback((updated: MarketplaceSale) => {
    setSales((current) => current.map((sale) => sale.id === updated.id && sale.connectionId === updated.connectionId ? updated : sale));
  }, []);
  const oauthWindow = useRef<Window | null>(null);
  const returnHref = `/gestao?empresaId=${encodeURIComponent(companyId)}`;
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === marketplace)!, [marketplace]);
  const loadAccounts = useCallback((available: MarketplaceAccount[], canManageConnection: boolean) => {
    setAccounts(available);
    setCanManageConnections(canManageConnection);
    setSelectedAccount((current) => {
      if (available.some((account) => account.id === current && account.status === 'connected')) return current;
      const connected = available.filter((account) => account.status === 'connected');
      return connected[0]?.id || '';
    });
  }, []);

  const refreshConnections = useCallback(async () => {
    const data = await marketplaceClientRequest(`conexoes?empresaId=${encodeURIComponent(companyId)}`, undefined, AbortSignal.timeout(15_000)) as { accounts: MarketplaceAccount[]; canConnect: boolean };
    loadAccounts(data.accounts, data.canConnect);
  }, [companyId, loadAccounts]);

  const completeAccountRenewal = useCallback((updated: MarketplaceAccount) => {
    setAccounts((current) => current.map((account) => account.id === updated.id ? updated : account));
    setRenewAccount((current) => current?.id === updated.id ? updated : current);
    setSelectedAccount((current) => current || updated.id);
    setConnectionNotice('');
  }, []);

  async function updateConnections() {
    if (connectionsRefreshing) return;
    setConnectionsRefreshing(true);
    setConnectionNotice('');
    try {
      await refreshConnections();
      setRefreshKey((value) => value + 1);
      setConnectionNotice('Lista de contas atualizada.');
    } catch (error) {
      setConnectionNotice(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
        ? 'A consulta demorou mais que o esperado. Tente novamente.'
        : error instanceof Error ? error.message : 'Não foi possível atualizar as contas. Tente novamente.');
    } finally { setConnectionsRefreshing(false); }
  }

  const connectedAccounts = accounts.filter((account) => account.status === 'connected');
  const renewableAccounts = accounts.filter((account) => ['connected', 'expired', 'attention'].includes(account.status));
  const accountSignature = connectedAccounts.map((account) => account.id).sort().join(',');
  const periodSales = useMemo(() => salesInPeriod(sales, salesPeriod), [sales, salesPeriod]);
  const summary = useMemo(() => salesSummary(periodSales, salesGroup), [periodSales, salesGroup]);
  const pendingSales = summary.byConnection;
  const pendingSalesTotal = summary.filteredTotal;
  const visibleSales = useMemo(() => salesInPeriod(salesSnapshot, salesPeriod).filter((sale) => (!salesGroup || saleGroup(sale) === salesGroup) && (!salesAccount || sale.connectionId === salesAccount)), [salesSnapshot, salesPeriod, salesGroup, salesAccount]);

  useEffect(() => {
    if (accessState !== 'ready') return;
    const reader = createPassiveRefresh<SalesData>({
      read: signal => marketplaceClientRequest(`vendas?empresaId=${encodeURIComponent(companyId)}&scope=all`, undefined, signal),
      onLatest: data => setSales(data.sales || []),
      onVisible: data => { setSalesSnapshot(data.sales || []); setAwaitingUpdates(data.awaitingUpdates || 0); },
      onLoading: loading => { setSalesLoading(loading); if (loading) setSalesError(''); },
      onError: error => setSalesError(error instanceof Error ? error.message : 'Não foi possível carregar as vendas.'),
    });
    salesReader.current = reader;
    void reader.manual();
    return () => { reader.stop(); if (salesReader.current === reader) salesReader.current = null; };
  }, [accessState, companyId, accountSignature]);
  useEffect(() => { if (refreshKey || salesRefresh) void salesReader.current?.manual(); }, [refreshKey, salesRefresh]);
  useEffect(() => { if (backgroundRefresh) void salesReader.current?.background(); }, [backgroundRefresh]);

  useEffect(() => {
    if (salesAccount && !accountSignature.split(',').includes(salesAccount)) setSalesAccount('');
  }, [accountSignature, salesAccount]);

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
      if (context?.empresa.logoUrl) return;
      const needsAccessValidation = !context;
      if (needsAccessValidation) {
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
        if (needsAccessValidation) setAccessState('ready');
      } catch (error) {
        if (controller.signal.aborted) return;
        // A prévia interna já liberou a tela; se a leitura complementar da
        // marca falhar, preservamos a navegação e tentamos novamente no acesso
        // seguinte, em vez de substituir a tela por um erro de identidade.
        if (!needsAccessValidation) return;
        setAccessError(error instanceof Error ? error.message : 'Não foi possível abrir este módulo.');
        setAccessState('error');
      }
    }
    void loadIdentity();
    return () => controller.abort();
  }, [companyId, context]);

  useEffect(() => {
    if (accessState !== 'ready') return;
    void refreshConnections().catch((error) => setConnectionNotice(error instanceof Error ? error.message : 'Não foi possível carregar as contas conectadas.'));
  }, [accessState, refreshConnections]);

  useEffect(() => {
    const receiveAuthorization = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || !event.data || typeof event.data !== 'object') return;
      const data = event.data as { type?: string; provider?: string; empresaId?: string; status?: string; message?: string; renewal?: boolean };
      if (data.type !== 'avantalab-marketplace-oauth' || data.provider !== 'mercado_livre' || data.empresaId !== companyId) return;
      if (data.renewal) return; // Renovação é confirmada pela solicitação autenticada, não pela mensagem da janela.
      oauthWindow.current = null;
      setConnecting(false);
      if (data.status === 'connected') {
        setConnectionNotice('Conta conectada. Atualizando a lista de contas…');
        void refreshConnections().then(() => setConnectionNotice('Conta conectada com sucesso.')).catch((error) => setConnectionNotice(error instanceof Error ? error.message : 'A conta foi conectada, mas a lista ainda não foi atualizada.'));
      } else {
        setConnectionNotice(data.message || 'Não foi possível concluir a conexão. Tente novamente.');
      }
    };
    window.addEventListener('message', receiveAuthorization);
    return () => window.removeEventListener('message', receiveAuthorization);
  }, [companyId, refreshConnections]);

  useEffect(() => {
    if (!connecting || !oauthWindow.current) return;
    const timer = window.setInterval(() => {
      if (oauthWindow.current?.closed) {
        oauthWindow.current = null;
        setConnecting(false);
      }
    }, 400);
    return () => window.clearInterval(timer);
  }, [connecting]);

  useEffect(() => {
    if (priceLinkStatus !== 'copied') return;
    const timer = window.setTimeout(() => setPriceLinkStatus('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [priceLinkStatus]);

  function voltar() {
    if (!solicitarRetornoAoModuloHospedeiro()) router.push(returnHref);
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
    if (marketplace !== 'mercado_livre' || connecting || !companyId) return;
    // A abertura acontece no gesto de clique para evitar bloqueio de popup e manter a tela atual intacta.
    const popup = window.open('', 'avantalab-mercado-livre-oauth', 'popup=yes,width=560,height=760,resizable=yes,scrollbars=yes');
    if (popup) {
      oauthWindow.current = popup;
      popup.document.title = 'Conectando Mercado Livre';
    }
    setConnecting(true);
    setConnectionNotice('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sua sessão não está disponível. Volte à Gestão e entre novamente.');
      const response = await fetch('/api/modulos/marketplaces/conexoes/mercado-livre/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ empresaId: companyId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authorizationUrl) throw new Error(payload.message || 'Não foi possível iniciar a conexão.');
      if (popup && !popup.closed) popup.location.replace(payload.authorizationUrl);
      else window.location.assign(payload.authorizationUrl);
    } catch (error) {
      if (popup && !popup.closed) popup.close();
      oauthWindow.current = null;
      setConnectionNotice(error instanceof Error ? error.message : 'Não foi possível iniciar a conexão.');
      setConnecting(false);
    }
  }

  if (accessState === 'loading') {
    return <TelaCarregandoAcesso titulo="Validando acesso" mensagem="Confirmando o módulo e seu perfil…" />;
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

  return <main className={`${styles.page} ${empresa.temaEscuro ? styles.dark : ''}`} style={{ '--marketplace-brand': empresa.corPrimaria } as CSSProperties}>
    <MarketplaceLiveMonitor key={companyId} companyId={companyId} brand={empresa.corPrimaria} dark={empresa.temaEscuro} />
    <ModuloHeader empresa={empresa} onBack={voltar} className={styles.salesHeader} returnTooltip="Voltar à Gestão" returnTooltipPosition="bottom">
      <SalesFilters period={salesPeriod} onPeriodChange={period => { setSalesSnapshot(sales); setSalesPeriod(period); }} group={salesGroup} onGroupChange={group => { setSalesSnapshot(sales); setSalesGroup(group); }} counts={summary.byGroup} total={summary.total} dark={empresa.temaEscuro} brand={empresa.corPrimaria} />
      <Tooltip posicao="bottom" texto="Atualizar anuncios">
        <button type="button" className={`${styles.settingsButton} ${styles.backgroundUpdateControl}`} disabled={salesLoading || accountSelectionLocked || publicationBusy} aria-label={updatesAvailable || liveUnavailable ? 'Atualizar novidades de anúncios e vendas' : 'Atualizar listas de anúncios e vendas'} onClick={() => { setInventorySnapshot(liveFeed); setUpdatesAvailable(false); setRefreshKey(value => value + 1); }}>
          <Icon name="refresh" size={20} />
          {(updatesAvailable || liveUnavailable) && <span className={styles.backgroundUpdateDot} aria-hidden="true" />}
        </button>
      </Tooltip>
      <Tooltip texto="Ver vendas do período selecionado" posicao="bottom"><button type="button" className={styles.salesNotification} onClick={() => { setSalesExpanded(true); setSalesAccount(''); document.getElementById('sales-title')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); setSalesSnapshot(sales); }} aria-label={`${pendingSalesTotal} vendas nos filtros selecionados. Ver todas as contas.`} aria-busy={salesLoading}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{pendingSalesTotal > 0 && <b>{pendingSalesTotal}</b>}
      </button></Tooltip>
    </ModuloHeader>
    <div className={styles.content}>
    <section className={styles.hero} aria-labelledby="module-title">
      <div><p className={styles.eyebrow}>Conexão e gestão</p><h1 id="module-title">Anúncios em marketplaces</h1></div>
      <div className={styles.heroActions}>
        {canManage && <button type="button" className={styles.settingsButton} onClick={() => setPriceUsersOpen(true)} aria-label="Gerenciar usuários do AvantaPreços" title="Usuários do AvantaPreços"><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3V9.6h.1A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.36.72.66 1 .3.27.68.4 1.08.4H21v4h-.1A1.7 1.7 0 0 0 19.4 15Z"/></svg></button>}
        <div className={styles.copyPriceLinkControl}>
          <button type="button" className={`${styles.marketplaceMobileLink} ${priceLinkStatus === 'copied' ? styles.marketplaceMobileLinkCopied : ''}`} onClick={() => void copyPriceLink()} aria-live="polite">
            {priceLinkStatus === 'copied' ? 'Link copiado' : 'Copiar link do AvantaPreços'}
          </button>
          {priceLinkStatus === 'error' && <small role="alert">Não foi possível copiar. Tente novamente.</small>}
        </div>
      </div>
    </section>

    <section className={styles.grid} aria-label="Configuração de publicação">
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><h2>Marketplace</h2></div></div>
        <div className={styles.providerGrid}>
          {providers.map((provider) => <button key={provider.id} type="button" disabled={!provider.available} className={`${styles.provider} ${marketplace === provider.id ? styles.providerSelected : ''}`} onClick={() => setMarketplace(provider.id)} aria-pressed={marketplace === provider.id}>
            <strong>{provider.name}</strong>{!provider.available && <small>Em breve</small>}
          </button>)}
        </div>
        <div className={styles.connectionNotice}>
          {selectedProvider.available && <div className={styles.connectionGeneralActions}>
            <button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton} ${styles.renewalPrimary}`} disabled={connecting || connectionsRefreshing || !companyId || !canManageConnections} onClick={() => void connectMarketplace()} aria-describedby={connectedAccounts.length ? 'connect-another-account-help' : undefined}>{connecting ? 'Abrindo Mercado Livre…' : connectedAccounts.length ? 'Conectar outra conta' : 'Conectar conta'}</button>
            <Tooltip texto="Recarregar a lista de todas as contas desta empresa; não renova autorizações nem consulta reclamações"><button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={connecting || connectionsRefreshing || disconnecting || accountSelectionLocked || publicationBusy || !companyId} onClick={() => void updateConnections()}>{connectionsRefreshing ? 'Atualizando…' : 'Atualizar contas'}</button></Tooltip>
          </div>}
          {connectedAccounts.length > 0 && <p id="connect-another-account-help" className={styles.connectionHelp}>As contas já conectadas serão mantidas. Para autorizar outra, saia da conta atual do Mercado Livre neste navegador ou use uma janela anônima.</p>}
          {connectionNotice && <p className={styles.connectionMessage} role="alert">{connectionNotice}</p>}
        </div>
        {marketplace === 'mercado_livre' && <div className={styles.connectedAccounts} aria-labelledby="connected-accounts-title">
          <div className={styles.connectedAccountsHeading}><h3 id="connected-accounts-title">Contas conectadas</h3><span>{connectedAccounts.length}</span></div>
          {renewableAccounts.length ? <div className={styles.connectedAccountsList}>{renewableAccounts.map((account) => <article key={account.id} className={`${styles.connectedAccount} ${account.id === selectedAccount ? styles.connectedAccountSelected : ''}`}>
            <button type="button" className={styles.connectedAccountSelect} onClick={() => { setSelectedAccount(account.id); setSalesAccount(account.id); }} disabled={accountSelectionLocked || publicationBusy} aria-pressed={account.id === selectedAccount}>
              <strong>{account.seller_name || `Vendedor ${account.seller_reference}`}{pendingSales[account.id] ? <em className={styles.accountSalesBadge} title="Vendas nos filtros selecionados">{pendingSales[account.id]}</em> : null}</strong><small>ID {account.seller_reference} · {account.status === 'connected' ? 'Conectada' : account.status === 'expired' ? 'Autorização expirada' : 'Requer atenção'}<br />Última sincronização: {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString('pt-BR') : 'Ainda não sincronizado'}</small>
            </button>
            {canManageConnections && <div className={styles.accountConnectionActions}>
              <Tooltip texto="Renovar a autorização desta conta sem excluir a conexão ou o histórico"><button id={`renew-account-${account.id}`} type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={disconnecting || connecting || accountSelectionLocked || publicationBusy} aria-expanded={renewAccount?.id === account.id} aria-controls={`account-renewal-${account.id}`} onClick={() => setRenewAccount((current) => current?.id === account.id ? null : account)}>Renovar autorização</button></Tooltip>
              <button type="button" className={`${styles.disconnectAccountButton} ${styles.compactConnectionButton}`} disabled={disconnecting || accountSelectionLocked || publicationBusy} onClick={() => setDisconnectAccount(account)}>Desconectar</button>
            </div>}
            {canManageConnections && renewAccount?.id === account.id && <div id={`account-renewal-${account.id}`}><AuthorizationRenewal companyId={companyId} account={account} onCompleted={completeAccountRenewal} onClose={() => { setRenewAccount(null); document.getElementById(`renew-account-${account.id}`)?.focus(); }} /></div>}
          </article>)}</div> : <p className={styles.emptyConnectedAccounts}>Nenhuma conta conectada.</p>}
        </div>}
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><h2 id="new-listing-title">Novo anúncio</h2></div></div>
        {marketplace === 'mercado_livre' && <NewListing key={companyId} companyId={companyId} accountId={selectedAccount} accounts={accounts} accountSelectionLocked={accountSelectionLocked} onSelectAccount={setSelectedAccount} onBusyChange={setPublicationBusy} canManage={canManage} onPublished={() => setRefreshKey((value) => value + 1)} copyRequest={copyRequest} onCopyHandled={() => { setCopyRequest(null); setRefreshKey((value) => value + 1); }} />}
      </article>
    </section>

    {marketplace === 'mercado_livre' && <div className={styles.inventoryStatus} role="status">
      {inventorySnapshot?.enabled ? <>
        {inventorySnapshot.workerHealthy ? 'Sincronização automática ativa.' : 'A rotina automática ainda não confirmou atividade recente. Confira a ativação antes de confiar na baixa automática.'}
        {Boolean(inventorySnapshot.pendingSales || inventorySnapshot.pendingStock) && <span>{inventorySnapshot.pendingSales} aviso(s) de venda e {inventorySnapshot.pendingStock} anúncio(s) aguardando atualização.</span>}
        {inventorySnapshot.issues.map(issue => <span key={issue.issue}>{inventoryIssueMessage(issue.issue)} ({issue.total})</span>)}
      </> : inventorySnapshot ? 'A sincronização automática de estoque ainda precisa ser ativada nesta empresa.' : 'Consultando situação da sincronização…'}
    </div>}
    {marketplace === 'mercado_livre' && <AvantaKanban className={styles.panelOrder} order={panelOrder.order} onOrderChange={panelOrder.change} disabled={!panelOrder.ready || publicationBusy || priceUsersOpen || !!disconnectAccount} items={[
      { id: 'sales', title: 'Vendas', render: (handle) => <Vendas companyId={companyId} accountId={salesAccount} onAccountChange={account => { setSalesSnapshot(sales); setSalesAccount(account); }} accounts={connectedAccounts} sales={visibleSales} canManage={canManage} loading={salesLoading} error={salesError} awaitingUpdates={awaitingUpdates} onRefresh={() => setSalesRefresh((value) => value + 1)} onSaleUpdated={updateSale} expanded={salesExpanded} onExpandedChange={setSalesExpanded} dark={empresa.temaEscuro} brand={empresa.corPrimaria} reorderHandle={handle} /> },
      { id: 'products', title: 'Produtos e estoque', render: (handle) => <ProductsStock key={companyId} companyId={companyId} accounts={accounts} canManage={canManage} dark={empresa.temaEscuro} brand={empresa.corPrimaria} refreshKey={refreshKey} preparationLocked={publicationBusy || accountSelectionLocked} reorderHandle={handle} onPrepare={(localProductId, targetConnectionId) => {
        setSelectedAccount(targetConnectionId); setCopyRequest({ id: crypto.randomUUID(), localProductId, targetConnectionId });
        requestAnimationFrame(() => document.getElementById('new-listing-title')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }));
      }} /> },
      { id: 'announced', title: 'Anunciados', render: (handle) => <Anunciados companyId={companyId} dark={empresa.temaEscuro} brand={empresa.corPrimaria} onAccountsLoaded={loadAccounts} onAccountSelectionLockedChange={setAccountSelectionLocked} onPublishInAnotherAccount={(sourceConnectionId, listingId, targetConnectionId) => {
      if (publicationBusy) { setConnectionNotice('Conclua ou limpe a preparação em Novo anúncio antes de abrir outra.'); return; }
      setSelectedAccount(targetConnectionId);
      setCopyRequest({ id: crypto.randomUUID(), sourceConnectionId, listingId, targetConnectionId });
    }} refreshKey={refreshKey} reorderHandle={handle} /> },
    ]} />}
    {panelOrder.notice && <p className={styles.connectionMessage} role="status">{panelOrder.notice}</p>}
    {priceUsersOpen && <PriceUsersPanel companyId={companyId} onClose={() => setPriceUsersOpen(false)} />}
    <ModalConfirmacao aberto={!!disconnectAccount} titulo="Desconectar conta?" mensagem={disconnectAccount ? `${disconnectAccount.seller_name || disconnectAccount.seller_reference}. O AvantaLab apagará os tokens desta conexão. Os anúncios no Mercado Livre não serão alterados.` : ''} textoConfirmar="Desconectar" carregando={disconnecting} darkMode={empresa.temaEscuro} corPrimaria={empresa.corPrimaria} variante="destrutiva" aoCancelar={() => { if (!disconnecting) setDisconnectAccount(null); }} aoConfirmar={() => void confirmDisconnectAccount()} />
    </div>
  </main>;
}
