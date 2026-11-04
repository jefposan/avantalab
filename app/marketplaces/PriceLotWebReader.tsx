'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import CampoBusca from '@/app/components/CampoBusca';
import CampoMoeda from '@/app/components/CampoMoeda';
import { isValidEan, normalizeEan } from '@/app/modules/marketplaces/services/ean';
import { lotMoney, lotTotals, lotUnits, type PriceLotDetail } from '@/app/modules/marketplaces/price-lots';
import { Icon } from '@/app/projetos/components/Icon';
import { consultLotPrice, type LotPriceResult } from './price-lot-consultation';
import PriceProductStock from './PriceProductStock';
import type { LotRead, LotsRequest } from './usePriceLotCapture';
import styles from './price-lots.module.css';

export type PendingLotRead = { read: LotRead; code: string };
type Props = { companyId: string; detail: PriceLotDetail; request: LotsRequest; capture: (code: string) => Promise<LotRead | null>; resolve: (read: LotRead | null, historyId?: string) => Promise<void>; initialRead?: PendingLotRead; onShowLot: () => void; onPause: () => void; onBusyChange: (busy: boolean) => void; onRefresh: () => Promise<void>; dark?: boolean; brand: string };
export default function PriceLotWebReader({ companyId, detail, request, capture, resolve, initialRead, onShowLot, onPause, onBusyChange, onRefresh, dark, brand }: Props) {
  const [code, setCode] = useState(initialRead?.code || ''), [armed, setArmed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [result, setResult] = useState<LotPriceResult | null>(null), [manual, setManual] = useState(false), [manualName, setManualName] = useState(''), [manualPrice, setManualPrice] = useState('');
  const [stockBusy, setStockBusy] = useState(false);
  const [canManagePrice, setCanManagePrice] = useState(false);
  const onStockBusyChange = useCallback((value: boolean) => { setStockBusy(value); onBusyChange(value); }, [onBusyChange]);
  const onStockUpdated = useCallback((revision: number) => setResult(current => current ? { ...current, revision } : current), []);
  const input = useRef<HTMLInputElement>(null), pending = useRef<PendingLotRead | undefined>(initialRead), locked = useRef(false), controller = useRef<AbortController | null>(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); onBusyChange(false); }; }, [onBusyChange]);
  const totals = lotTotals(detail.items, detail.lot.purchase_cost_cents);
  const recoveringDescription = Boolean(initialRead && initialRead.code === code && code.trim().length >= 3);
  function start() { if (locked.current || stockBusy) return; locked.current = true; setBusy(true); onBusyChange(true); setError(''); return true; }
  function finish() { locked.current = false; if (alive.current) { setBusy(false); onBusyChange(false); requestAnimationFrame(() => { const field = input.current; if (!manual && field && (document.activeElement === document.body || field.closest('section')?.contains(document.activeElement))) field.focus(); }); } }
  async function consult(productId?: string, retry = false) {
    const value = code.trim();
    if (!retry && !recoveringDescription && !isValidEan(normalizeEan(value))) { setError('Informe um EAN válido antes de consultar.'); return; }
    if (!start()) return;
    const abort = new AbortController(); controller.current = abort;
    setManual(false); setNotice(''); setResult(null);
    try {
      const sameRead = pending.current && pending.current.code === value;
      if (!sameRead) {
        const read = await capture(value);
        if (!read) throw new Error('Selecione um lote em conferência antes de ler produtos.');
        pending.current = { read, code: value };
      }
      if (!alive.current) return;
      const next = await consultLotPrice({ companyId, code: value, productId, request, signal: abort.signal });
      if (!alive.current) return;
      setResult(next);
      if (next.result?.status === 'choose') { setNotice('Selecione o produto correspondente à leitura já salva.'); return; }
      if (next.result?.status === 'not_found') { setManual(true); setManualName(''); setManualPrice(''); setNotice('Leitura salva sem identificação. Informe o produto e uma referência manual ou consulte este item depois.'); return; }
      if (next.historyId) {
        await resolve(pending.current!.read, next.historyId);
        if (!alive.current) return;
        pending.current = undefined; setCode(''); setNotice('Produto incluído no lote. Pronto para a próxima leitura.');
      } else setNotice('Leitura salva, mas ainda sem preço. Consulte este item depois pela conferência do lote.');
    } catch (reason) { if (alive.current && !abort.signal.aborted) setError((reason as Error).message); }
    finally { finish(); }
  }
  async function saveManual(event: FormEvent) {
    event.preventDefault(); if (!pending.current || !start()) return;
    try {
      const response = await request('/api/modulos/marketplaces/precos/historico', { method: 'POST', body: JSON.stringify({ empresaId: companyId, ean: isValidEan(pending.current.code) ? pending.current.code : '', productName: manualName, marketPrice: manualPrice }) }) as { history: { id: string } };
      await resolve(pending.current.read, response.history.id);
      if (alive.current) { setManual(false); pending.current = undefined; setCode(''); setResult({ historyId: response.history.id, name: manualName }); setNotice('Referência manual salva no mesmo produto do lote.'); }
    } catch (reason) { if (alive.current) setError((reason as Error).message); }
    finally { finish(); }
  }
  async function refresh() { if (!start()) return; try { await onRefresh(); } catch (reason) { if (alive.current) setError((reason as Error).message); } finally { finish(); } }
  async function refreshPrice() {
    if (!result?.localProductId || !result.revision || !start()) return;
    try {
      const body = await request('/api/modulos/marketplaces/precos/produto', { method: 'PATCH', signal: AbortSignal.timeout(65_000), body: JSON.stringify({ empresaId: companyId, action: 'research', productId: result.localProductId, revision: result.revision, requestKey: crypto.randomUUID() }) }) as { result: import('@/app/modules/marketplaces/services/mercadolivre-price-consultation').PriceConsultationResult };
      if (alive.current) { const value=body.result; setResult({ result:value, historyId:value.historyId, localProductId:value.localProductId, revision:value.localProductRevision, name:value.product?.name || '', prices:value.prices }); setNotice(value.notice || 'Referência atualizada.'); }
    } catch (reason) { if (alive.current) setError(`${(reason as Error).message} Reabra o produto para conferir antes de repetir.`); }
    finally { finish(); }
  }
  return <section className={`${styles.panel} ${styles.webReader} ${dark ? styles.dark : ''}`} style={{ '--lot-brand': brand } as CSSProperties} aria-label="Inclusão de produtos no lote" aria-busy={busy}>
    <header className={styles.readerHeading}><div><small>Lote ativo</small><h2>{detail.lot.name}</h2></div><div className={styles.actions}><button type="button" disabled={busy || stockBusy} onClick={onShowLot}>{lotUnits(totals.quantity)} · Ver lote e totais</button><button type="button" disabled={busy || stockBusy} onClick={() => void refresh()}>Atualizar lote</button><button type="button" disabled={busy || stockBusy} onClick={onPause}>Pausar lote</button></div></header>
    <form className={styles.readerForm} onSubmit={event => { event.preventDefault(); void consult(); }}>
      <label htmlFor="web-lot-ean">EAN / código de barras</label>
      <div className={styles.readerInputRow}><CampoBusca id="web-lot-ean" inputRef={input} inputMode="numeric" autoComplete="off" value={code} onChange={value => { setCode(normalizeEan(value)); setResult(null); setManual(false); }} disabled={busy || stockBusy} placeholder="Bipe ou digite o EAN" rotuloLimpar="Limpar EAN do lote" onKeyDown={event => { if (event.key === 'Escape') setArmed(false); }} />
        <button type="button" disabled={busy || stockBusy} aria-pressed={armed} onClick={() => { setArmed(value => !value); requestAnimationFrame(() => { input.current?.focus(); input.current?.select(); }); }}><Icon name="barcode" size={20} />Ler EAN por aparelho</button>
        <button type="submit" className={styles.primary} disabled={busy || stockBusy || (!isValidEan(code) && !recoveringDescription)}>Consultar e incluir</button></div>
    </form>
    {busy && <p role="status">Salvando ou consultando produto…</p>}
    {notice && <p role="status">{notice}</p>}
    {result?.name && !result.prices && <p><strong>{result.name}</strong></p>}
    {result && (result.historyId || result.localProductId) && <PriceProductStock key={`${companyId}:${result.historyId || result.localProductId}`} companyId={companyId} historyId={result.historyId} productId={result.localProductId} request={request} disabled={busy} onBusyChange={onStockBusyChange} onStockUpdated={onStockUpdated} onAccessLoaded={setCanManagePrice} />}
    {error && <p className={styles.error} role="alert">{error} <button type="button" disabled={busy} onClick={() => void consult(undefined, pending.current?.code === code.trim())}>Tentar novamente</button></p>}
    {result?.result?.candidates?.length ? <div className={styles.readerCandidates}>{result.result.candidates.map(candidate => <button type="button" key={candidate.id} disabled={busy} onClick={() => void consult(candidate.id, true)}>{candidate.name}</button>)}</div> : null}
    {result?.prices && <div className={styles.readerResult}><strong>{result.name}</strong><span>Referência: {lotMoney(Math.round(result.prices.market * 100))}</span><span className={styles.minimum}>Mínimo: {lotMoney(Math.round(result.prices.minimum * 100))}</span><span className={styles.medium}>Médio: {lotMoney(Math.round(result.prices.medium * 100))}</span><span className={styles.ideal}>Ideal: {lotMoney(Math.round(result.prices.ideal * 100))}</span></div>}
    {result?.localProductId && result.revision && canManagePrice && <button type="button" disabled={busy || stockBusy} onClick={() => void refreshPrice()}>Atualizar preço</button>}
    {manual && <form className={styles.form} onSubmit={saveManual}><label>Nome do produto<input required value={manualName} disabled={busy} onChange={event => setManualName(event.target.value)} /></label><label>Preço médio de referência (R$)<CampoMoeda required value={manualPrice} disabled={busy} onChange={setManualPrice} /></label><div className={styles.actions}><button type="submit" disabled={busy} className={styles.primary}>Salvar referência no lote</button></div></form>}
  </section>;
}
