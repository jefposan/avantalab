'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CampoBusca from '@/app/components/CampoBusca';
import { corTextoSobreFundo } from '@/app/lib/cores-avanta';
import { normalizarTexto } from '@/app/lib/formatters';
import { productCleanupOrigin, type ProductCleanupItem, type ProductCleanupList, type ProductCleanupReview, type ProductCleanupResult } from '@/app/modules/marketplaces/product-cleanup';
import { marketplaceClientRequest } from './Anunciados';
import MarketplaceSelect from './MarketplaceSelect';
import styles from './ProductCleanup.module.css';
import marketplaceStyles from './marketplaces.module.css';

type Props = { companyId: string; dark: boolean; brand: string; request?: typeof marketplaceClientRequest;
  onClose: () => void; onBusyChange: (busy: boolean) => void; onCleaned: (result: ProductCleanupResult) => void };
export default function ProductCleanup({ companyId, dark, brand, request = marketplaceClientRequest, onClose, onBusyChange, onCleaned }: Props) {
  const [list, setList] = useState<ProductCleanupList | null>(null);
  const [review, setReview] = useState<ProductCleanupReview | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [outcome, setOutcome] = useState<ProductCleanupResult | null>(null);
  const active = useRef(true), locked = useRef(false), attempt = useRef<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null), selectAll = useRef<HTMLInputElement>(null);
  const close = () => { if (!locked.current) onClose(); };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { onBusyChange(saving); return () => onBusyChange(false); }, [saving, onBusyChange]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void request('produtos/limpeza', { empresaId: companyId, action: 'list' }, AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]))
      .then(data => { if (!controller.signal.aborted) { setList(data as ProductCleanupList); setSelection(previous => previous.filter(id => (data as ProductCleanupList).products.some(p => p.id === id && !p.blockers.length))); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Não foi possível conferir os cadastros.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, request, reload]);
  const rows = useMemo(() => (list?.products || []).filter(p => (filter !== 'unlinked' || !p.linked)
    && (filter !== 'avantaprecos' || p.origin === 'avantaprecos')
    && (!query || normalizarTexto([p.name, p.ean, p.sku].filter(Boolean).join(' ')).includes(normalizarTexto(query)))), [list, filter, query]);
  const available = rows.filter(p => !p.blockers.length);
  const allSelected = available.length > 0 && available.every(p => selection.includes(p.id));
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = !allSelected && available.some(p => selection.includes(p.id)); }, [allSelected, available, selection]);
  useEffect(() => { if (review || outcome) title.current?.focus(); }, [review, outcome]);
  const toggle = (id: string) => setSelection(previous => previous.includes(id) ? previous.filter(v => v !== id) : [...previous, id]);
  function toggleAll() {
    const ids = new Set(available.map(p => p.id));
    setSelection(previous => allSelected ? previous.filter(id => !ids.has(id)) : [...new Set([...previous, ...ids])]);
  }
  async function inspect() {
    if (locked.current || !selection.length) return;
    locked.current = true; setReviewing(true); setError('');
    try {
      const data = await request('produtos/limpeza', { empresaId: companyId, action: 'review', productIds: selection }, AbortSignal.timeout(30_000)) as ProductCleanupReview;
      if (!active.current) return;
      if (!data.reviewToken || data.products.length !== selection.length) throw new Error('A prévia não confirmou todos os cadastros. Atualize a lista.');
      setReview(data); setAcknowledged(false); setConfirmation(''); attempt.current = null;
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'Não foi possível revisar a exclusão.'); }
    finally { locked.current = false; if (active.current) setReviewing(false); }
  }
  async function execute() {
    if (locked.current || !review || !acknowledged || confirmation !== review.companyName || review.products.some(p => p.blockers.length)) return;
    locked.current = true; setSaving(true); setError(''); attempt.current ||= crypto.randomUUID();
    try {
      const result = await request('produtos/limpeza', { empresaId: companyId, action: 'execute',
        productIds: review.products.map(p => p.id), reviewToken: review.reviewToken, confirmation,
        acknowledged, requestKey: attempt.current }, AbortSignal.timeout(50_000)) as ProductCleanupResult;
      if (result.historyPreserved !== true || result.removed !== review.products.length) throw new Error('A resposta não confirmou todos os cadastros. Confira antes de repetir esta tentativa.');
      if (active.current) { setOutcome(result); onCleaned(result); }
    } catch (reason) { if (active.current) setError(reason instanceof Error ? reason.message : 'A exclusão não foi confirmada.'); }
    finally { locked.current = false; if (active.current) setSaving(false); }
  }
  function back() { if (locked.current) return; setReview(null); setError(''); setAcknowledged(false); setConfirmation(''); }
  const productRow = (p: ProductCleanupItem, selectable: boolean) => <li key={p.id} className={styles.row}>
    {selectable && <label className={styles.selection} title={p.blockers[0]}><input type="checkbox" checked={selection.includes(p.id)} disabled={!!p.blockers.length || reviewing} onChange={() => toggle(p.id)} aria-label={'Selecionar ' + p.name} /></label>}
    <div className={styles.product}><strong>{p.name}</strong><span>EAN: {p.ean || 'Não informado'} · {productCleanupOrigin(p.origin)}</span>
      <small>{p.stock == null ? 'Saldo não informado' : 'Estoque: ' + p.stock + ' un.'} · {p.hasHistory ? 'Histórico preservado' : 'Sem histórico registrado'}</small>
      {!!p.disconnectedLinks && <small>{p.disconnectedLinks} referência(s) de contas desconectadas. Os vínculos locais serão removidos; históricos preservados.</small>}
      {p.blockers.map(message => <small key={message} className={styles.blocker}>{message}</small>)}
    </div>
  </li>;
  return <CardExpandidoModal aberto rotulo={review && !outcome ? 'Confirmar exclusão de cadastros' : 'Limpar cadastros'} onFechar={close} darkMode={dark}>
    <section className={styles.dialog + (dark ? ' ' + styles.dark + ' ' + marketplaceStyles.dark : '')} style={{ '--brand': brand, '--av-action-on-brand': corTextoSobreFundo(brand) } as CSSProperties}>
      <header className={styles.header}><div><h2 ref={title} tabIndex={-1}>{outcome ? 'Limpeza concluída' : review ? 'Confirmar exclusão' : 'Limpar cadastros'}</h2><p>{review?.companyName || list?.companyName || 'Conferindo perfil…'}</p></div>
        <BotaoAcaoCompacto variante="discreto" somenteIcone disabled={saving || reviewing} onClick={close} aria-label="Fechar limpeza de cadastros"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></BotaoAcaoCompacto>
      </header>
      <div className={styles.body} aria-busy={loading || reviewing || saving}>
        {outcome ? <div role="status"><h3>{outcome.removed} cadastro(s) apagado(s) da lista ativa.</h3><p>Vendas, movimentações, documentos e histórico de preços foram preservados.</p></div>
          : review ? <>
            <p className={styles.warning}>Os {review.products.length} cadastro(s) abaixo serão apagados da lista ativa de <strong>{review.companyName}</strong>. Vendas, movimentações, documentos fiscais e financeiros e histórico de preços serão preservados. Esta ação não apaga anúncios nos marketplaces.</p>
            <ul className={styles.rows} aria-label="Cadastros que serão apagados">{review.products.map(p => productRow(p, false))}</ul>
            <label className={styles.confirmation} htmlFor="cleanup-company-confirmation">Para confirmar, digite <strong>{review.companyName}</strong><input id="cleanup-company-confirmation" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={saving} autoComplete="off" maxLength={220} /></label>
            <label className={styles.ack}><input type="checkbox" checked={acknowledged} disabled={saving} onChange={e => setAcknowledged(e.target.checked)} />Entendo que os cadastros selecionados serão apagados da lista ativa deste perfil.</label>
          </> : <>
            <p>Selecione os cadastros que deseja apagar deste perfil. Vendas, movimentações e histórico de preços serão preservados.</p>
            <div className={styles.filters}><div><label htmlFor="cleanup-product-search">Pesquisar cadastros</label><CampoBusca id="cleanup-product-search" placeholder="Nome, EAN ou código" value={query} onChange={setQuery} disabled={loading || reviewing} /></div>
              <MarketplaceSelect id="cleanup-origin-filter" placeholder="Todos" label="Filtrar cadastros" value={filter} onChange={setFilter} disabled={loading || reviewing} options={[{ value: 'all', label: 'Todos' }, { value: 'unlinked', label: 'Sem vínculo com anúncios' }, { value: 'avantaprecos', label: 'AvantaPreços' }]} />
            </div>
            {loading ? <p role="status">Conferindo cadastros e históricos…</p> : list && <>
              <div className={styles.selectBar}><label className={styles.ack}><input ref={selectAll} type="checkbox" checked={allSelected} disabled={!available.length || reviewing} onChange={toggleAll} />Selecionar todos{filter !== 'all' || query ? ' neste filtro' : ''} ({available.length} disponíveis)</label><span role="status">{selection.length} selecionado(s) no perfil</span></div>
              {!rows.length && <p role="status">Nenhum cadastro encontrado.</p>}
              <ul className={styles.rows} aria-label="Seleção de cadastros">{rows.map(p => productRow(p, true))}</ul>
              {rows.some(p => p.blockers.length) && <p className={styles.help}>Cadastros com saldo, anúncios em contas ainda conectadas ou operações em andamento ficam indisponíveis para esta limpeza. Confira o motivo junto do produto.</p>}
            </>}
          </>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
      <footer className={styles.footer}>
        {outcome ? <BotaoAcaoCompacto variante="primario" onClick={close}>Concluir</BotaoAcaoCompacto> : review ? <>
          <BotaoAcaoCompacto onClick={back} disabled={saving}>Voltar à seleção</BotaoAcaoCompacto>
          <BotaoAcaoCompacto variante="destrutivo" onClick={() => void execute()} disabled={saving || !acknowledged || confirmation !== review.companyName || review.products.some(p => p.blockers.length)}>{saving ? 'Apagando cadastros…' : 'Confirmar exclusão de ' + review.products.length + ' cadastro(s)'}</BotaoAcaoCompacto>
        </> : <><BotaoAcaoCompacto onClick={close} disabled={reviewing}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto onClick={() => setReload(v => v + 1)} disabled={loading || reviewing}>Atualizar lista</BotaoAcaoCompacto><BotaoAcaoCompacto variante="destrutivo" onClick={() => void inspect()} disabled={loading || reviewing || !selection.length}>{reviewing ? 'Revisando…' : 'Revisar exclusão (' + selection.length + ')'}</BotaoAcaoCompacto></>}
      </footer>
    </section>
  </CardExpandidoModal>;
}
