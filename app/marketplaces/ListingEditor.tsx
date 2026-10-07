'use client';

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import Tooltip from '@/app/components/Tooltip';
import { formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import { changedFields, EDIT_FIELDS, validateChanges, type EditField, type ListingEditor as Editor, type ListingEditValues } from '@/app/modules/marketplaces/listing-editor';
import type { ListingAction, ListingSnapshot } from '@/app/modules/marketplaces/services/listing-model';
import styles from './marketplaces.module.css';
import MarketplaceSelect from './MarketplaceSelect';

type Requester = (path: string, body?: unknown, signal?: AbortSignal, method?: string) => Promise<unknown>;
const labels = { title: 'Título', price: 'Preço de venda (R$)', listingType: 'Tipo de anúncio', stock: 'Estoque disponível', description: 'Descrição' };
const lifecycleActions: Record<string, ListingAction[]> = { active: ['pause', 'close'], paused: ['resume', 'close'], closed: ['delete'] };
const lifecycleLabels: Record<ListingAction, string> = { pause: 'Pausar', resume: 'Reativar', close: 'Encerrar', delete: 'Excluir definitivamente' };
function feeDetail(fee: number | null, percent: number | null, notice?: string) {
  if (fee == null) return notice || 'Taxa indisponível';
  const formatted = fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return `Taxa ${formatted}${percent == null ? '' : ` · ${percent}%`}`;
}
export default function ListingEditor({ companyId, accountId, itemId, snapshot, permalink, children, dark, brand, request, onClose, onSaved, onBusy, onListingAction }: {
  companyId: string; accountId: string; itemId: string; dark: boolean; brand: string; request: Requester;
  snapshot: ListingSnapshot; permalink: string | null; children: ReactNode;
  onClose: () => void; onSaved: (listing: ListingSnapshot) => void; onBusy: (busy: boolean) => void; onListingAction?: (action: ListingAction) => void;
}) {
  const prefix = useId();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [values, setValues] = useState<ListingEditValues>({ title: snapshot.title, price: snapshot.price, listingType: snapshot.listingType || '', stock: snapshot.stock, description: '' });
  const [priceText, setPriceText] = useState(snapshot.price == null ? '' : snapshot.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const [stockText, setStockText] = useState(snapshot.stock == null ? '' : String(snapshot.stock));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Partial<Record<EditField | 'form', string>>>({});
  const [stale, setStale] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [discard, setDiscard] = useState<'cancel' | 'reload' | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeMessage, setFeeMessage] = useState('');
  const requestKey = useRef(crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = !!editor && Object.keys(changedFields(editor, values)).length > 0;
  const availableLifecycleActions = snapshot.substatus.includes('deleted') ? [] : lifecycleActions[snapshot.status] || [];
  const lifecycleDisabled = loading || saving || stale || dirty;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ empresaId: companyId, connectionId: accountId, id: itemId });
    void request(`anunciados/editar?${params}`, undefined, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      const result = data as Editor;
      setEditor(result); setValues(result.values);
      setPriceText(result.values.price == null ? '' : result.values.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      setStockText(result.values.stock == null ? '' : String(result.values.stock));
      requestKey.current = crypto.randomUUID(); setStale(false); setErrors({}); setMessage('');
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), button')?.focus());
    }).catch((failure) => { if (!controller.signal.aborted) setMessage(failure instanceof Error ? failure.message : 'Não foi possível abrir a edição.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [companyId, accountId, itemId, request, reloadKey]);

  useEffect(() => {
    if (!dirty && !saving) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', protect);
    return () => window.removeEventListener('beforeunload', protect);
  }, [dirty, saving]);

  function reload() { setLoading(true); setEditor(null); setMessage(''); setReloadKey((value) => value + 1); }
  function cancel() { if (!saving) { if (dirty) setDiscard('cancel'); else onClose(); } }
  function refresh() { if (dirty) setDiscard('reload'); else reload(); }
  function change<K extends EditField>(field: K, value: ListingEditValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }
  async function refreshListingTypeFee(nextType = values.listingType, nextPrice = values.price) {
    if (!editor || feeLoading || !nextType || nextPrice == null || !Number.isFinite(nextPrice) || nextPrice <= 0) return;
    const params = new URLSearchParams({ empresaId: companyId, connectionId: accountId, id: itemId, listingType: nextType, price: String(nextPrice) });
    setFeeLoading(true); setFeeMessage('');
    try {
      const result = await request(`anunciados/editar/taxa?${params}`) as { listingType: string; fee: number | null; percent: number | null; notice?: string };
      setEditor((current) => current ? { ...current, listingTypes: current.listingTypes.map((option) => option.id === result.listingType ? { ...option, fee: result.fee, percent: result.percent, notice: result.notice } : option) } : current);
    } catch (failure) {
      setFeeMessage(failure instanceof Error ? failure.message : 'Não foi possível atualizar a taxa agora.');
    } finally {
      setFeeLoading(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || saving || stale || !dirty) return;
    const changes = changedFields(editor, values);
    const validation = validateChanges(editor, changes);
    setErrors(validation.errors); setMessage('');
    const firstError = EDIT_FIELDS.find((field) => validation.errors[field]);
    if (Object.keys(validation.errors).length) { if (firstError) document.getElementById(`${prefix}-${firstError}`)?.focus(); return; }
    setSaving(true); onBusy(true);
    try {
      const result = await request('anunciados/editar', { empresaId: companyId, connectionId: accountId, id: itemId, revision: editor.revision, requestKey: requestKey.current, changes: validation.changes }, undefined, 'PATCH') as { listing: ListingSnapshot };
      onSaved(result.listing);
    } catch (failure) {
      const detail = failure as Error & { code?: string; fields?: Partial<Record<EditField, string>> };
      setMessage(detail.message || 'Não foi possível salvar. Confira o anúncio antes de tentar novamente.');
      if (detail.fields) { setErrors(detail.fields); const field = EDIT_FIELDS.find((key) => detail.fields?.[key]); if (field) document.getElementById(`${prefix}-${field}`)?.focus(); }
      // Nunca reenviar automaticamente: nova tentativa exige consulta explícita ao provedor.
      setStale(true);
    } finally { setSaving(false); onBusy(false); }
  }

  return <>
    <form ref={formRef} className={styles.inlineEditorForm} aria-label="Editar dados do anúncio" aria-busy={loading || saving} onSubmit={save}>
      <div className={styles.actionBar}>
        <button type="button" disabled={saving} onClick={cancel}>Cancelar</button>
        <button type="button" disabled={loading || saving} onClick={refresh}>Recarregar edição</button>
        {onListingAction && availableLifecycleActions.map((action) => <button key={action} type="button" className={action === 'close' || action === 'delete' ? styles.destructiveAction : undefined} disabled={lifecycleDisabled} title={dirty ? 'Salve ou cancele as alterações antes de mudar a situação do anúncio.' : undefined} onClick={() => onListingAction(action)}>{lifecycleLabels[action]}</button>)}
        <button type="submit" className={styles.primary} disabled={loading || saving || stale || !dirty}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
        {permalink && <a href={permalink} target="_blank" rel="noopener noreferrer">Abrir no Mercado Livre ↗</a>}
      </div>
      {loading && <p role="status">Consultando permissões e dados atuais…</p>}
      {(message || errors.form) && <p role="alert" className={styles.connectionMessage}>{message || errors.form}</p>}
      {!editor && !loading && <p className={styles.help}>Título, preço e estoque abaixo vêm da última sincronização. A descrição não está no cache. Para alterar e salvar, recarregue a edição após restabelecer a consulta ao marketplace.</p>}
      <dl>
        {EDIT_FIELDS.map((field) => {
          const rule = editor?.fields[field], id = `${prefix}-${field}`, disabled = !editor || !rule?.editable || saving || stale;
          const label = rule?.label || labels[field], blocked = !!editor && !rule?.editable;
          const help = errors[field] || (!editor && field === 'description' ? 'Descrição indisponível até confirmar os dados atuais.' : '') || (blocked ? '' : field === 'listingType' ? feeMessage || (feeLoading ? 'Calculando a taxa para o preço informado…' : '') || rule?.notice || '' : rule?.notice || (field === 'stock' ? 'Estoque zero pode pausar o anúncio automaticamente.' : field === 'description' ? 'Texto simples, sem HTML.' : field === 'title' && rule?.maxLength ? `${values.title.length}/${rule.maxLength} caracteres` : ''));
          return <Fragment key={field}>
            <dt><label htmlFor={id}>{label}</label>{!editor ? <span className={styles.readOnlyTag}>Pendente de confirmação</span> : blocked && <><span className={styles.readOnlyTag}>Somente leitura</span><Tooltip texto={rule?.reason || 'Campo indisponível neste anúncio.'} posicao="top"><button type="button" className={styles.readOnlyHelp} aria-label={`Por que ${label} está bloqueado? ${rule?.reason || 'Campo indisponível neste anúncio.'}`}>ⓘ</button></Tooltip></>}</dt>
            <dd className={`${styles.editorValue} ${field === 'price' || field === 'stock' ? styles.editorCompact : ''}`}>
            {field === 'listingType' ? <MarketplaceSelect id={id} label="" ariaLabel={label} value={values.listingType} options={(editor?.listingTypes || []).map((option) => ({ value: option.id, label: option.name, detail: feeDetail(option.fee, option.percent, option.notice) }))} placeholder="Tipo não disponível" disabled={disabled} error={errors[field]} onChange={(value) => { change('listingType', value); void refreshListingTypeFee(value); }} />
              : field === 'description' ? <textarea id={id} value={values.description} disabled={disabled} maxLength={rule?.maxLength} rows={6} aria-describedby={help || blocked ? `${id}-help` : undefined} aria-invalid={!!errors[field]} onChange={(event) => change(field, event.target.value)} />
              : <input id={id} type="text" inputMode={field === 'price' ? 'decimal' : field === 'stock' ? 'numeric' : 'text'} value={field === 'price' ? priceText : field === 'stock' ? stockText : values.title} disabled={disabled} maxLength={field === 'title' ? rule?.maxLength : undefined} aria-describedby={help || blocked ? `${id}-help` : undefined} aria-invalid={!!errors[field]} onChange={(event) => {
                if (field === 'price') { const masked = formatarMoedaDigitada(event.target.value); setPriceText(masked); change('price', moedaDigitadaParaNumero(masked)); }
                else if (field === 'stock') { const raw = event.target.value.replace(/\D/g, '').slice(0, 10); setStockText(raw); change('stock', raw === '' ? null : Number(raw)); }
                else change('title', event.target.value);
              }} onBlur={field === 'price' ? () => void refreshListingTypeFee() : undefined} />}
            {help && <p id={`${id}-help`} className={styles.help} role={errors[field] ? 'alert' : undefined}>{help}</p>}
            {!help && blocked && <p id={`${id}-help`} className={styles.blockedReason}>{rule?.reason}</p>}
            </dd>
          </Fragment>;
        })}
        {children}
      </dl>
    </form>
    <ModalConfirmacao aberto={!!discard} titulo="Descartar alterações?" mensagem="As alterações não salvas serão descartadas. O anúncio no marketplace não será alterado." textoCancelar="Continuar editando" textoConfirmar="Descartar" darkMode={dark} corPrimaria={brand} variante="alerta" aoCancelar={() => setDiscard(null)} aoConfirmar={() => { const next = discard; setDiscard(null); if (next === 'reload') reload(); else onClose(); }} />
  </>;
}
