'use client';
import { type CSSProperties, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import CampoBusca from '@/app/components/CampoBusca';
import CampoData from '@/app/components/CampoData';
import { marketplaceDateLabel } from '@/app/modules/marketplaces/date-format';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { correspondeBusca, formatarMoedaDigitada } from '@/app/lib/formatters';
import { lotGenerationLabel, lotMoney, lotSource, lotTotals, lotUnits, type PriceLot, type PriceLotDetail, type PriceLotItem } from '@/app/modules/marketplaces/price-lots';
import type { PriceLotPdfMode } from '@/app/modules/marketplaces/price-lot-pdf';
import { lotsPath, type LotsRequest } from './usePriceLotCapture';
import { createLotPanelSession } from './price-lot-panel-session';
import styles from './price-lots.module.css';
import Image from 'next/image';

function LotPhoto({ url, name }: { url: string | null; name: string | null }) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? <Image src={url} alt={`Foto de ${name || 'produto'}`} width={64} height={64} unoptimized onError={() => setFailed(true)} /> : <span>{url ? 'Foto indisponível' : 'Sem foto'}</span>;
}

function draftFor(lot?: PriceLot) { return { name: lot?.name || '', supplier: lot?.supplier || '', receivedOn: lot?.received_on || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), notes: lot?.notes || '', purchaseCost: lot?.purchase_cost_cents == null ? '' : formatarMoedaDigitada(String(lot.purchase_cost_cents)) }; }
function positionLotCostCursor(input: HTMLInputElement) { input.setSelectionRange(input.value.length, input.value.length); }
type Props = { companyId: string; request: LotsRequest; onClose: () => void; onActivate?: (detail: PriceLotDetail) => void; onUpdated?: (detail: PriceLotDetail) => void; onResolve?: (item: PriceLotItem, lot: PriceLot) => void; initialId?: string; createInitially?: boolean; dark?: boolean; brand?: string };

export default function PriceLotsPanel({ companyId, request, onClose, onActivate, onUpdated, onResolve, initialId, createInitially = false, dark = false, brand = '#003E73' }: Props) {
  const [lots, setLots] = useState<PriceLot[]>([]), [detail, setDetail] = useState<PriceLotDetail | null>(null);
  const [canEdit, setCanEdit] = useState(false), [hasMore, setHasMore] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [editing, setEditing] = useState(createInitially), [draft, setDraft] = useState(draftFor()), [search, setSearch] = useState(''), [remove, setRemove] = useState<PriceLotItem | null>(null);
  const [resumeList, setResumeList] = useState(false);
  const [choosingPdf, setChoosingPdf] = useState(false);
  const [pdfMode, setPdfMode] = useState<PriceLotPdfMode>('detailed');
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [dismissed, setDismissed] = useState(false);
  const session = useRef<ReturnType<typeof createLotPanelSession> | null>(null);
  if (!session.current) session.current = createLotPanelSession();
  const panelRequest = useCallback((path: string, options?: RequestInit) => session.current!.run(signal => request(path, { ...options, signal })), [request]);
  const exportButton = useRef<HTMLButtonElement>(null), selectedPdfOption = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!choosingPdf) return; const frame = requestAnimationFrame(() => selectedPdfOption.current?.focus()); return () => cancelAnimationFrame(frame); }, [choosingPdf]);
  function cancelPdf() { setChoosingPdf(false); requestAnimationFrame(() => exportButton.current?.focus()); }
  const createId = useRef(crypto.randomUUID()), live = useRef(true);
  useEffect(() => {
    live.current = true;
    if (!session.current?.isOpen()) session.current = createLotPanelSession();
    return () => { live.current = false; session.current?.close(); };
  }, []);
  function dismiss() {
    live.current = false;
    session.current?.close();
    setDismissed(true);
    onClose();
  }
  const accept = useCallback((next: PriceLotDetail) => { if (!live.current) return; setDetail(next); setDraft(draftFor(next.lot)); setGeneratedAt(new Date()); onUpdated?.(next); }, [onUpdated]);
  const load = useCallback(async (id?: string, append = false, edit = false) => {
    setLoading(true); setError('');
    try {
      const value = await panelRequest(`${lotsPath}?empresaId=${encodeURIComponent(companyId)}${id ? `&id=${encodeURIComponent(id)}` : append ? `&offset=${lots.length}` : ''}`) as PriceLotDetail & { lots: PriceLot[]; hasMore: boolean };
      if (!live.current) return;
      setCanEdit(value.canEdit);
      if (id) { accept(value); setEditing(edit); } else { setLots(old => append ? [...old, ...value.lots] : value.lots); setHasMore(value.hasMore); }
    } catch (reason) { if (live.current) setError((reason as Error).message); } finally { if (live.current) setLoading(false); }
  }, [accept, companyId, lots.length, panelRequest]);
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { const frame = requestAnimationFrame(() => void loadRef.current(initialId)); return () => cancelAnimationFrame(frame); }, [initialId]);
  async function mutate(action: string, data: Record<string, unknown> = {}) {
    if (!detail) return; setBusy(true); setError('');
    try { const next = await panelRequest(lotsPath, { method: 'PATCH', body: JSON.stringify({ empresaId: companyId, id: detail.lot.id, action, ...data }) }) as PriceLotDetail; if (!live.current) return; accept(next); return next; }
    catch (reason) { if (live.current) setError((reason as Error).message); } finally { if (live.current) setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const continueReading = !detail || (submitter instanceof HTMLButtonElement && submitter.value === 'continue');
    try {
      let next = await panelRequest(lotsPath, { method: detail ? 'PATCH' : 'POST', body: JSON.stringify({ empresaId: companyId, id: detail?.lot.id || createId.current, ...(detail ? { action: 'metadata' } : {}), ...draft }) }) as PriceLotDetail;
      if (!live.current) return;
      if (continueReading && onActivate && next.lot.status === 'closed') next = await reopen(next);
      if (!live.current) return;
      accept(next); setEditing(false); setCanEdit(next.canEdit);
      if (continueReading && onActivate) { onActivate(next); dismiss(); }
    } catch (reason) { if (live.current) setError((reason as Error).message); } finally { if (live.current) setBusy(false); }
  }
  async function reopen(value: PriceLotDetail) {
    return await panelRequest(lotsPath, { method: 'PATCH', body: JSON.stringify({ empresaId: companyId, id: value.lot.id, action: 'status', status: 'open' }) }) as PriceLotDetail;
  }
  async function continueLot(lot: PriceLot) {
    if (!onActivate || busy || loading) return;
    setBusy(true); setError('');
    try {
      let next = await panelRequest(`${lotsPath}?empresaId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(lot.id)}`) as PriceLotDetail;
      if (!live.current) return;
      if (!next.canEdit) throw new Error('Seu acesso permite apenas visualizar este lote.');
      if (next.lot.status === 'closed') {
        // A ação de reabertura deve ser explícita, inclusive se outra pessoa concluiu o lote.
        if (lot.status !== 'closed') throw new Error('Este lote foi concluído. Atualize a lista e use Reabrir e continuar.');
        next = await reopen(next);
      }
      if (!live.current) return;
      accept(next); onActivate(next); dismiss();
    } catch (reason) { if (live.current) setError((reason as Error).message); }
    finally { if (live.current) setBusy(false); }
  }
  function showLotsForResume() {
    setEditing(false); setDetail(null); setChoosingPdf(false); setResumeList(true); setSearch(''); void load();
  }
  function newLot() {
    createId.current = crypto.randomUUID(); setDetail(null); setDraft(draftFor()); setEditing(true); setChoosingPdf(false); setError('');
  }
  async function download(mode: PriceLotPdfMode) {
    if (!detail) return; setBusy(true); setError('');
    try {
      // Relê o salvo; nunca exporta rascunho não persistido.
      const saved = await panelRequest(`${lotsPath}?empresaId=${encodeURIComponent(companyId)}&id=${encodeURIComponent(detail.lot.id)}`) as PriceLotDetail;
      if (!live.current) return;
      accept(saved);
      const generationDate = new Date();
      setGeneratedAt(generationDate);
      const bytes = await session.current!.run(async signal => {
        const { createPriceLotPdf, loadLotPhoto } = await import('@/app/modules/marketplaces/price-lot-pdf');
        if (signal.aborted) throw signal.reason;
        return createPriceLotPdf(saved, url => signal.aborted ? Promise.resolve(null) : loadLotPhoto(url), { mode, generatedAt: generationDate });
      }, 120_000);
      if (!live.current) return;
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      const link = document.createElement('a'); link.href = url; link.download = `lote-${saved.lot.name.replace(/[^\p{L}\p{N}-]/gu, '-').slice(0, 80)}-${mode === 'summary' ? 'resumido' : 'detalhado'}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      cancelPdf();
    } catch (reason) { if (live.current) setError((reason as Error).message || 'Não foi possível gerar o PDF.'); } finally { if (live.current) setBusy(false); }
  }
  const totals = detail ? lotTotals(detail.items, detail.lot.purchase_cost_cents) : null;
  const writable = canEdit && detail?.lot.status === 'open';
  if (dismissed) return null;
  return <><CardExpandidoModal aberto rotulo="Lotes recebidos — AvantaPreços" onFechar={dismiss}><section className={`${styles.panel} ${editing ? styles.compactForm : ''} ${dark ? styles.dark : ''}`} style={{ '--lot-brand': brand } as CSSProperties} aria-busy={loading || busy}>
    <header className={styles.header}><div><p>AvantaPreços</p><h2>{editing ? (detail ? 'Editar lote' : 'Criar lote') : detail ? detail.lot.name : resumeList ? 'Continuar lote existente' : 'Lotes recebidos'}</h2></div><button type="button" onClick={dismiss} aria-label="Fechar lotes recebidos">×</button></header>
    <div className={styles.body}>
      {error && <p className={styles.error} role="alert">{error} {!detail&&<button type="button" disabled={busy || loading} onClick={() => void load(initialId)}>Tentar novamente</button>}</p>}
      {loading && <p role="status">Carregando lotes salvos…</p>}
      {busy && <p role="status">Salvando ou preparando o arquivo. Você pode fechar; confira o lote ao reabrir antes de repetir a operação.</p>}
      {editing&&!loading&&!error&&!canEdit&&<p role="status">Seu acesso permite apenas visualizar lotes. Peça ao gestor um acesso operacional para criar ou alterar.</p>}
      {editing && <div className={`${styles.actions} ${styles.lotChoice}`} role="group" aria-label="Escolher lote"><button type="button" disabled={busy || loading || !detail} aria-pressed={!detail} onClick={newLot}>Novo lote</button><button type="button" disabled={busy || loading} onClick={showLotsForResume}>Continuar lote existente</button></div>}
      {editing ? <form className={styles.form} onSubmit={save}>
        <div className={`${styles.dateCostRow} ${styles.wide}`}>
          <label>Data do lote<CampoData anoCurto required value={draft.receivedOn} aria-label="Data do lote" onChange={receivedOn => setDraft(current => ({ ...current, receivedOn }))} /></label>
          <label>Valor do lote (R$)<input aria-label="Valor de custo do lote (R$)" inputMode="numeric" autoComplete="off" placeholder="0,00" value={draft.purchaseCost} onFocus={event => positionLotCostCursor(event.currentTarget)} onClick={event => positionLotCostCursor(event.currentTarget)} onChange={event => {
            const input = event.currentTarget;
            const deleting = (event.nativeEvent as InputEvent).inputType?.startsWith('delete');
            const purchaseCost = deleting && /^0*$/.test(input.value.replace(/\D/g, '')) ? '' : formatarMoedaDigitada(input.value);
            setDraft(current => ({ ...current, purchaseCost }));
            requestAnimationFrame(() => { if (input.isConnected && document.activeElement === input) input.setSelectionRange(input.value.length, input.value.length); });
          }} /></label>
        </div>
        <label>Nome do lote<input required maxLength={120} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <label>Fornecedor / origem<input maxLength={180} value={draft.supplier} onChange={e => setDraft({ ...draft, supplier: e.target.value })} /></label>
        <label className={styles.wide}>Informações do lote<textarea maxLength={2000} rows={2} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} /></label>
        {detail?.lot.status === 'closed' && onActivate && <p id="lot-reopen-notice" className={`${styles.note} ${styles.wide}`}>Salvar e continuar reabre este lote para novas leituras.</p>}
        <div className={`${styles.formActions} ${styles.wide} ${detail && onActivate ? styles.withContinue : ''}`}><button type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(draftFor(detail?.lot)); }}>Cancelar</button><button type="submit" disabled={busy || loading || !canEdit} className={detail && onActivate ? undefined : onActivate ? styles.readingAction : styles.primary}>{detail ? 'Salvar' : onActivate ? 'Criar e iniciar leituras' : 'Criar lote'}</button>{detail && onActivate && <button type="submit" name="intent" value="continue" className={styles.readingAction} aria-describedby={detail.lot.status === 'closed' ? 'lot-reopen-notice' : undefined} disabled={busy || loading || !canEdit}>Salvar e continuar</button>}</div>
      </form> : detail && totals ? <>
        <div className={`${styles.actions} ${styles.detailActions}`} role="group" aria-label="Ações do lote"><button type="button" disabled={busy || loading} onClick={() => { setDetail(null); setChoosingPdf(false); void load(); }}>Todos os lotes</button>{canEdit && <button type="button" disabled={busy || loading} onClick={() => { setChoosingPdf(false); setEditing(true); }}>Editar lote</button>}<button type="button" disabled={busy || loading} onClick={() => void load(detail.lot.id)}>Atualizar</button></div>
        <div className={styles.reportHeader}><strong>{detail.lot.company_name}</strong><span>Gerado em {lotGenerationLabel(generatedAt)} · {lotUnits(totals.quantity)}{detail.lot.purchase_cost_cents !== null && ` · Valor pago: ${lotMoney(detail.lot.purchase_cost_cents)}`}</span></div>
        <div className={styles.totals}>{(['minimum', 'medium', 'ideal'] as const).map((key, i) => <div key={key} className={styles[key]}><span>{totals.pending ? 'Subtotal' : 'Total'} {['mínimo', 'médio', 'ideal'][i]}</span><strong>{lotMoney(totals.sales[key])}</strong><small>Lucro bruto: {totals.difference ? lotMoney(totals.difference[key]) : totals.pending ? 'pendente' : '—'}</small></div>)}</div>
        {totals.pending > 0 && <p className={styles.warning} role="status">{lotUnits(totals.pending)} sem preço · Totais parciais</p>}
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Produtos do lote. Role na horizontal para ver todas as colunas."><table><thead><tr><th rowSpan={2}>Foto</th><th rowSpan={2}>Descrição</th><th rowSpan={2}>Código lido</th><th rowSpan={2}>Qtd.</th><th rowSpan={2}>Média / referência</th><th colSpan={3}>Preços de venda (unitários)</th>{writable && <th rowSpan={2}>Ações</th>}</tr><tr><th className={styles.minimum}>Mínimo</th><th className={styles.medium}>Médio</th><th className={styles.ideal}>Ideal</th></tr></thead><tbody>{detail.items.map(item => <tr key={item.id}>
          <td><LotPhoto key={item.image_url} url={item.image_url} name={item.product_name} /></td>
          <td><strong className={styles.productName}>{item.product_name || 'Aguardando identificação'}</strong>{item.product_description && <small className={styles.productDescription}>{item.product_description.slice(0, 180)}</small>}</td><td>{item.scanned_code}</td>
          <td>{writable ? <input className={styles.quantity} aria-label={`Quantidade de ${item.product_name || item.scanned_code}`} type="number" min={1} max={100000} defaultValue={item.quantity} key={`${item.id}:${item.quantity}`} disabled={busy} onBlur={event => { const quantity = Number(event.currentTarget.value); if (quantity !== item.quantity) void mutate('quantity', { itemId: item.id, quantity }); }} /> : item.quantity}</td>
          <td>{lotMoney(item.market_price_cents)}<small>{lotSource(item.reference_source)}</small></td><td className={styles.minimum}>{lotMoney(item.minimum_price_cents)}</td><td className={styles.medium}>{lotMoney(item.medium_price_cents)}</td><td className={styles.ideal}>{lotMoney(item.ideal_price_cents)}</td>
          {writable && <td><div className={styles.rowActions}>{onResolve && item.market_price_cents === null && <button type="button" disabled={busy} onClick={() => { onResolve(item, detail.lot); dismiss(); }}>Consultar</button>}<button type="button" disabled={busy} onClick={() => setRemove(item)}>Remover</button></div></td>}
        </tr>)}</tbody></table>{!detail.items.length && <p>O lote ainda não recebeu leituras.</p>}</div>
        <div className={`${styles.actions} ${styles.detailActions}`} role="group" aria-label="Conferência e leituras do lote">{canEdit && <button type="button" disabled={busy || loading} onClick={async () => { const next = await mutate('status', { status: detail.lot.status === 'open' ? 'closed' : 'open' }); if (next?.lot.status === 'closed') onUpdated?.(next); }}>{detail.lot.status === 'open' ? 'Concluir conferência' : 'Reabrir conferência'}</button>}{canEdit && onActivate && <button type="button" className={styles.readingAction} disabled={busy || loading} onClick={() => void continueLot(detail.lot)}>{detail.lot.status === 'closed' ? 'Reabrir e continuar leituras' : 'Continuar leituras neste lote'}</button>}</div>
      </> : !loading && <>
        <div className={`${styles.actions} ${styles.lotChoice} ${!canEdit ? styles.singleAction : ''}`} role="group" aria-label="Ações dos lotes"><button type="button" disabled={busy} onClick={() => void load()}>Atualizar</button>{canEdit && <button className={styles.primary} type="button" disabled={busy} onClick={newLot}>Criar novo lote</button>}</div>
        <CampoBusca value={search} onChange={setSearch} placeholder="Buscar nos lotes carregados" aria-label="Buscar lotes recebidos" />
        <div className={styles.savedList}>{lots.filter(lot => correspondeBusca(`${lot.name} ${lot.supplier} ${lot.notes}`, search)).map(lot => <article key={lot.id} className={styles.savedLot}><button type="button" className={styles.savedLotTitle} disabled={busy || loading} onClick={() => void load(lot.id)}><strong>{lot.name}</strong><span>Data do lote: {marketplaceDateLabel(lot.received_on)} · {lot.status === 'open' ? 'Em conferência' : 'Concluído'} · Custo: {lot.purchase_cost_cents === null ? 'não informado' : lotMoney(lot.purchase_cost_cents)}</span></button>{canEdit && <div className={`${styles.actions} ${styles.detailActions}`} role="group" aria-label={`Ações do lote ${lot.name}`}><button type="button" disabled={busy || loading} onClick={() => void load(lot.id, false, true)}>Editar lote</button>{onActivate && <button type="button" className={styles.readingAction} disabled={busy || loading} onClick={() => void continueLot(lot)}>{lot.status === 'closed' ? 'Reabrir e continuar' : 'Continuar leituras'}</button>}</div>}</article>)}</div>
        {!lots.length && !error && <p>Nenhum lote salvo. A consulta comum continua funcionando normalmente.</p>}{hasMore && <button type="button" disabled={loading} onClick={() => void load(undefined, true)}>Carregar mais lotes</button>}
      </>}
    </div>
    {detail && !editing && <footer className={styles.footer}>{choosingPdf ? <form className={styles.pdfChoice} onSubmit={event => { event.preventDefault(); if (!busy) void download(pdfMode); }}><fieldset disabled={busy}><legend>Formato do arquivo</legend><label><input ref={pdfMode === 'detailed' ? selectedPdfOption : undefined} type="radio" name="lot-pdf-mode" value="detailed" checked={pdfMode === 'detailed'} onChange={() => setPdfMode('detailed')} />Detalhado — todos os produtos</label><label><input ref={pdfMode === 'summary' ? selectedPdfOption : undefined} type="radio" name="lot-pdf-mode" value="summary" checked={pdfMode === 'summary'} onChange={() => setPdfMode('summary')} />Resumido — somente totais</label></fieldset><div className={styles.actions}><button type="button" disabled={busy} onClick={cancelPdf}>Cancelar</button><button className={styles.primary} type="submit" disabled={busy || loading}>Gerar arquivo</button></div></form> : <button ref={exportButton} className={styles.primary} type="button" disabled={busy || loading} onClick={() => setChoosingPdf(true)}>Gerar PDF</button>}</footer>}
  </section></CardExpandidoModal>
    <ModalConfirmacao aberto={Boolean(remove)} titulo="Remover produto do lote?" mensagem="Esta leitura será removida somente do lote. O histórico de preços será preservado." carregando={busy} cancelarDuranteCarregamento textoCancelar={busy ? 'Fechar painel' : 'Cancelar'} darkMode={dark} corPrimaria={brand} aoCancelar={() => { if (busy) dismiss(); else setRemove(null); }} aoConfirmar={async () => { if (remove) { const next = await mutate('remove', { itemId: remove.id }); if (next) setRemove(null); } }} />
  </>;
}
