'use client';
import { useEffect, useRef, useState } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CampoBusca from '@/app/components/CampoBusca';
import { marketplaceClientRequest, type MarketplaceAccount } from '../Anunciados';
import styles from '../marketplaces.module.css';

export default function PriceDiagnosticPage() {
  const [company, setCompany] = useState('');
  const [ean, setEan] = useState('');
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [results, setResults] = useState<unknown[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const running = useRef(false);
  useEffect(() => { const params = new URLSearchParams(window.location.search); setCompany(params.get('empresaId') || ''); setEan(params.get('ean') || ''); setQuery(params.get('q') || ''); }, []);
  async function run() {
    if (running.current) return;
    running.current = true; setBusy(true); setMessage('Consultando contas…'); setResults([]);
    try {
      const data = await marketplaceClientRequest(`conexoes?empresaId=${encodeURIComponent(company)}`);
      const connected = (data.accounts as MarketplaceAccount[]).filter(account => account.provider === 'mercado_livre' && account.status === 'connected').slice(0, 4);
      setAccounts(connected);
      if (!connected.length) { setMessage('Nenhuma conta conectada disponível.'); return; }
      for (const account of connected) {
        setMessage(`Consultando ${account.seller_name || 'conta conectada'}…`);
        try {
          const result = await marketplaceClientRequest('diagnostico-precos', { empresaId: company, connectionId: account.id, ean, query }, AbortSignal.timeout(65_000));
          setResults(current => [...current, result]);
        } catch (error) { setResults(current => [...current, { account: account.seller_name, error: error instanceof Error ? error.message : 'Consulta indisponível.' }]); }
      }
      setMessage('Diagnóstico concluído. Nenhum anúncio ou referência de preço foi alterado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível consultar.'); }
    finally { running.current = false; setBusy(false); }
  }
  return <main className={styles.page}>
    <div className={styles.content}><section className={styles.panel} aria-labelledby="diagnostic-title">
      <h1 id="diagnostic-title">Diagnóstico de preços — Mercado Livre</h1>
      <p className={styles.help}>Acesso restrito a administradores. Consulta direta, sem OpenAI. Médias são apenas da amostra retornada, ainda sem validação da variante, e não são salvas.</p>
      <div className={styles.form}>
        <CampoBusca id="diagnostic-company" aria-label="Empresa" value={company} onChange={setCompany} disabled={busy} placeholder="ID da empresa" />
        <CampoBusca id="diagnostic-ean" aria-label="EAN" value={ean} onChange={value => setEan(value.replace(/\D/g, '').slice(0, 14))} disabled={busy} placeholder="EAN / GTIN" />
        <CampoBusca id="diagnostic-query" aria-label="Nome ou modelo" value={query} onChange={setQuery} disabled={busy} placeholder="Nome ou modelo" />
        <BotaoAcaoCompacto variante="primario" disabled={busy || !company || !ean && query.trim().length < 3} aria-busy={busy} onClick={run}>Testar contas sem IA</BotaoAcaoCompacto>
      </div>
      <p role="status" className={styles.help}>{message}{accounts.length ? ` · ${accounts.length} conta(s)` : ''}</p>
      <div aria-label="Resultado do diagnóstico">{results.map((result, index) => <pre key={index} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(result, null, 2)}</pre>)}</div>
    </section></div>
  </main>;
}
