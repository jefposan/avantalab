'use client';
import { useEffect, useState } from 'react';
import { renewalAuthorizationUrl } from '../renewal-authorization';
import styles from '../marketplaces.module.css';

type RenewalInfo = { sellerName: string; sellerReference: string; expiresAt: string };
const failureMessage = (failure: unknown, fallback: string) => failure instanceof Error && ['TimeoutError', 'AbortError'].includes(failure.name)
  ? 'A consulta demorou mais que o esperado. Tente novamente.'
  : failure instanceof Error ? failure.message : fallback;
export default function RenewalClient() {
  const [info, setInfo] = useState<RenewalInfo | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [requestId, setRequestId] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      const outcome = new URLSearchParams(window.location.search).get('resultado');
      if (outcome) {
        setResult(outcome === 'connected' ? 'Renovação concluída. Você pode fechar esta aba.' : 'Não foi possível concluir. A conexão existente não foi excluída. Peça um novo link ao administrador e entre na conta indicada.');
        setBusy(false); return;
      }
      const id = new URLSearchParams(window.location.hash.slice(1)).get('solicitacao') || '';
      setRequestId(id);
      try {
        const response = await fetch('/api/marketplaces/renovar', { method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'consultar', requestId: id }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Solicitação indisponível. Peça um novo link ao administrador.');
        if (!controller.signal.aborted) setInfo(payload);
      } catch (failure) { if (!controller.signal.aborted) setError(failureMessage(failure, 'Não foi possível consultar o link.')); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load();
    return () => controller.abort();
  }, []);
  async function authorize() {
    if (busy || !info) return;
    setBusy(true); setError('');
    try {
      window.location.assign(await renewalAuthorizationUrl(requestId));
    } catch (failure) { setError(failureMessage(failure, 'Não foi possível continuar.')); setBusy(false); }
  }
  return <main className={styles.accessState}><div>
    <h1>Renovar autorização · Mercado Livre</h1>
    {result ? <p role="status">{result}</p> : <>
      {busy && <p role="status">{info ? 'Abrindo Mercado Livre…' : 'Validando solicitação…'}</p>}
      {info && <>
        <p><strong>{info.sellerName}</strong> · ID {info.sellerReference}</p>
        <p>Entre no Mercado Livre com esta conta e revise as permissões antes de autorizar. Se outra conta estiver conectada no navegador, use uma janela anônima.</p>
        <p>Sua senha é informada somente ao Mercado Livre. Este link não permite acessar o AvantaLab, ver vendas ou excluir a conexão. Os anúncios e o histórico serão mantidos.</p>
        <p>Solicitação válida até {new Date(info.expiresAt).toLocaleString('pt-BR')}.</p>
        <button type="button" disabled={busy} onClick={() => void authorize()}>Continuar no Mercado Livre</button>
      </>}
      {error && <p role="alert">{error}</p>}
    </>}
  </div></main>;
}
