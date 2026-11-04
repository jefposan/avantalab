'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import Tooltip from '@/app/components/Tooltip';
import CampoMoeda from '@/app/components/CampoMoeda';
import { Icon } from '@/app/projetos/components/Icon';
import { formatarMoeda, formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import { suggestedPriceCents, type PricePercentages } from '@/app/modules/marketplaces/price-settings';
import type { LocalProduct } from '@/app/modules/marketplaces/services/local-product-model';
import styles from './marketplaces.module.css';
export function ProductSalePrices({ reference, percentages, middleLabel='Médio' }: { reference: number | null; percentages: PricePercentages | null; middleLabel?:'Médio'|'Média' }) {
  const values = percentages ? suggestedPriceCents(reference, percentages) : null;
  return <div className={styles.productSalePrices} aria-label="Preços de venda">{(['minimum', 'medium', 'ideal'] as const).map((key, index) => <div key={key} data-price={key}><span className={styles.productSalePriceLabel}>{['Mínimo', middleLabel, 'Ideal'][index]} <small>{percentages ? `· ${percentages[key].toLocaleString('pt-BR')}%` : '· Indisponível'}</small></span><strong>{values ? <><span>R$</span>{' '}<span className={styles.productSalePriceAmount}>{formatarMoeda(values[key] / 100).replace(/^R\$\s*/, '')}</span></> : '—'}</strong></div>)}</div>;
}
export function PreparationPriceReference({id,reference,percentages}:{id:string;reference:number|null;percentages:PricePercentages|null}){
 return <header id={id} className={styles.preparationPriceHeader} aria-label="Referências para precificar o anúncio"><div><strong>Referências para precificar</strong><small>{reference!=null&&reference>0?`Referência salva: ${formatarMoeda(reference/100)}`:'Sem referência de preço cadastrada'}</small></div><ProductSalePrices reference={reference} percentages={percentages} middleLabel="Média"/></header>;
}
export function ReferencePriceEditor({ product, disabled, canEdit, onSave, onResearch, researching = false, researchDisabled = false }: { product: LocalProduct; disabled: boolean; canEdit: boolean; onSave: (command: { action: string; [key: string]: unknown }) => void; onResearch?: () => void; researching?: boolean; researchDisabled?: boolean }) {
  const [editing, setEditing] = useState(false), [value, setValue] = useState(product.price_cents == null ? '' : formatarMoedaDigitada(String(product.price_cents))), [error, setError] = useState('');
  const fieldId = useId(), errorId = `${fieldId}-error`;
  const inputRef = useRef<HTMLInputElement>(null), editRef = useRef<HTMLButtonElement>(null);
  function startEditing() {
    setValue(product.price_cents == null ? '' : formatarMoedaDigitada(String(product.price_cents)));
    setError(''); setEditing(true);
  }
  function cancel() {
    if (disabled) return;
    setEditing(false); setError('');
    requestAnimationFrame(() => editRef.current?.focus());
  }
  function save(event: FormEvent) {
    event.preventDefault(); if (disabled || !canEdit) return;
    const price = moedaDigitadaParaNumero(value);
    if (!value || price == null || !Number.isFinite(price) || price <= 0 || price >= 100000000) { setError('Informe uma referência maior que zero e menor que R$ 100.000.000,00.'); inputRef.current?.focus(); return; }
    setError('');
    onSave({ action: 'update', productId: product.id, revision: product.revision, name: product.name, ean: product.ean || '', description: product.description, pictures: product.pictures, categoryId: product.category_id, price });
  }
  return <div className={styles.referencePriceShell}>{editing && canEdit ? <form noValidate onSubmit={save} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); } }} className={styles.referencePriceEditor} aria-label={`Editar referência de ${product.name}`} aria-busy={disabled}>
    <label htmlFor={fieldId}>Referência:</label>
    <span className={styles.referencePriceInput}><span aria-hidden="true">R$</span><CampoMoeda inputRef={inputRef} id={fieldId} aria-label={`Preço de referência de ${product.name}`} aria-invalid={!!error || undefined} aria-describedby={error ? errorId : undefined} autoFocus value={value} disabled={disabled} onChange={setValue} /></span>
    <Tooltip texto={disabled ? 'Salvando referência…' : 'Salvar referência (Enter)'}><button type="submit" disabled={disabled} aria-label={`Salvar referência de ${product.name}`}><Icon name={disabled ? 'refresh' : 'check'} size={14} aria-hidden="true" /></button></Tooltip>
    <Tooltip texto="Cancelar edição (Esc)"><button type="button" disabled={disabled} aria-label={`Cancelar edição da referência de ${product.name}`} onClick={cancel}><Icon name="close" size={14} aria-hidden="true" /></button></Tooltip>
  </form> : <span className={`${styles.referencePrice}${canEdit && onResearch ? ` ${styles.referencePriceWithResearch}` : ''}`}><span>Referência:</span><strong>{product.price_cents == null ? 'Não informado' : formatarMoeda(product.price_cents / 100)}</strong>{canEdit && <button ref={editRef} type="button" disabled={disabled} aria-label={`Editar preço de referência de ${product.name}`} onClick={startEditing}>Editar</button>}{canEdit && onResearch && <Tooltip texto={researchDisabled ? 'Recolha os detalhes antes de pesquisar, para preservar campos em edição' : researching ? 'Pesquisando ofertas atuais…' : 'Pesquisar ofertas atuais e atualizar a referência de mercado'}><button type="button" className={styles.referencePriceResearch} disabled={disabled || researchDisabled} aria-busy={researching} aria-label={`${researching ? 'Pesquisando' : 'Pesquisar e atualizar'} referência de ${product.name}`} onClick={onResearch}><Icon name="refresh" size={14} aria-hidden="true" /></button></Tooltip>}</span>}
    {editing && canEdit && error && <small id={errorId} className={styles.referencePriceError} role="alert">{error}</small>}
  </div>;
}
