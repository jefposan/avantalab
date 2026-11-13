'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import { corTextoSobreFundo } from '@/app/lib/cores-avanta';
import { DEFAULT_ACCOUNT_CLEANUP, type AccountCleanupOptions, type AccountCleanupResult, type AccountCleanupReview } from '@/app/modules/marketplaces/account-cleanup';
import { accountDisplayName } from './account-identification';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import styles from './AccountCleanup.module.css';

type Props = {
  companyId: string;
  account: MarketplaceAccount;
  dark: boolean;
  brand: string;
  onClose: () => void;
  onCleaned: (result: AccountCleanupResult) => void;
  request?: typeof marketplaceClientRequest;
};
const choices: { key: keyof AccountCleanupOptions; title: string; help: string }[] = [
  { key: 'clearNotices', title: 'Limpar avisos e pendências', help: 'Dispensa os avisos atuais desta conta para os usuários do perfil.' },
  { key: 'removeListings', title: 'Remover anúncios importados e vínculos locais', help: 'Encerra a importação automática desta conta neste perfil.' },
  { key: 'removeProducts', title: 'Excluir produtos exclusivos elegíveis', help: 'A prévia identifica produtos compartilhados, com saldo ou histórico.' },
  { key: 'archiveAccount', title: 'Arquivar a conta', help: 'Dispensa os avisos e retira a conta das listas principais. A reconexão permite escolher uma nova importação.' },
];
export default function AccountCleanup({ companyId, account, dark, brand, onClose, onCleaned, request = marketplaceClientRequest }: Props) {
  const [options, setOptions] = useState<AccountCleanupOptions>(DEFAULT_ACCOUNT_CLEANUP);
  const [review, setReview] = useState<AccountCleanupReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [reload, setReload] = useState(0);
  const [outcome, setOutcome] = useState<AccountCleanupResult | null>(null);
  const attempt = useRef<{ key: string; review: string } | null>(null);
  const selection = JSON.stringify(options);
  const selected = Object.values(options).some(Boolean);

  useEffect(() => {
    if (!selected) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void request('conexoes/limpeza', {
      empresaId: companyId, connectionId: account.id, action: 'review', options: JSON.parse(selection),
    }, AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]))
      .then(data => { if (!controller.signal.aborted) setReview(data as AccountCleanupReview); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Não foi possível conferir a conta.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [account.id, companyId, reload, request, selected, selection]);

  function changeOption(key: keyof AccountCleanupOptions, checked: boolean) {
    setReview(null);
    setConfirmation('');
    attempt.current = null;
    setOptions(current => ({
      ...current, [key]: checked,
      ...(key === 'removeProducts' && checked ? { removeListings: true } : {}),
      ...(key === 'removeListings' && !checked ? { removeProducts: false } : {}),
      ...(key === 'archiveAccount' && checked ? { clearNotices: true } : {}),
      ...(key === 'clearNotices' && !checked ? { archiveAccount: false } : {}),
    }));
  }
  async function execute() {
    if (!review || busy || loading || review.blockers.length || confirmation !== review.accountName) return;
    if (attempt.current?.review !== review.reviewToken) attempt.current = { key: crypto.randomUUID(), review: review.reviewToken };
    setBusy(true);
    setError('');
    try {
      const result = await request('conexoes/limpeza', {
        empresaId: companyId, connectionId: account.id, action: 'execute', options,
        reviewToken: review.reviewToken, confirmation, requestKey: attempt.current.key,
      }, AbortSignal.timeout(50_000)) as AccountCleanupResult;
      if (!result?.counts || typeof result.archived !== 'boolean') throw new Error('Confira o resultado antes de tentar novamente.');
      setOutcome(result);
      onCleaned(result);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível confirmar a limpeza.'); }
    finally { setBusy(false); }
  }
  const close = () => { if (!busy) onClose(); };
  return <CardExpandidoModal aberto rotulo="Limpar dados da conta" onFechar={close} darkMode={dark}>
    <section className={`${styles.dialog} ${dark ? styles.dark : ''}`} style={{ '--brand': brand, '--av-action-on-brand': corTextoSobreFundo(brand) } as CSSProperties}>
      <header className={styles.header}>
        <h2>Limpar dados da conta</h2>
        <BotaoAcaoCompacto somenteIcone variante="discreto" disabled={busy} onClick={close} aria-label="Fechar limpeza de conta">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </BotaoAcaoCompacto>
      </header>
      <div className={styles.body}>
        <div className={styles.identity}><strong>{review?.accountName || accountDisplayName(account)}</strong><span>{review?.companyName || 'Conferindo perfil empresarial…'}</span></div>
        {outcome ? <div role="status">
          <h3>Limpeza concluída</h3>
          <p>{outcome.counts.products} produto(s), {outcome.counts.links} vínculo(s), {outcome.counts.listings} anúncio(s) importado(s) e {outcome.counts.notices} aviso(s) removidos.</p>
          <p>{outcome.counts.retainedProducts} produto(s) preservado(s) pelos critérios da prévia.</p>
          {outcome.archived && <p>Conta arquivada neste perfil.</p>}
          <BotaoAcaoCompacto variante="primario" onClick={close}>Concluir</BotaoAcaoCompacto>
        </div> : <>
          <fieldset disabled={busy} className={styles.choices}><legend>O que deseja limpar?</legend>
            {choices.map(choice => <label key={choice.key}><input type="checkbox" checked={options[choice.key]}
              onChange={event => changeOption(choice.key, event.target.checked)} />
              <span><strong>{choice.title}</strong><small>{choice.help}</small></span>
            </label>)}
          </fieldset>
          {loading && <p role="status">Conferindo os registros desta conta…</p>}
          {!selected && <p role="status">Selecione ao menos uma opção.</p>}
          {review && !loading && <>
            <section className={styles.summary} aria-label="Prévia da limpeza">
              <h3>Prévia da limpeza</h3>
              <dl>{[
                ['Produtos a excluir', review.counts.products], ['Vínculos a remover', review.counts.links],
                ['Anúncios importados a remover', review.counts.listings], ['Avisos a limpar', review.counts.notices],
                ['Produtos a preservar', review.counts.retainedProducts],
              ].map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{count}</dd></div>)}</dl>
            </section>
            {review.retained.length > 0 && <details><summary>Por que alguns produtos serão preservados?</summary>
              <ul>{review.retained.map(product => <li key={product.id}><strong>{product.name}</strong><small>{product.reason}</small></li>)}</ul>
            </details>}
            <p className={styles.help}>A limpeza considera esta conta dentro de {review.companyName}. Vendas, movimentos de estoque e documentos financeiros e fiscais continuam disponíveis no histórico.</p>
            {review.blockers.map(message => <p key={message} role="status" className={styles.warning}>{message}</p>)}
            <label className={styles.confirmation}>Digite <strong>{review.accountName}</strong> para confirmar
              <input value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy || !!review.blockers.length}
                autoComplete="off" spellCheck={false} aria-label="Nome da conta para confirmar a limpeza" />
            </label>
          </>}
          {error && <div role="alert"><p>{error}</p><BotaoAcaoCompacto disabled={busy} onClick={() => {
            setReview(null); setConfirmation(''); attempt.current = null; setReload(value => value + 1);
          }}>Conferir prévia novamente</BotaoAcaoCompacto></div>}
          <footer className={styles.actions}>
            <BotaoAcaoCompacto disabled={busy} onClick={close}>Cancelar</BotaoAcaoCompacto>
            <BotaoAcaoCompacto variante="destrutivo" disabled={busy || loading || !selected || !review || !!review.blockers.length || confirmation !== review.accountName}
              onClick={() => void execute()}>{busy ? 'Limpando…' : 'Confirmar limpeza'}</BotaoAcaoCompacto>
          </footer>
        </>}
      </div>
    </section>
  </CardExpandidoModal>;
}
