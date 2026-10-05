'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import ModuloHeader from '@/app/components/ModuloHeader';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import { consumirNavegacaoModulo, solicitarRetornoAoModuloHospedeiro, type ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { supabase } from '@/app/lib/supabase';
import styles from './marketplaces.module.css';
import Anunciados, { type MarketplaceAccount } from './Anunciados';
import NewListing from './NewListing';

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
  const [marketplace, setMarketplace] = useState<MarketplaceId>('mercado_livre');
  const [canManage, setCanManage] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [accountSelectionLocked, setAccountSelectionLocked] = useState(false);
  const [publicationBusy, setPublicationBusy] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState(() => connectionStatus === 'error' ? connectionMessage || 'Não foi possível conectar a conta do Mercado Livre.' : '');
  const returnHref = `/gestao?empresaId=${encodeURIComponent(companyId)}`;
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === marketplace)!, [marketplace]);
  const loadAccounts = useCallback((available: MarketplaceAccount[]) => {
    setAccounts(available);
    setSelectedAccount((current) => {
      if (available.some((account) => account.id === current && account.status === 'connected')) return current;
      const connected = available.filter((account) => account.status === 'connected');
      return connected.length === 1 ? connected[0].id : '';
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadIdentity() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token || controller.signal.aborted || !companyId) return;
      const response = await fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(companyId)}&moduloId=marketplaces`, { signal: controller.signal, headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const payload = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (response.ok && payload?.empresa) { setEmpresa(payload.empresa); setCanManage(['gestor_master', 'administrador', 'operador_completo'].includes(payload.perfil)); }
      else setConnectionNotice(payload?.mensagem || 'Não foi possível carregar o perfil empresarial.');
    }
    void loadIdentity().catch(() => { if (!controller.signal.aborted) setConnectionNotice('Não foi possível carregar o perfil empresarial.'); });
    return () => controller.abort();
  }, [companyId]);

  function voltar() {
    if (!solicitarRetornoAoModuloHospedeiro()) router.push(returnHref);
  }

  async function connectMarketplace() {
    if (marketplace !== 'mercado_livre' || connecting || !companyId) return;
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
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setConnectionNotice(error instanceof Error ? error.message : 'Não foi possível iniciar a conexão.');
      setConnecting(false);
    }
  }

  return <main className={`${styles.page} ${empresa.temaEscuro ? styles.dark : ''}`} style={{ '--marketplace-brand': empresa.corPrimaria } as CSSProperties}>
    <ModuloHeader empresa={empresa} onBack={voltar} />
    <div className={styles.content}>
    <section className={styles.hero} aria-labelledby="module-title">
      <div><p className={styles.eyebrow}>Conexão e gestão</p><h1 id="module-title">Anúncios em marketplaces</h1></div>
      <a className={styles.marketplaceMobileLink} href="/marketplaces/consulta" target="_blank" rel="noopener noreferrer">Abrir consulta de preços</a>
    </section>

    <section className={styles.grid} aria-label="Configuração de publicação">
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.step}>1</p><h2>Marketplace</h2></div></div>
        <div className={styles.providerGrid}>
          {providers.map((provider) => <button key={provider.id} type="button" disabled={!provider.available} className={`${styles.provider} ${marketplace === provider.id ? styles.providerSelected : ''}`} onClick={() => setMarketplace(provider.id)} aria-pressed={marketplace === provider.id}>
            <strong>{provider.name}</strong>{!provider.available && <small>Em breve</small>}
          </button>)}
        </div>
        <div className={styles.connectionNotice}>{selectedProvider.available && <button type="button" disabled={connecting || !companyId} onClick={() => void connectMarketplace()}>{connecting ? 'Abrindo Mercado Livre…' : 'Conectar conta'}</button>}{connectionNotice && <p className={styles.connectionMessage} role="alert">{connectionNotice}</p>}</div>
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.step}>2</p><h2>Novo anúncio</h2></div></div>
        {marketplace === 'mercado_livre' && <NewListing key={selectedAccount || 'unselected'} companyId={companyId} accountId={selectedAccount} accounts={accounts} accountSelectionLocked={accountSelectionLocked} onSelectAccount={setSelectedAccount} onBusyChange={setPublicationBusy} canManage={canManage} onPublished={() => setRefreshKey((value) => value + 1)} />}
      </article>
    </section>

    {marketplace === 'mercado_livre' && <Anunciados companyId={companyId} dark={empresa.temaEscuro} brand={empresa.corPrimaria} accountId={selectedAccount} onSelectAccount={setSelectedAccount} onAccountsLoaded={loadAccounts} onAccountSelectionLockedChange={setAccountSelectionLocked} publicationBusy={publicationBusy} refreshKey={refreshKey} />}
    </div>
  </main>;
}
