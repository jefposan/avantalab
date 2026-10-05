'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import ModuloHeader from '@/app/components/ModuloHeader';
import { preparePublicationInput } from '@/app/modules/marketplaces/services/publication-intake';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import { consumirNavegacaoModulo, solicitarRetornoAoModuloHospedeiro, type ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { supabase } from '@/app/lib/supabase';
import styles from './marketplaces.module.css';
import Anunciados from './Anunciados';

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
  const [ean, setEan] = useState('');
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<ReturnType<typeof preparePublicationInput> | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [validating, setValidating] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState(() => connectionStatus === 'error' ? connectionMessage || 'Não foi possível conectar a conta do Mercado Livre.' : '');
  const returnHref = `/gestao?empresaId=${encodeURIComponent(companyId)}`;
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === marketplace)!, [marketplace]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadIdentity() {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token || controller.signal.aborted || !companyId) return;
      const response = await fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(companyId)}&moduloId=marketplaces`, { signal: controller.signal, headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const payload = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (response.ok && payload?.empresa) setEmpresa(payload.empresa);
      else setConnectionNotice(payload?.mensagem || 'Não foi possível carregar o perfil empresarial.');
    }
    void loadIdentity().catch(() => { if (!controller.signal.aborted) setConnectionNotice('Não foi possível carregar o perfil empresarial.'); });
    return () => controller.abort();
  }, [companyId]);

  function voltar() {
    if (!solicitarRetornoAoModuloHospedeiro()) router.push(returnHref);
  }

  async function validateDraft() {
    const locallyPrepared = preparePublicationInput({ ean, price });
    setResult(locallyPrepared);
    if (locallyPrepared.requirements.some((requirement) => requirement.field !== 'connection')) return;

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch('/api/modulos/marketplaces/preparar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ empresaId: companyId, provider: marketplace, connectionId: selectedAccount, ean, price }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    if (payload?.result) setResult(payload.result);
    else setConnectionNotice(payload?.message || 'Não foi possível preparar os dados. Verifique sua sessão e a conta selecionada.');
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
    </section>

    <section className={styles.grid} aria-label="Configuração de publicação">
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.step}>1</p><h2>Marketplace</h2></div></div>
        <div className={styles.providerGrid}>
          {providers.map((provider) => <button key={provider.id} type="button" disabled={!provider.available} className={`${styles.provider} ${marketplace === provider.id ? styles.providerSelected : ''}`} onClick={() => { setMarketplace(provider.id); setResult(null); }} aria-pressed={marketplace === provider.id}>
            <strong>{provider.name}</strong>{!provider.available && <small>Em breve</small>}
          </button>)}
        </div>
        <div className={styles.connectionNotice}>{selectedProvider.available && <button type="button" disabled={connecting || !companyId} onClick={() => void connectMarketplace()}>{connecting ? 'Abrindo Mercado Livre…' : 'Conectar conta'}</button>}{connectionNotice && <p className={styles.connectionMessage} role="alert">{connectionNotice}</p>}</div>
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.step}>2</p><h2>Novo anúncio</h2></div></div>
        <div className={styles.form}>
          <label htmlFor="ean">EAN / GTIN<input id="ean" inputMode="numeric" autoComplete="off" value={ean} onChange={(event) => setEan(event.target.value)} placeholder="Ex.: 7899882306941" /></label>
          <label htmlFor="price">Valor de venda<input id="price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="R$ 0,00" /></label>
          <button type="button" className={styles.primary} disabled={validating || !selectedProvider.available} onClick={async () => { setValidating(true); try { await validateDraft(); } finally { setValidating(false); } }}>{validating ? 'Validando…' : 'Validar e preparar'}</button>
        </div>
      </article>
    </section>

    {result && <section className={`${styles.result} ${result.status === 'draft' ? styles.resultReady : ''}`} aria-live="polite">
      <strong>{result.status === 'draft' ? 'Dados iniciais prontos' : 'Precisamos de mais informações'}</strong>
      <p>{result.message}</p>
      {result.requirements.length > 0 && <ul>{result.requirements.map((requirement) => <li key={requirement.field}><strong>{requirement.label}:</strong> {requirement.message}</li>)}</ul>}
      {result.status === 'draft' && <p>Dados iniciais validados para a conta selecionada. Nenhum anúncio foi publicado.</p>}
    </section>}

    {marketplace === 'mercado_livre' && <Anunciados companyId={companyId} dark={empresa.temaEscuro} brand={empresa.corPrimaria} onSelectAccount={setSelectedAccount} />}
    </div>
  </main>;
}
