'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { defaultInitialStockSelections, stockSourceKey, type InitialStockRow } from '@/app/modules/marketplaces/services/initial-stock-model';
import { marketplaceClientRequest } from './Anunciados';
import MarketplaceSelect from './MarketplaceSelect';
import styles from './marketplaces.module.css';

export default function InitialStockLoad({ companyId, dark, brand, onBusyChange, onUpdated, onClose }: {
  companyId: string; dark: boolean; brand: string; onBusyChange: (busy: boolean) => void; onUpdated: () => Promise<void>; onClose: () => void;
}) {
  const [rows, setRows] = useState<InitialStockRow[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<'loading' | 'review' | 'saving'>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [confirming, setConfirming] = useState(false);
  const requestKeys = useRef<Record<string, string>>({});
  const controller = useRef<AbortController | null>(null);
  const working = useRef(false);

  const preview = useCallback(async () => {
    if (working.current) return;
    working.current = true; onBusyChange(true);
    const current = new AbortController(); controller.current = current;
    setPhase('loading'); setError(''); setErrors({}); setResult(''); setRows([]); setSelections({}); setProgress(0);
    try {
      let cursor: string | null = null; const collected: InitialStockRow[] = [];
      do {
        const batch: { rows: InitialStockRow[]; nextCursor: string | null } = await marketplaceClientRequest('produtos/estoque-anuncios', { empresaId: companyId, action: 'preview', cursor }, current.signal);
        if (current.signal.aborted) return;
        collected.push(...batch.rows); setProgress(collected.length); cursor = batch.nextCursor;
      } while (cursor);
      // Uma única origem elegível é sugerida; múltiplas contas exigem escolha.
      setRows(collected); setSelections(defaultInitialStockSelections(collected));
      requestKeys.current = Object.fromEntries(collected.map(row => [row.productId, crypto.randomUUID()]));
    } catch (failure) {
      if (!current.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível consultar os anúncios.');
    } finally {
      if (!current.signal.aborted) { working.current = false; setPhase('review'); onBusyChange(false); }
    }
  }, [companyId, onBusyChange]);

  useEffect(() => {
    const timer = setTimeout(() => { void preview(); }, 0);
    return () => { clearTimeout(timer); controller.current?.abort(); working.current = false; onBusyChange(false); };
  }, [preview, onBusyChange]);

  const selected = rows.filter(row => row.sources.some(source => stockSourceKey(source) === selections[row.productId]));
  const ignored = rows.filter(row => !row.sources.length && !row.warning).length;
  async function apply() {
    if (working.current || !selected.length) return;
    working.current = true; onBusyChange(true); setPhase('saving'); setError(''); setErrors({});
    const current = new AbortController(); controller.current = current;
    const completed = new Set<string>(), failures: Record<string, string> = {};
    let loaded = 0, preserved = 0;
    try {
      for (const row of selected) {
        const source = row.sources.find(source => stockSourceKey(source) === selections[row.productId])!;
        try {
          const response = await marketplaceClientRequest('produtos/estoque-anuncios', { empresaId: companyId, action: 'apply', productId: row.productId, revision: row.revision,
            connectionId: source.connectionId, listingId: source.listingId, quantity: source.quantity, confirmation: true, requestKey: requestKeys.current[row.productId] }, current.signal);
          if (response.status === 'loaded') loaded++; else preserved++;
          completed.add(row.productId);
        } catch (failure) {
          if (current.signal.aborted) return;
          failures[row.productId] = failure instanceof Error ? failure.message : 'Não foi possível salvar este saldo.';
        }
      }
      if (current.signal.aborted) return;
      setRows(previous => previous.filter(row => !completed.has(row.productId))); setErrors(failures);
      setResult(`${loaded} saldos carregados no local.${preserved ? ` ${preserved} saldos já definidos foram mantidos.` : ''}${Object.keys(failures).length ? ' Alguns produtos não foram carregados; confira os avisos abaixo.' : ''} Confira a sincronização dos anúncios vinculados.`);
      await onUpdated();
    } finally {
      if (!current.signal.aborted) { working.current = false; setConfirming(false); setPhase('review'); onBusyChange(false); }
    }
  }

  return <section className={styles.localSection} aria-labelledby="initial-stock-title">
    <h3 id="initial-stock-title">Carga inicial de estoque</h3>
    <p className={styles.help}>Usa a quantidade atual de um anúncio ativo por produto. Zerados e inativos ficam de fora. Saldos locais já definidos são mantidos.</p>
    <p className={styles.help}>Vincule os anúncios iguais antes desta carga. Não some as quantidades das contas.</p>
    {phase === 'loading' && <p role="status">Consultando anúncios… {progress} cadastros conferidos.</p>}
    {error && <p className={styles.connectionMessage} role="alert">{error}</p>}
    {result && <p className={styles.catalogSuccess} role="status">{result}</p>}
    <div className={styles.actionBar}>
      <button type="button" className={styles.primary} disabled={phase !== 'review' || !selected.length} onClick={() => setConfirming(true)}>{phase === 'saving' ? 'Carregando estoque…' : `Carregar ${selected.length} saldos no local`}</button>
      <button type="button" disabled={phase !== 'review'} onClick={() => void preview()}>Consultar novamente</button>
      <button type="button" disabled={phase === 'saving'} onClick={onClose}>{phase === 'loading' ? 'Cancelar consulta' : 'Fechar'}</button>
    </div>
    {phase !== 'loading' && <>
      {ignored > 0 && <p className={styles.help}>{ignored} cadastros sem anúncio ativo com quantidade foram desconsiderados.</p>}
      {!rows.length && !error && !result && <p className={styles.help}>Nenhum cadastro com estoque pendente para esta carga. Importe os anúncios existentes se ainda não estiverem cadastrados.</p>}
      {rows.filter(row => row.sources.length || row.warning).map(row => <div key={row.productId} className={styles.localSection}>
        <strong>{row.name}</strong>
        {row.warning && <p className={styles.connectionMessage} role="alert">{row.warning}</p>}
        {!!row.sources.length && <MarketplaceSelect id={`initial-stock-${row.productId}`} label="Anúncio que fornece o estoque inicial" value={selections[row.productId] || ''}
          options={[{ value: '', label: 'Não carregar este produto' }, ...row.sources.map(source => ({ value: stockSourceKey(source), label: `${source.quantity} un. · ${source.accountName} · ${source.listingId}`, detail: `Consulta em ${new Date(source.checkedAt).toLocaleString('pt-BR')}` }))]}
          placeholder="Escolha um anúncio, sem somar contas" disabled={phase === 'saving'} onChange={value => {
            setSelections(previous => ({ ...previous, [row.productId]: value })); requestKeys.current[row.productId] = crypto.randomUUID();
          }} />}
        {row.sources.length > 1 && <p className={styles.help}>Há mais de um anúncio ativo. Escolha apenas um como referência.</p>}
        {errors[row.productId] && <p className={styles.connectionMessage} role="alert">{errors[row.productId]}</p>}
      </div>)}
    </>}
    <ModalConfirmacao aberto={confirming} titulo="Confirmar carga inicial?" mensagem={`Carregar os saldos dos ${selected.length} produtos selecionados?\n\nApenas produtos sem estoque definido serão preenchidos. Saldos já definidos, inclusive zero, não serão substituídos. Não somamos quantidades das contas.\n\nApós confirmar, a sincronização automática usará esses saldos nos anúncios vinculados compatíveis.`}
      textoConfirmar="Carregar estoque" variante="primaria" carregando={phase === 'saving'} corPrimaria={brand} darkMode={dark} aoCancelar={() => { if (phase !== 'saving') setConfirming(false); }} aoConfirmar={() => { void apply(); }} />
  </section>;
}
