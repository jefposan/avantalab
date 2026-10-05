'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import { preparePublicationInput } from '@/app/modules/marketplaces/services/publication-intake';
import type { MarketplaceId } from '@/app/modules/marketplaces/types';
import type { ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { supabase } from '@/app/lib/supabase';
import styles from './marketplaces.module.css';

const providers: Array<{ id: MarketplaceId; name: string; detail: string; available: boolean }> = [
  { id: 'mercado_livre', name: 'Mercado Livre', detail: 'OAuth 2.0 com PKCE. Não solicitamos a senha da conta.', available: true },
  { id: 'shopee', name: 'Shopee', detail: 'Integração planejada — será habilitada após validação do contrato oficial.', available: false },
  { id: 'tiktok_shop', name: 'TikTok Shop', detail: 'Integração planejada — será habilitada após validação do contrato oficial.', available: false },
  { id: 'magalu', name: 'Magalu', detail: 'Integração planejada — será habilitada após validação do contrato oficial.', available: false },
  { id: 'casas_bahia', name: 'Casas Bahia', detail: 'Integração planejada — será habilitada após validação do contrato oficial.', available: false },
  { id: 'amazon', name: 'Amazon', detail: 'Integração planejada — será habilitada após validação do contrato oficial.', available: false },
];

export default function MarketplacesClient({ companyId, initialContext, connectionStatus, connectionMessage }: { companyId: string; initialContext: ContextoNavegacaoModulo | null; connectionStatus?: string; connectionMessage?: string }) {
  const [marketplace, setMarketplace] = useState<MarketplaceId>('mercado_livre');
  const [ean, setEan] = useState('');
  const [price, setPrice] = useState('');
  const [result, setResult] = useState<ReturnType<typeof preparePublicationInput> | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectionNotice, setConnectionNotice] = useState(() => connectionStatus === 'connected'
    ? 'Conta do Mercado Livre conectada com sucesso.'
    : connectionStatus === 'error' ? connectionMessage || 'Não foi possível conectar a conta do Mercado Livre.' : '');
  const companyName = initialContext?.empresa.nome || 'Perfil empresarial';
  const returnHref = `/gestao?empresaId=${encodeURIComponent(companyId)}`;
  const selectedProvider = useMemo(() => providers.find((provider) => provider.id === marketplace)!, [marketplace]);

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
      body: JSON.stringify({ empresaId: companyId, provider: marketplace, ean, price }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    if (payload?.result) setResult(payload.result);
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

  return <main className={`${styles.page} ${initialContext?.empresa.temaEscuro ? styles.dark : ''}`} style={{ '--marketplace-brand': initialContext?.empresa.corPrimaria || '#003E73' } as CSSProperties}>
    <header className={styles.header}>
      <Link href={returnHref} className={styles.back}>← Início</Link>
      <div><p className={styles.eyebrow}>Anúncios em marketplaces</p><h1>{companyName}</h1></div>
      <span className={styles.webOnly}>Web</span>
    </header>

    <section className={styles.hero} aria-labelledby="module-title">
      <div><p className={styles.eyebrow}>Publicação assistida</p><h2 id="module-title">Do EAN ao anúncio, com validação antes de publicar.</h2><p>Conecte a conta no ambiente oficial do marketplace. O AvantaLab guarda tokens criptografados no servidor e nunca pede a senha do vendedor.</p></div>
      <div className={styles.security}><strong>Proteção de credenciais</strong><span>OAuth · PKCE · tokens fora do navegador</span></div>
    </section>

    <section className={styles.grid} aria-label="Configuração de publicação">
      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.step}>1</p><h2>Marketplace</h2></div><span>Selecione onde vender</span></div>
        <div className={styles.providerGrid}>
          {providers.map((provider) => <button key={provider.id} type="button" className={`${styles.provider} ${marketplace === provider.id ? styles.providerSelected : ''}`} onClick={() => { setMarketplace(provider.id); setResult(null); }} aria-pressed={marketplace === provider.id}>
            <strong>{provider.name}</strong><small>{provider.available ? 'Disponível para conexão' : 'Planejado'}</small>
          </button>)}
        </div>
        <div className={styles.connectionNotice} role="status"><strong>{selectedProvider.name}</strong><span>{selectedProvider.detail}</span>{selectedProvider.available && <button type="button" disabled={connecting || !companyId} onClick={() => void connectMarketplace()}>{connecting ? 'Abrindo Mercado Livre…' : 'Conectar conta'}</button>}{connectionNotice && <p className={styles.connectionMessage} role="alert">{connectionNotice}</p>}</div>
      </article>

      <article className={styles.panel}>
        <div className={styles.panelHeading}><div><p className={styles.step}>2</p><h2>Novo anúncio</h2></div><span>Dados mínimos</span></div>
        <div className={styles.form}>
          <label htmlFor="ean">EAN / GTIN<input id="ean" inputMode="numeric" autoComplete="off" value={ean} onChange={(event) => setEan(event.target.value)} placeholder="Ex.: 7899882306941" /></label>
          <label htmlFor="price">Valor de venda<input id="price" inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="R$ 0,00" /></label>
          <p className={styles.help}>O catálogo identifica o produto. Se o marketplace exigir estoque, envio, condição ou outro dado, o módulo solicitará somente o campo faltante.</p>
          <button type="button" className={styles.primary} onClick={validateDraft}>Validar e preparar</button>
        </div>
      </article>
    </section>

    {result && <section className={`${styles.result} ${result.status === 'draft' ? styles.resultReady : ''}`} aria-live="polite">
      <strong>{result.status === 'draft' ? 'Dados iniciais prontos' : 'Precisamos de mais informações'}</strong>
      <p>{result.message}</p>
      {result.requirements.length > 0 && <ul>{result.requirements.map((requirement) => <li key={requirement.field}><strong>{requirement.label}:</strong> {requirement.message}</li>)}</ul>}
      {result.status === 'draft' && <p>Conecte a conta do marketplace para consultar o catálogo e continuar. Nenhum anúncio foi publicado.</p>}
    </section>}

    <section className={styles.flow} aria-label="Como funciona">
      <div><span>1</span><strong>Conectar</strong><p>Autorização na página oficial do marketplace.</p></div>
      <div><span>2</span><strong>Validar</strong><p>EAN, valor e regras do catálogo são conferidos no servidor.</p></div>
      <div><span>3</span><strong>Confirmar</strong><p>A publicação só é enviada após confirmação explícita e auditável.</p></div>
    </section>
  </main>;
}
