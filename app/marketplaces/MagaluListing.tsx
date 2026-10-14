'use client';

import { useCallback, useEffect, useState } from 'react';
import CampoBusca from '@/app/components/CampoBusca';
import MarketplaceSelect from './MarketplaceSelect';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import { accountDisplayName, accountReferenceDetail } from './account-identification';
import { publicationAccountAvailable } from './marketplace-scope';
import { formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import type { LocalProduct } from '@/app/modules/marketplaces/services/local-product-model';
import { magaluPublicationErrors, type MagaluCategoryField, type MagaluPublicationForm } from '@/app/modules/marketplaces/magalu-publication-model';
import type { ListingCopyRequest } from './NewListing';
import styles from './marketplaces.module.css';

type Category = { id: string; name: string; path: string };
type Template = { id: string; name: string; attributes: MagaluCategoryField[]; datasheet: MagaluCategoryField[] };
type Progress = { requestKey: string; sku: string; title: string; status: string; stage: string; errorCode: string | null };
type Props = { companyId: string; accountId: string; accounts: MarketplaceAccount[]; canManage: boolean; accountSelectionLocked: boolean;
  onSelectAccount: (id: string) => void; onBusyChange: (busy: boolean) => void; onPublished: () => void;
  copyRequest: ListingCopyRequest | null; onCopyHandled: () => void };

const emptyForm = (): MagaluPublicationForm => ({ productId: '', revision: 0, categoryId: '', sku: '', title: '', brand: '', description: '',
  ean: '', imageUrl: '', condition: 'NEW', priceCents: 0, stock: 0, productHeight: 0, productWidth: 0, productLength: 0,
  productWeight: 0, packageHeight: 0, packageWidth: 0, packageLength: 0, packageWeight: 0, attributes: {}, datasheet: {} });
const stageText: Record<string, string> = {
  sku_submitting: 'Conferindo se o SKU foi recebido pelo Magalu', sku_accepted: 'SKU recebido; aguardando aparecer no catálogo',
  sku_confirmed: 'SKU confirmado; próximo passo: preço', price_submitting: 'Conferindo o primeiro preço',
  price_accepted: 'Preço recebido; aguardando confirmação', price_confirmed: 'Preço confirmado; próximo passo: estoque',
  stock_submitting: 'Conferindo o estoque inicial', stock_accepted: 'Estoque recebido; aguardando publicação pelo Magalu',
};

export default function MagaluListing({ companyId, accountId, accounts, canManage, accountSelectionLocked, onSelectAccount, onBusyChange, onPublished, copyRequest, onCopyHandled }: Props) {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [product, setProduct] = useState<LocalProduct | null>(null);
  const [form, setForm] = useState<MagaluPublicationForm>(emptyForm);
  const [priceText, setPriceText] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [template, setTemplate] = useState<Template | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selected = accounts.find(account => account.id === accountId && publicationAccountAvailable(account));
  const eligible = !!selected?.magalu_catalog_authorized;

  useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
  useEffect(() => {
    if (!accountId || !eligible) return;
    const controller = new AbortController();
    void marketplaceClientRequest(`magalu/publicacao?${new URLSearchParams({ empresaId: companyId, connectionId: accountId })}`, undefined, controller.signal)
      .then((data: { publication: Progress | null }) => { if (!controller.signal.aborted && data.publication) setProgress(data.publication); })
      .catch(() => {});
    return () => controller.abort();
  }, [accountId, companyId, eligible]);

  const loadProduct = useCallback(async (id: string) => {
    setBusy(true); setMessage(''); setErrors({});
    try {
      const data = await marketplaceClientRequest(`produtos?${new URLSearchParams({ empresaId: companyId, productId: id })}`) as { product: LocalProduct };
      const local = data.product;
      const picture = local.pictures.find(url => /\.jpe?g(?:\?|$)/i.test(url)) || '';
      setProduct(local); setTemplate(null); setCategories([]); setConfirmed(false); setProgress(null); setRequestKey(crypto.randomUUID());
      setForm({ ...emptyForm(), productId: local.id, revision: local.revision, sku: local.sku, title: local.name.slice(0, 150),
        description: local.description.slice(0, 7000), ean: local.ean || '', imageUrl: picture,
        condition: local.publication_form.condition === 'used' ? 'USED' : local.publication_form.condition === 'refurbished' ? 'REMANUFACTURED' : 'NEW',
        stock: local.stock_quantity || 0, priceCents: local.price_cents || 0 });
      setPriceText(local.price_cents ? formatarMoedaDigitada(String(local.price_cents)) : '');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o cadastro local.'); }
    finally { setBusy(false); }
  }, [companyId]);

  useEffect(() => {
    if (!copyRequest || copyRequest.targetConnectionId !== accountId) return;
    if (copyRequest.localProductId) void loadProduct(copyRequest.localProductId).finally(onCopyHandled);
    else { setMessage('Para o Magalu, prepare o anúncio a partir de um cadastro em Produtos e estoque.'); onCopyHandled(); }
  }, [accountId, copyRequest, loadProduct, onCopyHandled]);

  async function searchProducts() {
    setBusy(true); setMessage('');
    try {
      const data = await marketplaceClientRequest(`produtos?${new URLSearchParams({ empresaId: companyId, q: query })}`) as { products: LocalProduct[] };
      setProducts(data.products);
      if (!data.products.length) setMessage('Nenhum cadastro local encontrado. Cadastre o produto em Produtos e estoque.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível pesquisar os cadastros.'); }
    finally { setBusy(false); }
  }

  async function searchCategories() {
    if (categoryQuery.trim().length < 3 || !accountId || !canManage) return;
    setBusy(true); setMessage(''); setTemplate(null); setCategories([]); setForm(current => ({ ...current, categoryId: '', attributes: {}, datasheet: {} }));
    try {
      const data = await marketplaceClientRequest(`magalu/categorias?${new URLSearchParams({ empresaId: companyId, connectionId: accountId, name: categoryQuery })}`) as { categories: Category[] };
      setCategories(data.categories);
      if (!data.categories.length) setMessage('Nenhuma categoria encontrada. Tente outro termo.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível consultar categorias.'); }
    finally { setBusy(false); }
  }

  async function chooseCategory(id: string) {
    if (!canManage) return;
    setBusy(true); setMessage(''); setTemplate(null); setForm(current => ({ ...current, categoryId: '', attributes: {}, datasheet: {} }));
    try {
      const data = await marketplaceClientRequest(`magalu/categorias?${new URLSearchParams({ empresaId: companyId, connectionId: accountId, categoryId: id })}`) as { category: Template };
      setTemplate(data.category); setForm(current => ({ ...current, categoryId: id, attributes: {}, datasheet: {} })); setConfirmed(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível confirmar a categoria.'); }
    finally { setBusy(false); }
  }

  const change = <K extends keyof MagaluPublicationForm>(key: K, value: MagaluPublicationForm[K]) => {
    setForm(current => ({ ...current, [key]: value })); setConfirmed(false); setErrors(current => ({ ...current, [key]: '' }));
  };

  async function publish() {
    if (!product || !template || !eligible || !canManage || busy || progress) return;
    const fields = magaluPublicationErrors(form, product, template.attributes, template.datasheet);
    if (!confirmed) fields.confirmed = 'Confirme os dados antes de enviar.';
    setErrors(fields); setMessage('');
    if (Object.keys(fields).length) { document.getElementById('magalu-errors')?.focus(); return; }
    setBusy(true);
    try {
      const data = await marketplaceClientRequest('magalu/publicacao', { empresaId: companyId, connectionId: accountId, action: 'create', requestKey, form }) as { publication: Progress };
      setProgress(data.publication); setMessage('O SKU foi recebido pelo Magalu. Preço, estoque e publicação são confirmados em etapas; acompanhe abaixo.');
    } catch (error) {
      try {
        const check = await marketplaceClientRequest(`magalu/publicacao?${new URLSearchParams({ empresaId: companyId, connectionId: accountId })}`) as { publication: Progress | null };
        if (check.publication?.sku === form.sku && check.publication.status === 'publishing') setProgress(check.publication);
        else if (check.publication?.sku === form.sku && check.publication.status === 'published') setProgress(check.publication);
        else setRequestKey(crypto.randomUUID());
      } catch { setProgress({ requestKey, sku: form.sku, title: form.title, status: 'publishing', stage: 'sku_submitting', errorCode: null }); }
      setMessage(error instanceof Error ? error.message : 'O envio não foi confirmado. Confira o SKU antes de tentar novamente.');
    }
    finally { setBusy(false); }
  }

  async function advance() {
    if (!progress || busy || !canManage) return;
    setBusy(true); setMessage('');
    try {
      const data = await marketplaceClientRequest('magalu/publicacao', { empresaId: companyId, connectionId: accountId, action: 'advance', requestKey: progress.requestKey }) as { publication: Progress };
      setProgress(data.publication);
      if (data.publication.status === 'published') { setMessage('O Magalu confirmou o anúncio como publicado.'); onPublished(); }
      else setMessage('Etapa consultada. Se ainda estiver em análise, aguarde alguns instantes e verifique novamente.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível confirmar esta etapa. Confira o SKU antes de repetir.'); }
    finally { setBusy(false); }
  }

  const accountsReady = accounts.filter(publicationAccountAvailable);
  const field = (key: keyof MagaluPublicationForm, label: string, unit: string, minimum: number) => <label key={key} className={styles.catalogField} htmlFor={`magalu-${key}`}>{label} ({unit})
    <input id={`magalu-${key}`} type="number" min={minimum} step="any" value={form[key] as number || ''} disabled={busy || !!progress} onChange={event => change(key, Number(event.target.value) as never)} />
    {errors[key] && <small>{errors[key]}</small>}</label>;
  const dimensionFields = [field('productHeight', 'Altura do produto', 'cm', 0.001), field('productWidth', 'Largura do produto', 'cm', 0.001),
    field('productLength', 'Comprimento do produto', 'cm', 0.001), field('productWeight', 'Peso do produto', 'g', 1),
    field('packageHeight', 'Altura da embalagem', 'cm', 0.001), field('packageWidth', 'Largura da embalagem', 'cm', 0.001),
    field('packageLength', 'Comprimento da embalagem', 'cm', 0.001), field('packageWeight', 'Peso da embalagem', 'g', 1)];

  return <div className={styles.magaluListing}>
    <MarketplaceAccountPicker label="Publicar na conta Magalu" value={accountId} options={accountsReady.map(account => ({ id: account.id, name: accountDisplayName(account), detail: accountReferenceDetail(account) }))}
      placeholder={accountsReady.length ? 'Selecione uma loja' : 'Nenhuma loja autorizada'} disabled={accountSelectionLocked || busy || !!progress} onChange={onSelectAccount} />
    {!selected && <p className={styles.help}>Conecte a loja Magalu no quadro ao lado para testar a publicação.</p>}
    {selected && !eligible && <p className={styles.catalogNotice} role="status">Esta loja ainda não concedeu acesso de catálogo, preço e estoque. Use “Conectar outra conta” e escolha a mesma loja para reautorizar; não a exclua.</p>}
    {selected && eligible && <>
      <p className={styles.help}>A publicação usa um cadastro local com estoque físico confirmado. Cada envio pede sua confirmação e pode levar alguns minutos para aparecer no Magalu.</p>
      {!progress && <><div className={styles.magaluSearchRow}><CampoBusca id="magalu-product-search" aria-label="Buscar produto local" value={query} onChange={setQuery} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void searchProducts(); } }} placeholder="Busque por nome, SKU ou EAN" rotuloLimpar="Limpar pesquisa de produto" />
        <button type="button" className={styles.primary} disabled={busy || !canManage} onClick={() => void searchProducts()}>Buscar cadastro</button></div>
        {products.length > 0 && <MarketplaceSelect id="magalu-product" label="Produto do cadastro local" value={product?.id || ''} options={products.map(item => ({ value: item.id, label: item.name, detail: item.sku }))}
          onChange={id => void loadProduct(id)} placeholder="Selecione o produto" disabled={busy} />}</>}
      {product && !progress && <div className={styles.catalogResult}>
        <div className={styles.catalogIdentity}>{form.imageUrl && <img src={form.imageUrl} alt={product.name} />}<div><strong>{product.name}</strong><small>SKU {product.sku} · Estoque físico {product.stock_quantity == null ? 'não confirmado' : `${product.stock_quantity} un.`}</small></div></div>
        <div className={styles.magaluSearchRow}><CampoBusca id="magalu-category-search" aria-label="Pesquisar categoria Magalu" value={categoryQuery} onChange={setCategoryQuery} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void searchCategories(); } }} placeholder="Pesquise a categoria mais específica" rotuloLimpar="Limpar pesquisa de categoria" />
          <button type="button" className={styles.primary} disabled={busy || !canManage || categoryQuery.trim().length < 3} onClick={() => void searchCategories()}>Buscar categoria</button></div>
        {categories.length > 0 && <MarketplaceSelect id="magalu-category" label="Categoria do Magalu" value={template?.id || ''} options={categories.map(item => ({ value: item.id, label: item.path, detail: item.id }))}
          onChange={id => void chooseCategory(id)} placeholder="Selecione uma categoria final" disabled={busy || !canManage} />}
        {template && <><p className={styles.help}>Categoria confirmada: {template.name}</p>
          <div className={styles.catalogFields}>
            <label className={styles.catalogField} htmlFor="magalu-title">Título<input id="magalu-title" value={form.title} maxLength={150} disabled={busy} onChange={event => change('title', event.target.value)} />{errors.title && <small>{errors.title}</small>}</label>
            <label className={styles.catalogField} htmlFor="magalu-brand">Marca<input id="magalu-brand" value={form.brand} maxLength={100} disabled={busy} onChange={event => change('brand', event.target.value)} />{errors.brand && <small>{errors.brand}</small>}</label>
            <label className={styles.catalogField} htmlFor="magalu-sku">SKU local<input id="magalu-sku" value={form.sku} readOnly />{errors.sku && <small>{errors.sku}</small>}</label>
            <label className={styles.catalogField} htmlFor="magalu-ean">EAN do cadastro<input id="magalu-ean" value={form.ean} readOnly />{errors.ean && <small>{errors.ean}</small>}</label>
            <label className={styles.catalogField} htmlFor="magalu-condition">Condição<select id="magalu-condition" value={form.condition} disabled={busy} onChange={event => change('condition', event.target.value as MagaluPublicationForm['condition'])}><option value="NEW">Novo</option><option value="USED">Usado</option><option value="REMANUFACTURED">Recondicionado</option></select>{errors.condition && <small>{errors.condition}</small>}</label>
            <label className={styles.catalogField} htmlFor="magalu-price">Preço de venda (R$)<input id="magalu-price" inputMode="decimal" value={priceText} disabled={busy} onChange={event => { const text = formatarMoedaDigitada(event.target.value); setPriceText(text); change('priceCents', Math.round((moedaDigitadaParaNumero(text) || 0) * 100)); }} />{errors.priceCents && <small>{errors.priceCents}</small>}</label>
            <label className={styles.catalogField} htmlFor="magalu-stock">Estoque inicial<input id="magalu-stock" type="number" min="1" max={product.stock_quantity || 0} value={form.stock || ''} disabled={busy} onChange={event => change('stock', Number(event.target.value))} />{errors.stock && <small>{errors.stock}</small>}</label>
            <label className={styles.catalogField} htmlFor="magalu-image">Foto JPEG HTTPS do cadastro<select id="magalu-image" value={form.imageUrl} disabled={busy} onChange={event => change('imageUrl', event.target.value)}><option value="">Selecione a foto</option>{product?.pictures.filter(url => /\.jpe?g(?:\?|$)/i.test(url)).map(url => <option key={url} value={url}>{url.slice(0, 80)}</option>)}</select>{errors.imageUrl && <small>{errors.imageUrl}</small>}</label>
            <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor="magalu-description">Descrição<textarea id="magalu-description" rows={5} maxLength={7000} value={form.description} disabled={busy} onChange={event => change('description', event.target.value)} />{errors.description && <small>{errors.description}</small>}</label>
          </div>
          <h3>Medidas do produto e da embalagem</h3><div className={styles.catalogFields}>{dimensionFields}</div>
          {template.attributes.length > 0 && <><h3>Atributos da categoria</h3><div className={styles.catalogFields}>{template.attributes.map(item => <label key={item.name} className={styles.catalogField} htmlFor={`magalu-attr-${item.name}`}>{item.label}{item.required ? ' *' : ''}<input id={`magalu-attr-${item.name}`} value={form.attributes[item.name] || ''} maxLength={50} disabled={busy} list={item.choices.length ? `magalu-attr-options-${item.name}` : undefined} onChange={event => change('attributes', { ...form.attributes, [item.name]: event.target.value })} />{item.choices.length > 0 && <datalist id={`magalu-attr-options-${item.name}`}>{item.choices.map(value => <option key={value} value={value} />)}</datalist>}{errors[`attributes:${item.name}`] && <small>{errors[`attributes:${item.name}`]}</small>}</label>)}</div></>}
          {template.datasheet.length > 0 && <><h3>Ficha técnica</h3><div className={styles.catalogFields}>{template.datasheet.map(item => <label key={item.name} className={styles.catalogField} htmlFor={`magalu-data-${item.name}`}>{item.label}{item.required ? ' *' : ''}<input id={`magalu-data-${item.name}`} value={form.datasheet[item.name] || ''} maxLength={500} disabled={busy} list={item.choices.length ? `magalu-data-options-${item.name}` : undefined} onChange={event => change('datasheet', { ...form.datasheet, [item.name]: event.target.value })} />{item.choices.length > 0 && <datalist id={`magalu-data-options-${item.name}`}>{item.choices.map(value => <option key={value} value={value} />)}</datalist>}{errors[`datasheet:${item.name}`] && <small>{errors[`datasheet:${item.name}`]}</small>}</label>)}</div></>}
          <label className={styles.catalogMatch}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Conferi a ficha, o preço, a quantidade e a loja. Autorizo o envio deste SKU ao Magalu.</label>
          <button type="button" className={styles.primary} disabled={busy || !confirmed || !canManage} onClick={() => void publish()}>{busy ? 'Enviando…' : 'Enviar anúncio ao Magalu'}</button>
        </>}
      </div>}
      {progress && <div className={styles.catalogNotice} role="status"><strong>{progress.title} · SKU {progress.sku}</strong><p>{progress.status === 'published' ? 'Publicado no Magalu.' : progress.status === 'failed' ? 'O envio foi interrompido. Confira o SKU na loja antes de repetir.' : stageText[progress.stage] || 'Em análise no Magalu.'}</p>
        {progress.status === 'publishing' && <button type="button" className={styles.primary} disabled={busy || !canManage} onClick={() => void advance()}>{busy ? 'Verificando…' : 'Verificar e continuar envio'}</button>}
        {progress.status !== 'publishing' && <button type="button" className={styles.primary} disabled={busy} onClick={() => { setProgress(null); setProduct(null); setTemplate(null); setConfirmed(false); setRequestKey(crypto.randomUUID()); setMessage(''); }}>Preparar outro produto</button>}</div>}
    </>}
    {Object.keys(errors).length > 0 && <p id="magalu-errors" className={styles.catalogNotice} role="alert" tabIndex={-1}>Revise os campos indicados antes de enviar.</p>}
    {message && <p className={styles.catalogNotice} role="status">{message}</p>}
  </div>;
}
