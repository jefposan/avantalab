'use client';

import { useEffect, useRef, useState } from 'react';
import { formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import { publicationErrors, type CatalogPreparation, type PublicationForm } from '@/app/modules/marketplaces/services/catalog-publication';
import { Icon } from '@/app/projetos/components/Icon';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import CampoBusca from '@/app/components/CampoBusca';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import MarketplaceSelect from './MarketplaceSelect';
import styles from './marketplaces.module.css';
import { accountDisplayName, accountReferenceDetail } from './account-identification';

export type ListingCopyRequest = { id: string; targetConnectionId: string } & ({ sourceConnectionId: string; listingId: string; localProductId?: never } | { localProductId: string; sourceConnectionId?: never; listingId?: never });
type Props = { companyId: string; marketplaceName?: string; marketplaceAvailable?: boolean; accountId: string; accounts: MarketplaceAccount[]; accountSelectionLocked: boolean; onSelectAccount: (id: string) => void; onBusyChange: (busy: boolean) => void; canManage: boolean; onPublished: () => void; copyRequest: ListingCopyRequest | null; onCopyHandled: () => void };
const initial = (): PublicationForm => ({ ean: '', productId: '', categoryId: '', price: 0, stock: -1, listingType: '', shippingMode: '', condition: '', warrantyType: '', description: '', attributes: {} });

export default function NewListing({ companyId, marketplaceName = 'Mercado Livre', marketplaceAvailable = true, accountId, accounts, accountSelectionLocked, onSelectAccount, onBusyChange, canManage, onPublished, copyRequest, onCopyHandled }: Props) {
  const activeRef = useRef(true);
  const eanInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PublicationForm>(initial);
  const [searchDescription, setSearchDescription] = useState('');
  const [priceText, setPriceText] = useState('');
  const [stockText, setStockText] = useState('');
  const [prepared, setPrepared] = useState<CatalogPreparation | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [searchingBy, setSearchingBy] = useState<'ean' | 'description' | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [matched, setMatched] = useState(false);
  const [message, setMessage] = useState('');
  const [publishedId, setPublishedId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scannerArmed, setScannerArmed] = useState(false);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [copyTargetId, setCopyTargetId] = useState('');
  const [preserveCopiedFields, setPreserveCopiedFields] = useState(false);
  const handledCopy = useRef('');

  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  useEffect(() => { onBusyChange(preparing || publishing || !!prepared); return () => onBusyChange(false); }, [preparing, publishing, prepared, onBusyChange]);

  function applyPreparation(result: CatalogPreparation, preferred?: PublicationForm, preserve = preserveCopiedFields) {
    setPrepared(result);
    if (!result.query) setSearchDescription('');
    setForm((current) => {
      const base = preferred ? { ...current, ...preferred, attributes: preferred.attributes || {} } : current;
      const sameProduct = !!result.product && base.productId === result.product.id;
      const allowed = <T extends { id: string }>(options: T[] | undefined, value: string) => options?.some((option) => option.id === value) ? value : '';
      const profilePicture = result.product?.source === 'profile_catalog'
        ? result.product.pictures.includes(base.pictureUrl || '') ? base.pictureUrl : result.product.pictures[0] || ''
        : sameProduct ? base.pictureUrl : result.product?.pictures[0] || base.pictureUrl || '';
      return { ...base, ean: result.ean, productId: result.product?.id || '', categoryId: result.categoryId || '',
        listingType: allowed(result.listingTypes, base.listingType), shippingMode: allowed(result.shippingModes, base.shippingMode), condition: allowed(result.conditions, base.condition),
        description: result.product && !sameProduct && !preserve ? result.product.description || '' : base.description || result.product?.description || '', pictureUrl: profilePicture,
        attributes: base.attributes || {} };
    });
    setPreserveCopiedFields(preserve || !!preferred);
    if (preferred) {
      setPriceText(Number.isFinite(preferred.price) && preferred.price > 0 ? formatarMoedaDigitada(String(Math.round(preferred.price * 100))) : '');
      setStockText(Number.isSafeInteger(preferred.stock) && preferred.stock >= 0 ? String(preferred.stock) : '');
    }
    setRequestKey(crypto.randomUUID());
  }

  async function prepare(ean = form.ean, productId = '', categoryId = '', connectionId = accountId, preferred?: PublicationForm, query = '') {
    if (!canManage || !connectionId || preparing || publishing) return;
    setSearchingBy(productId || categoryId ? null : query ? 'description' : 'ean');
    setPreparing(true); setScannerArmed(false); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
    try {
      const response = await marketplaceClientRequest('preparar', { empresaId: companyId, connectionId, ean, query, productId, categoryId, ...(!query && form.localProductId ? { localProductId: form.localProductId } : {}), ...(!query && form.copySource ? { copySource: form.copySource } : {}) }) as { result: CatalogPreparation };
      if (!activeRef.current) return;
      applyPreparation(response.result, preferred);
    } catch (failure) { if (activeRef.current) { if (!productId && !categoryId) setPrepared(null); setMessage(failure instanceof Error ? failure.message : 'Não foi possível pesquisar o produto.'); } }
    finally { setPreparing(false); setSearchingBy(null); }
  }

  useEffect(() => {
    if (!copyRequest || copyRequest.targetConnectionId !== accountId || handledCopy.current === copyRequest.id) return;
    const currentCopy = copyRequest;
    handledCopy.current = currentCopy.id;
    async function copyListing() {
      if (!canManage || preparing || publishing) return;
      setPreparing(true); setScannerArmed(false); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
      try {
        const response = await (currentCopy.localProductId
          ? marketplaceClientRequest('produtos/preparar', { empresaId: companyId, connectionId: currentCopy.targetConnectionId, productId: currentCopy.localProductId })
          : marketplaceClientRequest('preparar-copia', { empresaId: companyId, sourceConnectionId: currentCopy.sourceConnectionId, targetConnectionId: currentCopy.targetConnectionId, listingId: currentCopy.listingId })) as { result: CatalogPreparation; form: PublicationForm; sourceTitle: string };
        if (!activeRef.current) return;
        applyPreparation(response.result, response.form);
        setMessage(`A ficha de “${response.sourceTitle}” foi preparada nesta conta. Revise todos os dados antes de publicar.`);
      } catch (failure) {
        if (activeRef.current) setMessage(failure instanceof Error ? failure.message : 'Não foi possível preparar a cópia do anúncio.');
      } finally {
        if (activeRef.current) setPreparing(false);
        onCopyHandled();
      }
    }
    void copyListing();
  }, [accountId, canManage, companyId, copyRequest, onCopyHandled, preparing, publishing]);

  async function publish() {
    if (!prepared?.product || !canManage || !accountId || preparing || publishing || publishedId) return;
    const current = { ...form, ean: prepared.ean, productId: prepared.product.id };
    const validation = publicationErrors(current, prepared);
    if (!matched) validation.match = 'Confirme que a ficha corresponde exatamente ao produto.';
    setErrors(validation); setMessage('');
    if (Object.keys(validation).length) { focusFirstError(validation); return; }
    setPublishing(true);
    try {
      const result = await marketplaceClientRequest('publicar', { empresaId: companyId, connectionId: accountId, requestKey, form: current }) as { status: string; listing: { id: string; title: string }; localProductId: string };
      change('localProductId', result.localProductId);
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

  function changeEan(value: string) {
    if (preparing || publishing) return;
    setSearchDescription('');
    change('ean', value.replace(/\D/g, '').slice(0, 14));
    change('copySource', undefined);
    change('localProductId', undefined);
    setPreserveCopiedFields(false);
    setPrepared(null); setMatched(false); setPublishedId(''); setMessage('');
  }

  function changeSearchDescription(value: string) {
    if (preparing || publishing) return;
    setSearchDescription(value);
    change('ean', '');
    change('copySource', undefined);
    change('localProductId', undefined);
    setScannerArmed(false); setPreserveCopiedFields(false);
    setPrepared(null); setMatched(false); setPublishedId(''); setMessage('');
  }

  function searchByDescription() {
    if (searchDescription.trim().length < 3) return;
    void prepare('', '', '', accountId, undefined, searchDescription);
  }

  async function prepareForAnotherAccount() {
    const target = connectedAccounts.find((account) => account.id === copyTargetId);
    if (!target || target.status !== 'connected' || preparing || publishing) return;
    const copiedForm = { ...form, attributes: { ...form.attributes } };
    setPreparing(true); setScannerArmed(false); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
    try {
      let response: { result: CatalogPreparation };
      try {
        response = await marketplaceClientRequest('preparar', { empresaId: companyId, connectionId: target.id, ean: copiedForm.ean, productId: copiedForm.productId, categoryId: copiedForm.categoryId, copySource: copiedForm.copySource, localProductId: copiedForm.localProductId }) as { result: CatalogPreparation };
      } catch (failure) {
        const detail = failure as Error & { code?: string };
        if (detail.code !== 'category_mismatch') throw failure;
        response = await marketplaceClientRequest('preparar', { empresaId: companyId, connectionId: target.id, ean: copiedForm.ean, productId: copiedForm.productId, categoryId: '', copySource: copiedForm.copySource, localProductId: copiedForm.localProductId }) as { result: CatalogPreparation };
      }
      if (!activeRef.current) return;
      onSelectAccount(target.id);
      applyPreparation(response.result, copiedForm);
      setCopyTargetId('');
      setMessage(`A ficha foi preparada em ${accountDisplayName(target)}. Revise todos os dados antes de publicar.`);
    } catch (failure) {
      if (activeRef.current) setMessage(failure instanceof Error ? failure.message : 'Não foi possível preparar a publicação na outra conta.');
    } finally { setPreparing(false); }
  }

  return <div className={styles.newListing}>
    <div className={styles.form}>
      <MarketplaceAccountPicker label="Publicar na conta" value={accountId} options={connectedAccounts.map((account) => ({ id: account.id, name: accountDisplayName(account), detail: accountReferenceDetail(account) }))} placeholder={connectedAccounts.length ? 'Selecione uma conta' : 'Nenhuma conta conectada'} disabled={accountSelectionLocked || preparing || publishing || !!prepared} onChange={onSelectAccount} />
      <div className={styles.eanField}>
        <label htmlFor="new-ean">EAN / GTIN</label>
        <div className={styles.eanControl}>
          <CampoBusca inputRef={eanInputRef} id="new-ean" className={styles.eanInput} classNameControle={styles.eanSearchControl} inputMode="numeric" autoComplete="off" disabled={preparing || publishing} value={form.ean} aria-describedby={scannerArmed ? 'ean-scanner-status' : undefined} onChange={changeEan} onKeyDown={(event) => { if (event.key === 'Escape') setScannerArmed(false); if (event.key === 'Enter' && event.currentTarget.value) { event.preventDefault(); setScannerArmed(false); void prepare(event.currentTarget.value); } }} placeholder="Ex.: 7899882306941" rotuloLimpar="Limpar EAN / GTIN" />
          <button type="button" className={styles.scannerButton} aria-label={scannerArmed ? 'Desativar leitor de código de barras' : 'Ativar leitor de código de barras'} aria-pressed={scannerArmed} title={scannerArmed ? 'Leitor ativo — escaneie o código' : 'Ativar leitor de código de barras'} disabled={!canManage || !selectedAccount || preparing || publishing} onClick={toggleScanner}><Icon name="barcode" size={20} /></button>
        </div>
        <span id="ean-scanner-status" className={styles.srOnly} role="status">{scannerArmed ? 'Leitor ativado. Escaneie o código de barras agora.' : ''}</span>
      </div>
      <button type="button" className={`${styles.primary} ${styles.searchAction}`} aria-busy={searchingBy === 'ean'} disabled={!canManage || !selectedAccount || preparing || publishing || !form.ean} onClick={() => void prepare()}>{searchingBy === 'ean' ? 'Pesquisando…' : 'Pesquisar'}</button>
      <div className={styles.descriptionSearchRow}>
        <div className={styles.eanField}>
          <label htmlFor="new-search-description">Ou pesquise por nome, marca ou modelo</label>
          <CampoBusca id="new-search-description" autoComplete="off" maxLength={120} disabled={preparing || publishing} value={searchDescription} onChange={changeSearchDescription} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchByDescription(); } }} placeholder="Ex.: Cooktop Mondial Fast Cook 220V" rotuloLimpar="Limpar pesquisa por descrição" />
        </div>
        <button type="button" className={`${styles.primary} ${styles.searchAction}`} aria-busy={searchingBy === 'description'} disabled={!canManage || !selectedAccount || preparing || publishing || searchDescription.trim().length < 3} onClick={searchByDescription}>{searchingBy === 'description' ? 'Pesquisando…' : 'Buscar produto'}</button>
      </div>
      {!marketplaceAvailable && <p className={styles.help} role="status">Publicação no {marketplaceName} ainda não disponível.</p>}
      {marketplaceAvailable && !selectedAccount && <p className={styles.help}>{accountId ? 'Esta conta não está conectada. Reconecte-a ou selecione outra conta para publicar.' : `Conecte ou selecione uma conta do ${marketplaceName} para pesquisar o produto.`}</p>}
      {marketplaceAvailable && accountId && !canManage && <p className={styles.help}>Seu perfil pode consultar anúncios, mas não preparar publicações.</p>}
    </div>

    {prepared?.status === 'not_found' && <p className={styles.catalogNotice} role="status">{prepared.notice || 'EAN não localizado. Confira o código; nenhum anúncio foi criado.'}</p>}
    {prepared?.status === 'found' && !product && prepared.notice && <p className={styles.catalogNotice} role="status">{prepared.notice}</p>}
    {prepared?.candidates && prepared.candidates.length > 0 && !product && <MarketplaceSelect id="new-productId" className={styles.catalogField} label={`Produto encontrado (${prepared.candidates.length})`} disabled={preparing || publishing} value="" options={prepared.candidates.map((candidate) => ({ value: candidate.id, label: candidate.name, detail: candidate.id }))} placeholder="Selecione a ficha correta" onChange={(value) => void prepare(prepared.ean, value, '', accountId, undefined, prepared.query || '')} />}

    {product && <div className={styles.catalogResult} aria-live="polite">
      <div className={styles.catalogIdentity}>{product.picture && <img src={product.picture} alt={product.name} />}<div><strong>{product.name}</strong><small>{product.source === 'local_product' ? 'Cadastro local da empresa' : product.source === 'profile_catalog' ? 'Cadastro do perfil' : product.source === 'marketplace_listing' ? `Anúncio de origem · ${product.id}` : `Catálogo ML · ${product.id}`}</small><small>{prepared.ean ? `EAN ${prepared.ean}` : prepared.copySource || prepared.localProductId ? 'Produto sem EAN' : 'EAN a confirmar'}</small></div></div>
      {product.pictures.length > 0 && <div className={styles.catalogPictures}>{product.pictures.slice(0, 5).map((url) => <img key={url} src={url} alt={`Imagem do catálogo de ${product.name}`} />)}</div>}
      <details><summary>Características localizadas ({product.attributes.length})</summary><dl className={styles.catalogAttributes}>{product.attributes.map((attribute) => <div key={attribute.id}><dt>{attribute.name}</dt><dd>{attribute.value}</dd></div>)}</dl></details>
      {prepared.notice && <p className={styles.catalogNotice}>{prepared.notice}</p>}
      {!!prepared.blockingIssues?.length && <ul className={styles.catalogErrors} role="alert">{prepared.blockingIssues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>}
      {!!prepared.warnings?.length && <ul className={styles.catalogWarnings}>{prepared.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {!prepared.ean && !!prepared.gtins?.length && <MarketplaceSelect id="new-gtin" className={styles.catalogField} label="EAN da embalagem" value="" disabled={preparing || publishing} options={prepared.gtins.map((code) => ({ value: code, label: code }))} placeholder="Selecione o código do seu produto" onChange={(value) => void prepare(value, product.id, '', accountId, undefined, prepared.query || '')} />}

      {(prepared.ean || prepared.copySource || prepared.localProductId) && <><div className={styles.catalogFields}>
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
      <label className={styles.catalogMatch}><input id="catalog-match" type="checkbox" checked={matched} onChange={(event) => { setMatched(event.target.checked); setErrors((current) => ({ ...current, match: '' })); }} />{form.localProductId ? 'Confirmo o produto e os dados desta publicação.' : 'Confirmo o produto e a quantidade física informada. Este será o estoque inicial do cadastro local.'}</label>{errors.match && <p className={styles.connectionMessage} role="alert">{errors.match}</p>}
      <p className={styles.help}>Publicar em outra conta não acrescenta estoque. Nesta etapa, vendas e ajustes no Mercado Livre ainda não atualizam o saldo físico automaticamente.</p>
      <button type="button" className={styles.primary} disabled={!selectedAccount || !ready || !matched || publishing || preparing || !!publishedId} onClick={() => void publish()}>{publishing ? 'Publicando…' : publishedId ? 'Publicado' : 'Publicar'}</button>
      <button type="button" className={styles.refreshSales} disabled={publishing || preparing} onClick={() => { setPrepared(null); setForm(initial()); setPriceText(''); setStockText(''); setMatched(false); setPublishedId(''); setMessage(''); setPreserveCopiedFields(false); setRequestKey(crypto.randomUUID()); }}>Limpar preparação</button>
      {publishedId && connectedAccounts.filter((account) => account.id !== accountId).length > 0 && <div className={styles.publishAnotherAccount}>
        <MarketplaceAccountPicker label="Publicar esta ficha em outra conta" value={copyTargetId} options={connectedAccounts.filter((account) => account.id !== accountId).map((account) => ({ id: account.id, name: accountDisplayName(account), detail: accountReferenceDetail(account) }))} placeholder="Selecione a conta de destino" disabled={preparing || publishing} onChange={setCopyTargetId} />
        <button type="button" disabled={!copyTargetId || preparing || publishing} onClick={() => void prepareForAnotherAccount()}>Preparar em outra conta</button>
        <p>Os dados são copiados apenas para revisão. A nova conta só recebe o anúncio após uma confirmação separada.</p>
      </div>}
      {!ready && <p className={styles.help}>A publicação só fica disponível após confirmar categoria e opções de venda permitidas pelo Mercado Livre.</p>}
      </>}
    </div>}
    {message && <p className={publishedId ? styles.catalogSuccess : styles.connectionMessage} role="status">{message}</p>}
  </div>;
}
