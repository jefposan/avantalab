'use client';

import { useEffect, useRef, useState } from 'react';
import Tooltip from '@/app/components/Tooltip';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import { monitorAuthorizationRenewal, renewalAuthorizationUrl, type RenewalStatus } from './renewal-authorization';
import styles from './marketplaces.module.css';

type RenewalLink = { link: string; requestId: string; expiresAt: string; sellerName: string };
const failureMessage = (error: unknown, fallback: string) => error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
  ? 'A solicitação demorou mais que o esperado. Tente novamente.'
  : error instanceof Error ? error.message : fallback;
export default function AuthorizationRenewal({ companyId, account, onClose, onCompleted }: { companyId: string; account: MarketplaceAccount; onClose: () => void; onCompleted: (account: MarketplaceAccount) => void }) {
  const [request, setRequest] = useState<RenewalLink | null>(null);
  const [operation, setOperation] = useState<'link' | 'authorize' | 'cancel' | null>(null);
  const busy = operation !== null;
  const authorizationWindow = useRef<Window | null>(null);
  const renewalGeneration = useRef(0);
  const [notice, setNotice] = useState('');
  const [expired, setExpired] = useState(false);
  const [tracking, setTracking] = useState<RenewalLink | null>(null);
  const [completed, setCompleted] = useState(false);
  useEffect(() => {
    if (!tracking) return;
    const generation = renewalGeneration.current;
    return monitorAuthorizationRenewal({ expiresAt: tracking.expiresAt,
      read: async (signal) => {
        const result = await marketplaceClientRequest('conexoes/mercado-livre/renovar', { action: 'status', empresaId: companyId, connectionId: account.id, requestId: tracking.requestId }, signal) as RenewalStatus;
        if (result.status === 'completed' && (!result.account || result.account.id !== account.id || result.account.status !== 'connected')) throw new Error('Não foi possível confirmar a conta renovada.');
        return result;
      },
      onResult: (result) => {
        if (generation !== renewalGeneration.current) return;
        if (result.status === 'completed' && result.account) {
          renewalGeneration.current++;
          setCompleted(true); setTracking(null); setRequest(null); setNotice('Renovação concluída');
          try { authorizationWindow.current?.close(); } catch { /* O callback também tenta fechar sua própria aba. */ }
          authorizationWindow.current = null;
          onCompleted(result.account);
        } else if (result.status === 'failed' || result.status === 'expired') {
          renewalGeneration.current++;
          setTracking(null); authorizationWindow.current = null;
          setNotice(result.message || 'Não foi possível renovar. Tente novamente.');
        }
      },
      onError: (error) => {
        if (generation !== renewalGeneration.current) return;
        const message = failureMessage(error, 'Não foi possível conferir a renovação.');
        if (Date.parse(tracking.expiresAt) <= Date.now()) {
          setTracking(null); setNotice(`${message} Não foi possível confirmar a conclusão. Tente renovar novamente.`);
        } else setNotice(`${message} Vamos conferir novamente automaticamente.`);
      },
    });
  }, [tracking, companyId, account.id, onCompleted]);
  useEffect(() => {
    if (!request) return;
    const tick = () => setExpired(Date.parse(request.expiresAt) <= Date.now());
    tick(); const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [request]);

  async function generate() {
    if (busy) return;
    renewalGeneration.current++; setTracking(null);
    setOperation('link'); setNotice(''); setCompleted(false);
    try {
      const result = await marketplaceClientRequest('conexoes/mercado-livre/renovar', { empresaId: companyId, connectionId: account.id }, AbortSignal.timeout(15_000)) as RenewalLink;
      setRequest(result); setTracking(result); setExpired(false);
      setNotice('Link criado. Envie somente ao responsável por esta conta.');
    } catch (error) { setNotice(failureMessage(error, 'Não foi possível criar o link.')); }
    finally { setOperation(null); }
  }
  async function authorize() {
    if (busy) return;
    if (authorizationWindow.current && !authorizationWindow.current.closed) {
      authorizationWindow.current.focus(); setNotice('Conclua a autorização na janela do Mercado Livre.'); return;
    }
    // Abrir no gesto do usuário evita bloqueio; sem opener, o provedor não pode navegar a tela original.
    const popup = window.open('', '_blank', 'popup=yes,width=560,height=760,resizable=yes,scrollbars=yes');
    if (!popup) { setNotice('Permita pop-ups e tente novamente, ou gere um link.'); return; }
    popup.opener = null;
    popup.document.title = 'Preparando autorização';
    popup.document.body.textContent = 'Preparando autorização do Mercado Livre…';
    authorizationWindow.current = popup;
    renewalGeneration.current++; setTracking(null);
    setOperation('authorize'); setNotice(''); setCompleted(false);
    try {
      const draft = await marketplaceClientRequest('conexoes/mercado-livre/renovar', { empresaId: companyId, connectionId: account.id }, AbortSignal.timeout(15_000)) as RenewalLink;
      const url = await renewalAuthorizationUrl(draft.requestId);
      if (popup.closed) { setNotice('Janela fechada. Clique em Autorizar agora para tentar novamente.'); return; }
      popup.location.replace(url);
      setTracking(draft); setRequest(null);
      setNotice('Conclua a autorização no Mercado Livre. A confirmação aparecerá aqui automaticamente.');
    } catch (error) {
      if (!popup.closed) popup.close();
      authorizationWindow.current = null;
      setNotice(failureMessage(error, 'Não foi possível iniciar a autorização.'));
    } finally { setOperation(null); }
  }
  async function copy() {
    if (!request || expired) return;
    try { await navigator.clipboard.writeText(request.link); setNotice('Link copiado. O responsável deve entrar na conta indicada e autorizar no Mercado Livre.'); }
    catch { setNotice('Não foi possível copiar automaticamente. Selecione o link abaixo e copie.'); }
  }
  async function cancel() {
    if (!request || busy) return;
    const generation = renewalGeneration.current;
    setOperation('cancel');
    try {
      await marketplaceClientRequest('conexoes/mercado-livre/renovar', { empresaId: companyId, requestId: request.requestId }, AbortSignal.timeout(15_000), 'DELETE');
      if (generation !== renewalGeneration.current) return;
      renewalGeneration.current++;
      if (tracking?.requestId === request.requestId) setTracking(null);
      setRequest(null); setNotice('Link cancelado. A conexão existente continua preservada.');
    } catch (error) { if (generation === renewalGeneration.current) setNotice(failureMessage(error, 'Não foi possível cancelar o link.')); }
    finally { setOperation(null); }
  }
  return <section className={styles.renewalPanel} aria-labelledby={`renewal-title-${account.id}`}>
    <div className={styles.renewalHeading}>
      <h3 id={`renewal-title-${account.id}`}>Renovar autorização</h3>
      <button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={busy} onClick={onClose}>Fechar</button>
    </div>
    {!completed && <><p className={styles.connectionHelp}>Tem acesso à conta? Autorize agora. Caso contrário, envie o link ao titular.</p>
    <div className={styles.renewalMainActions}>
      <Tooltip texto="Entrar nesta conta no Mercado Livre e renovar sem excluir anúncios, vendas ou histórico"><button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton} ${styles.renewalPrimary}`} disabled={busy} onClick={() => void authorize()}>{operation === 'authorize' ? 'Preparando…' : 'Autorizar agora'}</button></Tooltip>
      <Tooltip texto="Criar um link de uso único, válido por 30 minutos, para o titular autorizar sem compartilhar a senha"><button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={busy} onClick={() => void generate()}>{operation === 'link' ? 'Gerando…' : request ? 'Novo link' : 'Gerar link'}</button></Tooltip>
    </div>
    {request && <>
      <div className={styles.renewalLinkArea}>
        <label className={styles.renewalLink}>Link para o titular<input type="text" readOnly value={request.link} onFocus={(event) => event.currentTarget.select()} aria-describedby="renewal-validity" /></label>
        <p id="renewal-validity" className={styles.connectionHelp}>{expired ? 'Link expirado. Gere um novo.' : `Uso único · válido até ${new Date(request.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`}</p>
        <div className={styles.renewalActions}>
          <button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={busy || expired} onClick={() => void copy()}>Copiar link</button>
          <Tooltip texto="Invalidar somente este link; fechar o painel não o cancela"><button type="button" className={`${styles.renewalAction} ${styles.compactConnectionButton}`} disabled={busy} onClick={() => void cancel()}>Cancelar link</button></Tooltip>
        </div>
      </div>
    </>}
    </>}
    {notice && <p className={completed ? styles.catalogSuccess : styles.connectionMessage} role="status">{notice}</p>}
  </section>;
}
