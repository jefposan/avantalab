'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import TelaCarregandoAcesso from '@/app/components/TelaCarregandoAcesso';
import ModuloHeader from '@/app/components/ModuloHeader';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import { consumirNavegacaoModulo, solicitarRetornoAoModuloHospedeiro, type ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { supabase } from '@/app/lib/supabase';
import styles from './marketplaces.module.css';
import Anunciados, { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import NewListing from './NewListing';
import PriceUsersPanel from './PriceUsersPanel';

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
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [canManageConnections, setCanManageConnections] = useState(false);
  const [accountSelectionLocked, setAccountSelectionLocked] = useState(false);
  const [publicationBusy, setPublicationBusy] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState(() => connectionStatus === 'error' ? connectionMessage || 'Não foi possível conectar a conta do Mercado Livre.' : '');
  const [priceUsersOpen, setPriceUsersOpen] = useState(false);
  const [priceLinkStatus, setPriceLinkStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [disconnectAccount, setDisconnectAccount] = useState<MarketplaceAccount | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
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
    const data = await marketplaceClientRequest(`conexoes?empresaId=${encodeURIComponent(companyId)}`) as { accounts: MarketplaceAccount[]; canConnect: boolean };
    loadAccounts(data.accounts, data.canConnect);
  }, [companyId, loadAccounts]);

  const connectedAccounts = accounts.filter((account) => account.status === 'connected');

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
      if (context) return;
      setAccessState('loading');
      setAccessError('');
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
      const data = event.data as { type?: string; provider?: string; empresaId?: string; status?: string; message?: string };
      if (data.type !== 'avantalab-marketplace-oauth' || data.provider !== 'mercado_livre' || data.empresaId !== companyId) return;
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
    <ModuloHeader empresa={empresa} onBack={voltar} />
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
        <div className={styles.panelHeading}><div><p className={styles.step}>1</p><h2>Marketplace</h2></div></div>
        <div className={styles.providerGrid}>
          {providers.map((provider) => <button key={provider.id} type="button" disabled={!provider.available} className={`${styles.provider} ${marketplace === provider.id ? styles.providerSelected : ''}`} onClick={() => setMarketplace(provider.id)} aria-pressed={marketplace === provider.id}>
            <strong>{provider.name}</strong>{!provider.available && <small>Em breve</small>}
          </button>)}
        </div>
        <div className={styles.connectionNotice}>
          {selectedProvider.available && <button type="button" disabled={connecting || !companyId || !canManageConnections} onClick={() => void connectMarketplace()} aria-describedby={connectedAccounts.length ? 'connect-another-account-help' : undefined}>{connecting ? 'Abrindo Mercado Livre…' : connectedAccounts.length ? 'Conectar outra conta' : 'Conectar conta'}</button>}
          {connectedAccounts.length > 0 && <p id="connect-another-account-help" className={styles.connectionHelp}>As contas já conectadas serão mantidas. Para autorizar outra, saia da conta atual do Mercado Livre neste navegador ou use uma janela anônima.</p>}
          {connectionNotice && <p className={styles.connectionMessage} role="alert">{connectionNotice}</p>}
        </div>
        {marketplace === 'mercado_livre' && <div className={styles.connectedAccounts} aria-labelledby="connected-accounts-title">
          <div className={styles.connectedAccountsHeading}><h3 id="connected-accounts-title">Contas conectadas</h3><span>{connectedAccounts.length}</span></div>
          {connectedAccounts.length ? <div className={styles.connectedAccountsList}>{connectedAccounts.map((account) => <article key={account.id} className={`${styles.connectedAccount} ${account.id === selectedAccount ? styles.connectedAccountSelected : ''}`}>
            <button type="button" className={styles.connectedAccountSelect} onClick={() => setSelectedAccount(account.id)} disabled={accountSelectionLocked || publicationBusy} aria-pressed={account.id === selectedAccount}>
              <strong>{account.seller_name || `Vendedor ${account.seller_reference}`}</strong><small>ID {account.seller_reference} · Conectada<br />Última sincronização: {account.last_synced_at ? new Date(account.last_synced_at).toLocaleString('pt-BR') : 'Ainda não sincronizado'}</small>
            </button>
            {canManageConnections && <button type="button" className={styles.disconnectAccountButton} disabled={disconnecting || accountSelectionLocked || publicationBusy} onClick={() => setDisconnectAccount(account)}>Desconectar</button>}
          </article>)}</div> : <p className={styles.emptyConnectedAccounts}>Nenhuma conta conectada.</p>}
        </div>}
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.step}>2</p><h2>Novo anúncio</h2></div></div>
        {marketplace === 'mercado_livre' && <NewListing key={selectedAccount || 'unselected'} companyId={companyId} accountId={selectedAccount} accounts={accounts} accountSelectionLocked={accountSelectionLocked} onSelectAccount={setSelectedAccount} onBusyChange={setPublicationBusy} canManage={canManage} onPublished={() => setRefreshKey((value) => value + 1)} />}
      </article>
    </section>

    {marketplace === 'mercado_livre' && <Anunciados companyId={companyId} dark={empresa.temaEscuro} brand={empresa.corPrimaria} accountId={selectedAccount} onAccountsLoaded={loadAccounts} onAccountSelectionLockedChange={setAccountSelectionLocked} refreshKey={refreshKey} />}
    {priceUsersOpen && <PriceUsersPanel companyId={companyId} onClose={() => setPriceUsersOpen(false)} />}
    <ModalConfirmacao aberto={!!disconnectAccount} titulo="Desconectar conta?" mensagem={disconnectAccount ? `${disconnectAccount.seller_name || disconnectAccount.seller_reference}. O AvantaLab apagará os tokens desta conexão. Os anúncios no Mercado Livre não serão alterados.` : ''} textoConfirmar="Desconectar" carregando={disconnecting} darkMode={empresa.temaEscuro} corPrimaria={empresa.corPrimaria} variante="destrutiva" aoCancelar={() => { if (!disconnecting) setDisconnectAccount(null); }} aoConfirmar={() => void confirmDisconnectAccount()} />
    </div>
  </main>;
}
