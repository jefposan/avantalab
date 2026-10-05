'use client';

import { useEffect, useRef, useState } from 'react';
import { formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import { publicationErrors, type CatalogPreparation, type PublicationForm } from '@/app/modules/marketplaces/services/catalog-publication';
import { Icon } from '@/app/projetos/components/Icon';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import MarketplaceSelect from './MarketplaceSelect';
import styles from './marketplaces.module.css';

type Props = { companyId: string; accountId: string; accounts: MarketplaceAccount[]; accountSelectionLocked: boolean; onSelectAccount: (id: string) => void; onBusyChange: (busy: boolean) => void; canManage: boolean; onPublished: () => void };
const initial = (): PublicationForm => ({ ean: '', productId: '', categoryId: '', price: 0, stock: -1, listingType: '', shippingMode: '', condition: '', warrantyType: '', description: '', attributes: {} });

export default function NewListing({ companyId, accountId, accounts, accountSelectionLocked, onSelectAccount, onBusyChange, canManage, onPublished }: Props) {
  const activeRef = useRef(true);
  const eanInputRef = useRef<HTMLInputElement>(null);
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
  const [scannerArmed, setScannerArmed] = useState(false);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());

  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  useEffect(() => { onBusyChange(preparing || publishing); return () => onBusyChange(false); }, [preparing, publishing, onBusyChange]);

  async function prepare(ean = form.ean, productId = '', categoryId = '') {
    if (!canManage || !accountId || preparing || publishing) return;
    setPreparing(true); setScannerArmed(false); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
    try {
      const response = await marketplaceClientRequest('preparar', { empresaId: companyId, connectionId: accountId, ean, productId, categoryId }) as { result: CatalogPreparation };
      if (!activeRef.current) return;
      setPrepared(response.result);
      setForm((current) => {
        const sameProduct = !!response.result.product && current.productId === response.result.product.id;
        const sameCategory = sameProduct && current.categoryId === (response.result.categoryId || '');
        const allowed = <T extends { id: string }>(options: T[] | undefined, value: string) => options?.some((option) => option.id === value) ? value : '';
        return { ...current, ean: response.result.ean, productId: response.result.product?.id || '', categoryId: response.result.categoryId || '',
          listingType: allowed(response.result.listingTypes, current.listingType), shippingMode: allowed(response.result.shippingModes, current.shippingMode), condition: allowed(response.result.conditions, current.condition),
          description: sameProduct ? current.description : response.result.product?.description || '', pictureUrl: sameProduct ? current.pictureUrl : response.result.product?.pictures[0] || '',
          attributes: sameCategory ? current.attributes || {} : {} };
      });
      setRequestKey(crypto.randomUUID());
    } catch (failure) { if (activeRef.current) { if (!productId && !categoryId) setPrepared(null); setMessage(failure instanceof Error ? failure.message : 'Não foi possível consultar o EAN.'); } }
    finally { setPreparing(false); }
  }

  async function publish() {
    if (!prepared?.product || !canManage || !accountId || preparing || publishing || publishedId) return;
    const current = { ...form, ean: prepared.ean, productId: prepared.product.id };
    const validation = publicationErrors(current, prepared);
    if (!matched) validation.match = 'Confirme que a ficha corresponde exatamente ao produto.';
    setErrors(validation); setMessage('');
    if (Object.keys(validation).length) { focusFirstError(validation); return; }
    setPublishing(true);
    try {
      const result = await marketplaceClientRequest('publicar', { empresaId: companyId, connectionId: accountId, requestKey, form: current }) as { status: string; listing: { id: string; title: string } };
      setPublishedId(result.listing.id); setMessage(`Anúncio ${result.listing.id} publicado e adicionado à lista.`); onPublished();
    } catch (failure) {
      const detail = failure as Error & { fields?: Record<string, string> };
      if (detail.fields) { setErrors(detail.fields); requestAnimationFrame(() => focusFirstError(detail.fields || {})); }
      setMessage(detail.message || 'Não foi possível confirmar a publicação. Confira a lista antes de tentar novamente.');
      // Esta chave não é substituída automaticamente: uma resposta perdida pode ter criado o anúncio.
    } finally { setPublishing(false); }
  }

  const product = prepared?.product;
  const connectedAccounts = accounts.filter((account) => account.status === 'connected');
  const selectedAccount = connectedAccounts.find((account) => account.id === accountId);
  const ready = !!product && !!prepared?.categoryId && !prepared.blockingIssues?.length && !!prepared.listingTypes?.length && !!prepared.shippingModes?.length && !!prepared.conditions?.length;
  const change = <K extends keyof PublicationForm>(key: K, value: PublicationForm[K]) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: '' })); };

  function focusFirstError(currentErrors: Record<string, string>) {
    const first = Object.keys(currentErrors).find((key) => currentErrors[key]);
    if (!first) return;
    const target = first === 'match' ? 'catalog-match' : first === 'attributes' ? 'catalog-errors' : `new-${first}`;
    (document.getElementById(target) || document.getElementById('catalog-errors'))?.focus();
  }

  function toggleScanner() {
    if (scannerArmed) { setScannerArmed(false); return; }
    setScannerArmed(true);
    setMessage('');
    requestAnimationFrame(() => { eanInputRef.current?.focus(); eanInputRef.current?.select(); });
  }

  return <div className={styles.newListing}>
    <div className={styles.form}>
      <MarketplaceAccountPicker label="Publicar na conta" value={accountId} options={connectedAccounts.map((account) => ({ id: account.id, name: account.seller_name || `Vendedor ${account.seller_reference}`, detail: `ID ${account.seller_reference}` }))} placeholder={connectedAccounts.length ? 'Selecione uma conta' : 'Nenhuma conta conectada'} disabled={accountSelectionLocked || preparing || publishing} onChange={onSelectAccount} />
      <div className={styles.eanField}>
        <label htmlFor="new-ean">EAN / GTIN</label>
        <div className={styles.eanControl}>
          <input ref={eanInputRef} id="new-ean" inputMode="numeric" autoComplete="off" value={form.ean} aria-describedby={scannerArmed ? 'ean-scanner-status' : undefined} onChange={(event) => { change('ean', event.target.value.replace(/\D/g, '').slice(0, 14)); setPrepared(null); setMatched(false); setPublishedId(''); }} onKeyDown={(event) => { if (event.key === 'Escape') setScannerArmed(false); if (event.key === 'Enter' && event.currentTarget.value) { event.preventDefault(); setScannerArmed(false); void prepare(event.currentTarget.value); } }} placeholder="Ex.: 7899882306941" />
          <button type="button" className={styles.scannerButton} aria-label={scannerArmed ? 'Desativar leitor de código de barras' : 'Ativar leitor de código de barras'} aria-pressed={scannerArmed} title={scannerArmed ? 'Leitor ativo — escaneie o código' : 'Ativar leitor de código de barras'} disabled={!canManage || !selectedAccount || preparing || publishing} onClick={toggleScanner}><Icon name="barcode" size={20} /></button>
        </div>
        <span id="ean-scanner-status" className={styles.srOnly} role="status">{scannerArmed ? 'Leitor ativado. Escaneie o código de barras agora.' : ''}</span>
      </div>
      <button type="button" className={`${styles.primary} ${styles.searchAction}`} disabled={!canManage || !selectedAccount || preparing || publishing || !form.ean} onClick={() => void prepare()}>{preparing ? 'Pesquisando…' : 'Pesquisar'}</button>
      {!selectedAccount && <p className={styles.help}>{accountId ? 'Esta conta não está conectada. Reconecte-a ou selecione outra conta para publicar.' : 'Conecte ou selecione uma conta do Mercado Livre para consultar o EAN.'}</p>}
      {accountId && !canManage && <p className={styles.help}>Seu perfil pode consultar anúncios, mas não preparar publicações.</p>}
    </div>

    {prepared?.status === 'not_found' && <p className={styles.catalogNotice} role="status">{prepared.notice || 'EAN não localizado. Confira o código; nenhum anúncio foi criado.'}</p>}
    {prepared?.candidates && prepared.candidates.length > 1 && !product && <MarketplaceSelect id="new-productId" className={styles.catalogField} label="Produto encontrado" value="" options={prepared.candidates.map((candidate) => ({ value: candidate.id, label: candidate.name, detail: candidate.id }))} placeholder="Selecione a ficha correta" onChange={(value) => void prepare(prepared.ean, value)} />}

    {product && <div className={styles.catalogResult} aria-live="polite">
      <div className={styles.catalogIdentity}>{product.picture && <img src={product.picture} alt={product.name} />}<div><strong>{product.name}</strong><small>{product.source === 'profile_catalog' ? 'Cadastro do perfil' : `Catálogo ML · ${product.id}`}</small><small>EAN {prepared.ean}</small></div></div>
      {product.pictures.length > 0 && <div className={styles.catalogPictures}>{product.pictures.slice(0, 5).map((url) => <img key={url} src={url} alt={`Imagem do catálogo de ${product.name}`} />)}</div>}
      <details><summary>Características localizadas ({product.attributes.length})</summary><dl className={styles.catalogAttributes}>{product.attributes.map((attribute) => <div key={attribute.id}><dt>{attribute.name}</dt><dd>{attribute.value}</dd></div>)}</dl></details>
      {prepared.notice && <p className={styles.catalogNotice}>{prepared.notice}</p>}
      {!!prepared.blockingIssues?.length && <ul className={styles.catalogErrors} role="alert">{prepared.blockingIssues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>}
      {!!prepared.warnings?.length && <ul className={styles.catalogWarnings}>{prepared.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}

      <div className={styles.catalogFields}>
        <MarketplaceSelect id="new-categoryId" className={styles.catalogField} label="Categoria" value={form.categoryId} options={(prepared.categories || []).map((category) => ({ value: category.id, label: category.name, detail: category.id }))} placeholder="Selecione" error={errors.categoryId} onChange={(value) => { change('categoryId', value); void prepare(prepared.ean, product.id, value); }} />
        <label className={styles.catalogField} htmlFor="new-price">Preço de venda<input id="new-price" inputMode="decimal" value={priceText} onChange={(event) => { const text = formatarMoedaDigitada(event.target.value); setPriceText(text); change('price', moedaDigitadaParaNumero(text) ?? 0); }} placeholder="R$ 0,00" />{errors.price && <small role="alert">{errors.price}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-stock">Estoque disponível<input id="new-stock" inputMode="numeric" value={stockText} onChange={(event) => { const text = event.target.value.replace(/\D/g, '').slice(0, 5); setStockText(text); change('stock', text ? Number(text) : -1); }} placeholder="Quantidade" />{errors.stock && <small role="alert">{errors.stock}</small>}</label>
        <MarketplaceSelect id="new-listingType" className={styles.catalogField} label="Tipo de anúncio" value={form.listingType} options={(prepared.listingTypes || []).map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors.listingType} onChange={(value) => change('listingType', value)} />
        <MarketplaceSelect id="new-shippingMode" className={styles.catalogField} label="Forma de envio" value={form.shippingMode} options={(prepared.shippingModes || []).map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors.shippingMode} onChange={(value) => change('shippingMode', value)} />
        <MarketplaceSelect id="new-condition" className={styles.catalogField} label="Condição" value={form.condition} options={(prepared.conditions || []).map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors.condition} onChange={(value) => change('condition', value)} />
        <MarketplaceSelect id="new-warrantyType" className={styles.catalogField} label="Garantia" value={form.warrantyType} options={[{ value: 'none', label: 'Sem garantia' }, { value: 'seller', label: 'Garantia do vendedor' }, { value: 'factory', label: 'Garantia de fábrica' }]} placeholder="Selecione" error={errors.warrantyType} onChange={(value) => change('warrantyType', value)} />
        {product.source === 'profile_catalog' && product.pictures.length > 0 && <MarketplaceSelect id="new-pictureUrl" className={styles.catalogField} label="Imagem principal" value={form.pictureUrl || ''} options={product.pictures.map((url, index) => ({ value: url, label: `Imagem ${index + 1}` }))} placeholder="Selecione" error={errors.pictureUrl} onChange={(value) => change('pictureUrl', value)} />}
        {form.warrantyType && form.warrantyType !== 'none' && <label className={styles.catalogField} htmlFor="new-warrantyTime">Prazo da garantia<input id="new-warrantyTime" value={form.warrantyTime || ''} onChange={(event) => change('warrantyTime', event.target.value)} placeholder="Ex.: 12 meses" />{errors.warrantyTime && <small role="alert">{errors.warrantyTime}</small>}</label>}
        {prepared.requiredAttributes?.map((attribute) => attribute.values.length ? <MarketplaceSelect key={attribute.id} id={`new-attribute:${attribute.id}`} className={styles.catalogField} label={attribute.name} value={form.attributes?.[attribute.id] || ''} options={attribute.values.map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors[`attribute:${attribute.id}`]} onChange={(value) => change('attributes', { ...form.attributes, [attribute.id]: value })} /> : <label key={attribute.id} className={styles.catalogField} htmlFor={`new-attribute:${attribute.id}`}>{attribute.name}<input id={`new-attribute:${attribute.id}`} value={form.attributes?.[attribute.id] || ''} onChange={(event) => change('attributes', { ...form.attributes, [attribute.id]: event.target.value })} />{errors[`attribute:${attribute.id}`] && <small role="alert">{errors[`attribute:${attribute.id}`]}</small>}</label>)}
        <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor="new-description">Descrição<textarea id="new-description" rows={5} value={form.description || ''} onChange={(event) => change('description', event.target.value)} placeholder="Informações adicionais do produto" />{errors.description && <small role="alert">{errors.description}</small>}</label>
      </div>
      {Object.values(errors).filter(Boolean).length > 0 && <ul id="catalog-errors" className={styles.catalogErrors} role="alert" tabIndex={-1}>{[...new Set(Object.values(errors).filter(Boolean))].map((error) => <li key={error}>{error}</li>)}</ul>}
      <label className={styles.catalogMatch}><input id="catalog-match" type="checkbox" checked={matched} onChange={(event) => { setMatched(event.target.checked); setErrors((current) => ({ ...current, match: '' })); }} />Confirmo que a ficha localizada corresponde exatamente ao produto que vou vender.</label>{errors.match && <p className={styles.connectionMessage} role="alert">{errors.match}</p>}
      <button type="button" className={styles.primary} disabled={!selectedAccount || !ready || !matched || publishing || preparing || !!publishedId} onClick={() => void publish()}>{publishing ? 'Publicando…' : publishedId ? 'Publicado' : 'Publicar'}</button>
      {!ready && <p className={styles.help}>A publicação só fica disponível após confirmar categoria e opções de venda permitidas pelo Mercado Livre.</p>}
    </div>}
    {message && <p className={publishedId ? styles.catalogSuccess : styles.connectionMessage} role="status">{message}</p>}
  </div>;
}
