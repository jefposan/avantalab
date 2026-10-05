'use client';

import { useEffect, useRef, useState } from 'react';
import { formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import { publicationErrors, type CatalogPreparation, type PublicationForm } from '@/app/modules/marketplaces/services/catalog-publication';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import styles from './marketplaces.module.css';

type Props = { companyId: string; accountId: string; accounts: MarketplaceAccount[]; accountSelectionLocked: boolean; onSelectAccount: (id: string) => void; onBusyChange: (busy: boolean) => void; canManage: boolean; onPublished: () => void };
const initial = (): PublicationForm => ({ ean: '', productId: '', categoryId: '', price: 0, stock: -1, listingType: '', shippingMode: '', condition: '', warrantyType: '', description: '', attributes: {} });

export default function NewListing({ companyId, accountId, accounts, accountSelectionLocked, onSelectAccount, onBusyChange, canManage, onPublished }: Props) {
  const activeRef = useRef(true);
  const [form, setForm] = useState<PublicationForm>(initial);
  const [priceText, setPriceText] = useState('');
  const [stockText, setStockText] = useState('');
  const [prepared, setPrepared] = useState<CatalogPreparation | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [matched, setMatched] = useState(false);
  const [message, setMessage] = useState('');
  const [publishedId, setPublishedId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());

  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  useEffect(() => { onBusyChange(preparing || publishing); return () => onBusyChange(false); }, [preparing, publishing, onBusyChange]);

  async function prepare(ean = form.ean, productId = '', categoryId = '') {
    if (!canManage || !accountId || preparing || publishing) return;
    setPreparing(true); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
    try {
      const response = await marketplaceClientRequest('preparar', { empresaId: companyId, connectionId: accountId, ean, productId, categoryId }) as { result: CatalogPreparation };
      if (!activeRef.current) return;
      setPrepared(response.result);
      setForm((current) => ({ ...current, ean: response.result.ean, productId: response.result.product?.id || '', categoryId: response.result.categoryId || '', description: current.description || response.result.product?.description || '', attributes: current.attributes || {} }));
      setRequestKey(crypto.randomUUID());
    } catch (failure) { if (activeRef.current) { setPrepared(null); setMessage(failure instanceof Error ? failure.message : 'Não foi possível consultar o EAN.'); } }
    finally { setPreparing(false); }
  }

  async function publish() {
    if (!prepared?.product || !canManage || !accountId || preparing || publishing || publishedId) return;
    const current = { ...form, ean: prepared.ean, productId: prepared.product.id };
    const validation = publicationErrors(current, prepared);
    if (!matched) validation.match = 'Confirme que a ficha corresponde exatamente ao produto.';
    setErrors(validation); setMessage('');
    if (Object.keys(validation).length) { document.getElementById(Object.keys(validation)[0] === 'match' ? 'catalog-match' : `new-${Object.keys(validation)[0]}`)?.focus(); return; }
    setPublishing(true);
    try {
      const result = await marketplaceClientRequest('publicar', { empresaId: companyId, connectionId: accountId, requestKey, form: current }) as { status: string; listing: { id: string; title: string } };
      setPublishedId(result.listing.id); setMessage(`Anúncio ${result.listing.id} publicado e adicionado à lista.`); onPublished();
    } catch (failure) {
      const detail = failure as Error & { fields?: Record<string, string> };
      if (detail.fields) setErrors(detail.fields);
      setMessage(detail.message || 'Não foi possível confirmar a publicação. Confira a lista antes de tentar novamente.');
      // Esta chave não é substituída automaticamente: uma resposta perdida pode ter criado o anúncio.
    } finally { setPublishing(false); }
  }

  const product = prepared?.product;
  const connectedAccounts = accounts.filter((account) => account.status === 'connected');
  const selectedAccount = connectedAccounts.find((account) => account.id === accountId);
  const ready = !!product && !!prepared?.categoryId && !!prepared.listingTypes?.length && !!prepared.shippingModes?.length && !!prepared.conditions?.length;
  const change = <K extends keyof PublicationForm>(key: K, value: PublicationForm[K]) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: '' })); };

  return <div className={styles.newListing}>
    <div className={styles.form}>
      <MarketplaceAccountPicker label="Publicar na conta" value={accountId} options={connectedAccounts.map((account) => ({ id: account.id, name: account.seller_name || `Vendedor ${account.seller_reference}`, detail: `ID ${account.seller_reference}` }))} placeholder={connectedAccounts.length ? 'Selecione uma conta' : 'Nenhuma conta conectada'} disabled={accountSelectionLocked || preparing || publishing} onChange={onSelectAccount} />
      <label htmlFor="new-ean">EAN / GTIN<input id="new-ean" inputMode="numeric" autoComplete="off" value={form.ean} onChange={(event) => { change('ean', event.target.value.replace(/\D/g, '').slice(0, 14)); setPrepared(null); setMatched(false); setPublishedId(''); }} placeholder="Ex.: 7899882306941" /></label>
      <button type="button" className={styles.primary} disabled={!canManage || !selectedAccount || preparing || publishing || !form.ean} onClick={() => void prepare()}>{preparing ? 'Consultando catálogo…' : 'Validar e preparar'}</button>
      {!selectedAccount && <p className={styles.help}>{accountId ? 'Esta conta não está conectada. Reconecte-a ou selecione outra conta para publicar.' : 'Conecte ou selecione uma conta do Mercado Livre para consultar o EAN.'}</p>}
      {accountId && !canManage && <p className={styles.help}>Seu perfil pode consultar anúncios, mas não preparar publicações.</p>}
    </div>

    {prepared?.status === 'not_found' && <p className={styles.catalogNotice} role="status">EAN não localizado no catálogo ativo do Mercado Livre. Confira o código; nenhum anúncio foi criado.</p>}
    {prepared?.candidates && prepared.candidates.length > 1 && !product && <label className={styles.catalogField}>Produto encontrado<select id="new-productId" value="" onChange={(event) => void prepare(prepared.ean, event.target.value)}><option value="">Selecione a ficha correta</option>{prepared.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.id}</option>)}</select></label>}

    {product && <div className={styles.catalogResult} aria-live="polite">
      <div className={styles.catalogIdentity}>{product.picture && <img src={product.picture} alt={product.name} />}<div><strong>{product.name}</strong><small>Catálogo ML · {product.id}</small><small>EAN {prepared.ean}</small></div></div>
      {product.pictures.length > 0 && <div className={styles.catalogPictures}>{product.pictures.slice(0, 5).map((url) => <img key={url} src={url} alt={`Imagem do catálogo de ${product.name}`} />)}</div>}
      <details><summary>Características localizadas ({product.attributes.length})</summary><dl className={styles.catalogAttributes}>{product.attributes.map((attribute) => <div key={attribute.id}><dt>{attribute.name}</dt><dd>{attribute.value}</dd></div>)}</dl></details>
      {prepared.notice && <p className={styles.catalogNotice}>{prepared.notice}</p>}

      <div className={styles.catalogFields}>
        <label className={styles.catalogField} htmlFor="new-categoryId">Categoria<select id="new-categoryId" value={form.categoryId} onChange={(event) => { change('categoryId', event.target.value); void prepare(prepared.ean, product.id, event.target.value); }}><option value="">Selecione</option>{prepared.categories?.map((category) => <option key={category.id} value={category.id}>{category.name} · {category.id}</option>)}</select>{errors.categoryId && <small role="alert">{errors.categoryId}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-price">Preço de venda<input id="new-price" inputMode="decimal" value={priceText} onChange={(event) => { const text = formatarMoedaDigitada(event.target.value); setPriceText(text); change('price', moedaDigitadaParaNumero(text) ?? 0); }} placeholder="R$ 0,00" />{errors.price && <small role="alert">{errors.price}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-stock">Estoque disponível<input id="new-stock" inputMode="numeric" value={stockText} onChange={(event) => { const text = event.target.value.replace(/\D/g, '').slice(0, 5); setStockText(text); change('stock', text ? Number(text) : -1); }} placeholder="Quantidade" />{errors.stock && <small role="alert">{errors.stock}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-listingType">Tipo de anúncio<select id="new-listingType" value={form.listingType} onChange={(event) => change('listingType', event.target.value)}><option value="">Selecione</option>{prepared.listingTypes?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{errors.listingType && <small role="alert">{errors.listingType}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-shippingMode">Forma de envio<select id="new-shippingMode" value={form.shippingMode} onChange={(event) => change('shippingMode', event.target.value)}><option value="">Selecione</option>{prepared.shippingModes?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{errors.shippingMode && <small role="alert">{errors.shippingMode}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-condition">Condição<select id="new-condition" value={form.condition} onChange={(event) => change('condition', event.target.value)}><option value="">Selecione</option>{prepared.conditions?.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{errors.condition && <small role="alert">{errors.condition}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-warrantyType">Garantia<select id="new-warrantyType" value={form.warrantyType} onChange={(event) => change('warrantyType', event.target.value)}><option value="">Selecione</option><option value="none">Sem garantia</option><option value="seller">Garantia do vendedor</option><option value="factory">Garantia de fábrica</option></select>{errors.warrantyType && <small role="alert">{errors.warrantyType}</small>}</label>
        {form.warrantyType && form.warrantyType !== 'none' && <label className={styles.catalogField} htmlFor="new-warrantyTime">Prazo da garantia<input id="new-warrantyTime" value={form.warrantyTime || ''} onChange={(event) => change('warrantyTime', event.target.value)} placeholder="Ex.: 12 meses" />{errors.warrantyTime && <small role="alert">{errors.warrantyTime}</small>}</label>}
        {prepared.requiredAttributes?.map((attribute) => <label key={attribute.id} className={styles.catalogField} htmlFor={`new-attribute:${attribute.id}`}>{attribute.name}{attribute.values.length ? <select id={`new-attribute:${attribute.id}`} value={form.attributes?.[attribute.id] || ''} onChange={(event) => change('attributes', { ...form.attributes, [attribute.id]: event.target.value })}><option value="">Selecione</option>{attribute.values.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select> : <input id={`new-attribute:${attribute.id}`} value={form.attributes?.[attribute.id] || ''} onChange={(event) => change('attributes', { ...form.attributes, [attribute.id]: event.target.value })} />}{errors[`attribute:${attribute.id}`] && <small role="alert">{errors[`attribute:${attribute.id}`]}</small>}</label>)}
        <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor="new-description">Descrição<textarea id="new-description" rows={5} value={form.description || ''} onChange={(event) => change('description', event.target.value)} placeholder="Informações adicionais do produto" />{errors.description && <small role="alert">{errors.description}</small>}</label>
      </div>
      {Object.values(errors).filter(Boolean).length > 0 && <ul className={styles.catalogErrors} role="alert">{[...new Set(Object.values(errors).filter(Boolean))].map((error) => <li key={error}>{error}</li>)}</ul>}
      <label className={styles.catalogMatch}><input id="catalog-match" type="checkbox" checked={matched} onChange={(event) => { setMatched(event.target.checked); setErrors((current) => ({ ...current, match: '' })); }} />Confirmo que a ficha do catálogo corresponde exatamente ao produto que vou vender.</label>{errors.match && <p className={styles.connectionMessage} role="alert">{errors.match}</p>}
      <button type="button" className={styles.primary} disabled={!selectedAccount || !ready || !matched || publishing || preparing || !!publishedId} onClick={() => void publish()}>{publishing ? 'Publicando…' : publishedId ? 'Publicado' : 'Publicar'}</button>
      {!ready && <p className={styles.help}>A publicação só fica disponível após confirmar categoria e opções de venda permitidas pelo Mercado Livre.</p>}
    </div>}
    {message && <p className={publishedId ? styles.catalogSuccess : styles.connectionMessage} role="status">{message}</p>}
  </div>;
}
