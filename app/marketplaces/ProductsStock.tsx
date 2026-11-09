'use client';
import { MARKETPLACE_DETAIL_NAVIGATION, shouldDismissMarketplaceDetail, PRODUCT_STOCK_CHANGED, PRODUCT_REFERENCE_CHANGED, notifyProductReferenceChanged, notifyProductStockChanged } from './product-stock-events';
import StockSync from './StockSync';
import { NOTICE_OPENING_CANCEL, reportMarketplaceNoticeOpening } from './notice-opening';
import ProductLinkedListings from './ProductLinkedListings';
import ProductQuality from './ProductQuality';
import QualitySummary from './QualitySummary';
import ProductRemoval from './ProductRemoval';
import ProductListingUpdate from './ProductListingUpdate';
import CatalogFullReview from './CatalogFullReview';
import {changedProductListingFields,type ListingUpdateRequest} from '@/app/modules/marketplaces/product-listing-update';
import {stockDivergence} from '@/app/modules/marketplaces/stock-reconciliation';

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import ProductThumbnail from './ProductThumbnail';
import ProductPublicationRibbon from './ProductPublicationRibbon';
import CampoBusca from '@/app/components/CampoBusca';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import DetalhesRolaveis from '@/app/components/DetalhesRolaveis';
import { ativarFocoProduto, recolherProdutoEmFoco } from '@/app/lib/foco-produto';
import Tooltip from '@/app/components/Tooltip';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { formatarMoeda, formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import CampoMoeda from '@/app/components/CampoMoeda';
import { marketplaceDateTimeLabel as date } from '@/app/modules/marketplaces/date-format';
import { productSearchDelay } from '@/app/modules/marketplaces/local-product-search';
import { productPublicationChannels, productPublicationState, type ProductPublicationFilter } from '@/app/modules/marketplaces/local-product-publications';
import { DEFAULT_PRICE_PERCENTAGES, type PricePercentages } from '@/app/modules/marketplaces/price-settings';
import { ProductSalePrices, ReferencePriceEditor } from './LocalProductPricing';
import { Icon } from '@/app/projetos/components/Icon';
import type { ProductSearchHandle } from './ProductSearchShortcut';
import { scrollMarketplaceRow, scrollMarketplacePageTop, scrollExpandedMarketplaceProduct, keepExpandedProductHeaderVisible } from './scroll-panel-row';
import type { LocalProduct } from '@/app/modules/marketplaces/services/local-product-model';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import MarketplaceSelect from './MarketplaceSelect';
import { publicationAccountAvailable } from './marketplace-scope';
import { collapseMarketplacePanel } from './collapse-panel';
import {usePanelExpansion,type PanelExpansionProps} from './panel-expansion';
import InitialStockLoad from './InitialStockLoad';
import PriceProductStock from './PriceProductStock';
import type { Warehouse } from '@/app/modules/marketplaces/warehouses';
import styles from './marketplaces.module.css';

type Props = { companyId: string; dark: boolean; brand: string; canManage: boolean; accounts: MarketplaceAccount[]; publicationAccounts?: MarketplaceAccount[]; refreshKey: number; preparationLocked: boolean; onPrepare: (productId: string, connectionId: string) => void; reorderHandle?: ReactNode; searchRef?: Ref<ProductSearchHandle>; request?: typeof marketplaceClientRequest; percentages?: PricePercentages | null };
export type ProductListContext = Pick<Props, 'accounts' | 'publicationAccounts' | 'preparationLocked' | 'onPrepare' | 'percentages'>;
export type ProductListCount = { total: number | null; loading: boolean };
type ListProps = Props & PanelExpansionProps & { noticeTarget?: { key:string; productId?:string; origin?:'announced' }; noticeNavigationHost?: HTMLElement | null; searchNavigationHost?: HTMLElement | null; onNoticeDismiss?: () => void; warehouse?: Warehouse; stockAccountId?: string; listVisible?: boolean; publicationFilter?: ProductPublicationFilter; onInteractionLockChange?: (locked: boolean) => void; onCountChange?: (count: ProductListCount) => void };
type Movement = { id: string; kind: string; stock_before: number | null; stock_after: number; note: string; created_at: string };
type Command = { action: string; [key: string]: unknown };
const stockLabel = (quantity: number | null) => `${(quantity ?? 0).toLocaleString('pt-BR')} un. físicas`;
const productCountLabel = (total: number, query: string) => `${total} ${query ? total === 1 ? 'produto encontrado' : 'produtos encontrados' : total === 1 ? 'cadastro local da empresa' : 'cadastros locais da empresa'}`;
const visibleListingLink = (status: string) => !['deleted','excluded','unpublished','cancelled','canceled'].includes(status.toLowerCase());

export function LocalProductHeader({ product, expanded, canManage, busy, dark, brand, percentages, onToggle, onCommand, onPrepareAnnouncement, preparationDisabled = false, researching = false, detailPrefix = 'local-detail', warehouse,stockRequest }: {
  product: LocalProduct; expanded: boolean; canManage: boolean; busy: boolean; dark: boolean; brand: string;
  percentages: PricePercentages | null; onToggle: () => void; onCommand: (command: Command) => void; researching?: boolean;
  onPrepareAnnouncement?: () => void; preparationDisabled?: boolean;
  detailPrefix?: string; warehouse?: Warehouse;stockRequest?:import('./usePriceLotCapture').LotsRequest;
}) {
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => { if (!copyStatus) return; const timer = setTimeout(() => setCopyStatus(''), 3000); return () => clearTimeout(timer); }, [copyStatus]);
  async function copyProductReference() {
    try {
      const value = `${product.name}\nEAN: ${product.ean || 'Não informado'}`;
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const field = document.createElement('textarea');
        field.value = value; field.setAttribute('readonly', ''); field.style.position = 'fixed'; field.style.opacity = '0';
        document.body.append(field); field.select();
        try { if (!document.execCommand('copy')) throw new Error('copy_failed'); } finally { field.remove(); }
      }
      setCopyStatus('Nome e EAN copiados.');
    } catch { setCopyStatus('Não foi possível copiar. Tente novamente.'); }
  }
  const channels = productPublicationChannels(product.links);
  const hasListing = product.links.some(link => !['deleted','excluded','unpublished','cancelled','canceled'].includes(link.status.trim().toLowerCase()));
  const showPrepareAnnouncement = canManage && !hasListing && !!onPrepareAnnouncement;
  const syncRequest=useCallback(async(path:string,options?:RequestInit)=>marketplaceClientRequest(path.replace('/api/modulos/marketplaces/',''),options?.body?JSON.parse(String(options.body)):undefined,options?.signal??undefined,options?.method),[]);
  const displayedQuantity = warehouse ? product.allocations?.find(w => w.warehouseId === warehouse.id)?.quantity : product.allocations ? product.total_stock_quantity : product.stock_quantity;
  return <div id={`identity-${detailPrefix}-${product.id}`} className={styles.localProductHeading}>
    <ProductThumbnail key={product.pictures[0]} url={product.pictures[0]} name={product.name} />
    <div className={styles.localProductSummary}>
      <div className={styles.localProductTitleRow}><button className={styles.localProductName} type="button" disabled={busy} aria-expanded={expanded} aria-controls={`${detailPrefix}-${product.id}`} onClick={onToggle}><strong>{product.name}</strong></button><BotaoAcaoCompacto variante="discreto" somenteIcone aria-label="Copiar nome e EAN do produto" title="Copiar nome e EAN" onClick={event=>{event.stopPropagation();void copyProductReference();}}><Icon name="copy" size={15}/></BotaoAcaoCompacto></div>
      {copyStatus&&<small role="status">{copyStatus}</small>}
      <div className={styles.localProductMetadata}><span>{product.sku}</span><span>EAN: {product.ean || 'Não informado'}</span></div>
      <QualitySummary links={product.links.filter(l=>l.provider==='mercado_livre'&&!['closed','deleted','excluded','unpublished','cancelled','canceled'].includes(l.status)).map(l=>({connectionId:l.connection_id,id:l.provider_listing_id}))}/>
      <div className={styles.localProductChannels} aria-label="Marketplaces com publicação ativa">{channels.length ? channels.map(channel => <Tooltip key={channel.provider} texto={`${channel.name}: ${channel.total} anúncio(s) ativo(s).`}><span className={styles.localProductChannel} data-provider={channel.provider} aria-label={`${channel.name}, ${channel.total} anúncio(s) ativo(s)`}>{channel.name}</span></Tooltip>) : <span className={styles.localProductUnpublished}>{product.links.length ? 'Sem anúncio ativo' : 'Sem publicação'}</span>}</div>
    </div>
    <div className={styles.localProductFinancial}>
      <div className={styles.localProductNumbers} role="group" aria-label="Estoque do produto">
        <span className={styles.productSummaryLabel}>Estoque</span>
        <div className={styles.productStockBalances}>{product.allocations?.length ? product.allocations.map(w=><span key={w.warehouseId} data-selected={warehouse?.id===w.warehouseId || undefined}>{w.name}: {w.quantity ?? 0} un.</span>) : <span>{warehouse?.name || 'Online'}: {displayedQuantity ?? 0} un.</span>}</div>
        {product.listing_stock_review_at && product.links.some(l=>!['closed','deleted','excluded','unpublished','cancelled','canceled'].includes(l.status.trim().toLowerCase())) ? <Tooltip texto="Use Confirmar saldo nos detalhes do produto."><span className={styles.productStockPending} role="status"><Icon name="alert" size={14} aria-hidden="true"/>Estoque a confirmar</span></Tooltip> : product.stock_quantity===0&&<span className={styles.productStockPending} role="status">Sem estoque</span>}
        <StockSync badge companyId={product.empresa_id} productId={product.id} dark={dark} brand={brand} request={stockRequest||syncRequest} hint={product.stock_quantity==null?'':stockDivergence(product.stock_quantity,product.links)}/>
      </div>
      <div className={styles.localProductPricing} role="group" aria-label="Preços sugeridos do produto">
        <span className={styles.productSummaryLabel}>Preços sugeridos</span>
        <ReferencePriceEditor key={`${product.revision}:${expanded}`} product={product} canEdit={canManage} disabled={busy} onSave={onCommand} researching={researching} onResearch={() => onCommand({ action: 'refresh_price', productId: product.id, revision: product.revision })} />
        <ProductSalePrices reference={product.price_cents} percentages={percentages} />
      </div>
    </div>
    <div className={styles.localProductPriceActions}>{showPrepareAnnouncement && <BotaoAcaoCompacto className={styles.localProductPrepareButton} variante="primario" disabled={busy || preparationDisabled} onClick={onPrepareAnnouncement}>Preparar anúncio</BotaoAcaoCompacto>}<BotaoExpandirCard variante="painel" destaque modo="lista" contexto={`produto ${product.name}`} controlsId={`${detailPrefix}-${product.id}`} expandido={expanded} corPrimaria={brand} darkMode={dark} desabilitado={busy} onClick={onToggle} /></div>
  </div>;
}

function ProductFields({ product, disabled, onSave, onCancel, idPrefix = 'local' }: { product?: LocalProduct; disabled: boolean; onSave: (command: Command) => void; onCancel: () => void; idPrefix?: string }) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [ean, setEan] = useState(product?.ean || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price_cents ? formatarMoedaDigitada(String(product.price_cents)) : '');
  const [pictures, setPictures] = useState((product?.pictures || []).join('\n'));
  const [category, setCategory] = useState(product?.category_id || '');
  const [attributes, setAttributes] = useState(() => (product?.attributes || []).map(attribute => ({ id: attribute.id, name: attribute.name, value: attribute.value })));
  const [requestKey] = useState(() => crypto.randomUUID());
  const prefix = `${idPrefix}-${product?.id || 'new'}`;
  return <form className={styles.localForm} onSubmit={event => { event.preventDefault(); onSave({ action: product ? 'editor_update' : 'create', requestKey, productId: product?.id, revision: product?.revision, name, sku, ean, description, price: price ? moedaDigitadaParaNumero(price) : null, pictures: pictures.split('\n').map(url => url.trim()).filter(Boolean), categoryId: category, attributes }); }}>
    <div className={styles.catalogFields}>
      <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor={`${prefix}-name`}>Nome do produto<input id={`${prefix}-name`} required maxLength={220} value={name} disabled={disabled} onChange={event => setName(event.target.value)} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-sku`}>Código interno (SKU)<input id={`${prefix}-sku`} maxLength={80} value={sku} disabled={disabled || !!product} placeholder="Gerado automaticamente se vazio" onChange={event => setSku(event.target.value)} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-ean`}>EAN / GTIN (opcional)<input id={`${prefix}-ean`} inputMode="numeric" maxLength={14} value={ean} disabled={disabled} onChange={event => setEan(event.target.value.replace(/\D/g, ''))} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-price`}>Preço de referência (opcional)<CampoMoeda id={`${prefix}-price`} value={price} disabled={disabled} onChange={setPrice} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-category`}>Categoria do Mercado Livre (opcional)<input id={`${prefix}-category`} maxLength={30} placeholder="Ex.: MLB1234" value={category} disabled={disabled} onChange={event => setCategory(event.target.value.toUpperCase())} /></label>
      <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor={`${prefix}-description`}>Descrição<textarea id={`${prefix}-description`} rows={4} maxLength={50000} value={description} disabled={disabled} onChange={event => setDescription(event.target.value)} /></label>
      <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor={`${prefix}-pictures`}>Fotos — um endereço HTTPS por linha<textarea id={`${prefix}-pictures`} rows={3} value={pictures} disabled={disabled} onChange={event => setPictures(event.target.value)} /></label>
      {product && <fieldset className={`${styles.catalogWide} ${styles.localAttributeEditor}`} disabled={disabled}>
        <legend>Características</legend><p className={styles.help}>Use os dados da etiqueta ou ficha técnica. Tensão, potência e EAN não são intercambiáveis entre versões.</p>
        <div className={styles.localAttributeRows}>{attributes.map((attribute, index) => <div key={`${attribute.id}-${index}`} className={styles.localAttributeRow}>
          <label htmlFor={`${prefix}-attribute-id-${index}`}>Identificador<input id={`${prefix}-attribute-id-${index}`} required maxLength={80} pattern="[A-Za-z0-9_]+" value={attribute.id} placeholder="Ex.: POWER" onChange={event => setAttributes(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, id: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') } : item))} /></label>
          <label htmlFor={`${prefix}-attribute-name-${index}`}>Característica<input id={`${prefix}-attribute-name-${index}`} required maxLength={120} value={attribute.name} placeholder="Ex.: Potência" onChange={event => setAttributes(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} /></label>
          <label htmlFor={`${prefix}-attribute-value-${index}`}>Valor<input id={`${prefix}-attribute-value-${index}`} required maxLength={1000} value={attribute.value} placeholder="Ex.: 350 W" onChange={event => setAttributes(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))} /></label>
          <BotaoAcaoCompacto type="button" variante="destrutivo" aria-label={`Remover característica ${attribute.name || index + 1}`} onClick={() => setAttributes(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remover</BotaoAcaoCompacto>
        </div>)}</div>
        <BotaoAcaoCompacto type="button" variante="discreto" onClick={() => setAttributes(current => [...current, { id: '', name: '', value: '' }])}>Adicionar característica</BotaoAcaoCompacto>
      </fieldset>}
    </div>
    <p className={styles.help}>Salvar aqui não altera os anúncios. O estoque físico é confirmado separadamente.</p>
    <div className={styles.productDetailActions}><BotaoAcaoCompacto type="button" disabled={disabled} onClick={onCancel}>Cancelar</BotaoAcaoCompacto><BotaoAcaoCompacto type="submit" variante="primario" disabled={disabled || !name.trim()}>Salvar cadastro</BotaoAcaoCompacto></div>
  </form>;
}

export function ProductDetail({ product, props, busy, onCommand, onStockBusy, onStockUpdated, onProductRemoved }: { product: LocalProduct; props: ListProps; busy: boolean; onCommand: (command: Command, confirmation?: string) => void; onStockBusy:(busy:boolean)=>void; onStockUpdated:()=>void;onProductRemoved?:(mode:'deleted'|'archived')=>void }) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [targets, setTargets] = useState<LocalProduct[]>([]);
  const [targetId, setTargetId] = useState('');
  const [sameProduct, setSameProduct] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [warehouseMovements,setWarehouseMovements]=useState<Array<{id:string;kind:string;warehouse_id:string;warehouse_name:string;destination_id:string|null;destination_name:string|null;quantity:number|null;stock_before:number|null;stock_after:number|null;created_at:string;note?:string}>|null>(null);
  const [detailError, setDetailError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [linkedProduct,setLinkedProduct]=useState<LocalProduct|null>(null);
  const { companyId, canManage, accounts, preparationLocked, onPrepare } = props;
  const detailPrefix = props.warehouse ? `local-detail-warehouse-${props.warehouse.id}` : 'local-detail';
  const fieldPrefix = props.warehouse ? `warehouse-${props.warehouse.id}` : 'local';
  const detailQuantity = props.warehouse ? product.allocations?.find(w => w.warehouseId === props.warehouse!.id)?.quantity ?? 0 : product.allocations ? product.total_stock_quantity ?? product.allocations.reduce((total,w)=>total+(w.quantity ?? 0),0) : product.stock_quantity;
  const request = props.request ?? marketplaceClientRequest;
  const stockRequest=useCallback(async(path:string,options?:RequestInit)=>request(path.replace('/api/modulos/marketplaces/',''),options?.body?JSON.parse(String(options.body)):undefined,options?.signal ?? undefined,options?.method),[request]);
  const publicationAccounts = props.publicationAccounts ?? accounts;
  const validTargetAccount = publicationAccounts.find(publicationAccountAvailable)?.id || '';
  function prepareAnnouncement() {
    if (busy || preparationLocked || !validTargetAccount) return;
    onPrepare(product.id, validTargetAccount);
  }
  useEffect(() => {
    const controller = new AbortController();
    void request(`produtos?${new URLSearchParams({ empresaId: companyId, productId: product.id })}`, undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { setMovements(data.movements);setWarehouseMovements(data.warehouseMovements ?? null);if(data.product?.id===product.id)setLinkedProduct(data.product); setHistoryLoaded(true); }
    }).catch(error => { if (!controller.signal.aborted) setDetailError(error.message); });
    return () => controller.abort();
  }, [companyId, product.id, product.revision, product.allocations, product.links, request]);
  useEffect(() => {
    if (!canManage || product.stock_quantity != null) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void request(`produtos?${new URLSearchParams({ empresaId: companyId, q: targetSearch })}`, undefined, controller.signal).then(data => {
        if (!controller.signal.aborted) { setTargets(data.products.filter((row: LocalProduct) => row.id !== product.id)); setTargetId(''); setSameProduct(false); }
      }).catch(error => { if (!controller.signal.aborted) setDetailError(error.message); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [companyId, canManage, product.id, product.stock_quantity, targetSearch, request]);
  const target = targets.find(row => row.id === targetId);
  const visibleLinks = product.links.filter(link => visibleListingLink(link.status));
  const sourceLink = visibleLinks.find(link => accounts.some(account => account.id === link.connection_id && account.status === 'connected'));
  return <div className={styles.localProductDetail} id={`${detailPrefix}-${product.id}`}>
    <ProductQuality product={linkedProduct||product} accounts={accounts} canManage={canManage} busy={busy} dark={props.dark} brand={props.brand} request={request} onBusy={onStockBusy}/>
    <section className={styles.productDetailSection} aria-label="Cadastro do produto"><header className={styles.productSectionHeader}><h3>Cadastro do produto</h3>{canManage && <div className={styles.productDetailActions}><BotaoAcaoCompacto disabled={busy} aria-expanded={editing} onClick={() => setEditing(value => !value)}>Editar cadastro</BotaoAcaoCompacto>{visibleLinks.length > 0 && <BotaoAcaoCompacto disabled={busy || !sourceLink} onClick={() => onCommand({ action: 'refresh_listing', productId: product.id, connectionId: sourceLink?.connection_id, listingId: sourceLink?.provider_listing_id })}>Consultar ficha do anúncio</BotaoAcaoCompacto>}</div>}</header>
    <dl className={styles.productSummaryFacts}><div><dt>Código interno</dt><dd>{product.sku}</dd></div><div><dt>EAN / GTIN</dt><dd>{product.ean || 'Não informado'}</dd></div><div><dt>Preço de referência</dt><dd>{product.price_cents ? formatarMoeda(product.price_cents / 100) : 'Não informado'}</dd></div><div><dt>Categoria</dt><dd>{product.category_id || 'Ainda não cadastrada'}</dd></div></dl>
    {canManage&&!editing&&<CatalogFullReview key={product.id} companyId={companyId} productId={product.id} request={request} brand={props.brand} dark={props.dark} disabled={busy||!product.ean} onBusy={onStockBusy}/>}
    {editing && <ProductFields idPrefix={fieldPrefix} product={product} disabled={busy} onSave={onCommand} onCancel={() => setEditing(false)} />}
    {product.internal_notes && <section className={styles.localSection} aria-label="Observações internas do produto"><h4>Observações internas</h4><p className={styles.localDescription}>{product.internal_notes}</p><small>Visíveis aos usuários deste perfil. Não são enviadas aos anúncios online.</small></section>}
    <details className={styles.productDescription}><summary>Descrição e fotos</summary><p className={styles.localDescription}>{product.description || 'Descrição ainda não cadastrada.'}</p>
    {product.pictures.length > 0 && <div className={styles.catalogPictures}>{product.pictures.map(url => <img key={url} src={url} alt={product.name} loading="lazy" />)}</div>}
    </details>
    <details className={styles.localSection}><summary>Dados para publicação e características</summary><dl className={styles.localFacts}><dt>Condição</dt><dd>{({ new: 'Novo', used: 'Usado', refurbished: 'Recondicionado' } as Record<string, string>)[product.publication_form.condition || ''] || 'Não informada'}</dd><dt>Garantia</dt><dd>{({ none: 'Sem garantia', seller: 'Do vendedor', factory: 'De fábrica' } as Record<string, string>)[product.publication_form.warrantyType || ''] || 'Não informada'} {product.publication_form.warrantyTime}</dd><dt>Tipo de anúncio</dt><dd>{({ free: 'Grátis', gold_special: 'Clássico', gold_pro: 'Premium' } as Record<string, string>)[product.publication_form.listingType || ''] || 'Não informado'}</dd><dt>Envio</dt><dd>{({ me2: 'Mercado Envios', not_specified: 'A combinar' } as Record<string, string>)[product.publication_form.shippingMode || ''] || 'Não informado'}</dd>{product.attributes.map(attr => <div key={attr.id}><dt>{attr.name}</dt><dd>{attr.value}</dd></div>)}</dl></details>
    </section>
    {canManage && <>
      <section className={styles.productDetailSection} aria-label="Estoques do produto"><header className={styles.productSectionHeader}><h3>Estoques e movimentações</h3><span>{props.warehouse?.name || 'Todos os estoques'} · {stockLabel(detailQuantity)}</span></header>
      {product.allocations ? <PriceProductStock showRemoval={false} showInternalNotes={false} dark={props.dark} brand={props.brand} initialWarehouseId={props.warehouse?.id} idPrefix={fieldPrefix} companyId={companyId} productId={product.id} request={stockRequest} disabled={busy} onBusyChange={onStockBusy} onStockUpdated={onStockUpdated} /> : <section className={styles.localSection}><h3>{product.stock_quantity == null ? 'Confirmar estoque físico online' : 'Ajustar estoque físico online'}</h3>
        <p className={styles.help}>Conte as unidades reais deste produto. Não some as quantidades das contas.</p>
        <div className={styles.catalogFields}><label className={styles.catalogField} htmlFor={`${fieldPrefix}-quantity-${product.id}`}>Quantidade física<input id={`${fieldPrefix}-quantity-${product.id}`} inputMode="numeric" value={quantity} maxLength={5} disabled={busy} onChange={event => { setQuantity(event.target.value.replace(/\D/g, '')); setConfirmed(false); }} placeholder="Inclua zero se não houver unidades" /></label><label className={styles.catalogField} htmlFor={`${fieldPrefix}-note-${product.id}`}>Observação (opcional)<input id={`${fieldPrefix}-note-${product.id}`} value={note} maxLength={500} disabled={busy} onChange={event => setNote(event.target.value)} /></label></div>
        <label className={styles.catalogMatch}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Conferi o estoque físico; não estou somando os anúncios das contas.</label>
        <button type="button" className={styles.primary} disabled={busy || !confirmed || !quantity} onClick={() => onCommand({ action: 'confirm_stock', productId: product.id, revision: product.revision, quantity: Number(quantity), physicalConfirmation: confirmed, note }, `Confirmar ${quantity} unidades físicas de “${product.name}”? O saldo anterior será substituído, com registro no histórico. Nenhum anúncio será alterado.`)}>Confirmar estoque</button>
      </section>}</section>
      {product.stock_quantity == null && <details className={styles.localSection}><summary>Este produto já está em outro cadastro?</summary><p className={styles.help}>Vincule os anúncios ao cadastro correto. O estoque dele será mantido, sem somar quantidades.</p><div className={styles.form}><CampoBusca id={`${fieldPrefix}-target-search-${product.id}`} aria-label="Buscar cadastro de destino" value={targetSearch} onChange={setTargetSearch} placeholder="Nome, SKU ou EAN" /></div>
        <MarketplaceSelect id={`${fieldPrefix}-target-product-${product.id}`} label="Cadastro que será mantido" value={targetId} onChange={value => { setTargetId(value); setSameProduct(false); }} options={targets.map(row => ({ value: row.id, label: row.name, detail: `${row.sku} · ${stockLabel(row.stock_quantity)}` }))} placeholder="Selecione o produto físico correspondente" disabled={busy} />
        <label className={styles.catalogMatch}><input type="checkbox" disabled={busy || !target} checked={sameProduct} onChange={event => setSameProduct(event.target.checked)} />Confirmo que são exatamente o mesmo produto físico.</label>
        <button type="button" disabled={busy || !target || !sameProduct} onClick={() => onCommand({ action: 'merge', productId: product.id, revision: product.revision, targetId: target?.id, targetRevision: target?.revision, sameProduct }, `Vincular os anúncios de “${product.name}” ao cadastro “${target?.name}”? Este cadastro ficará arquivado e o estoque do destino será mantido, sem soma.`)}>Vincular ao cadastro</button>
      </details>}
    </>}
    <section className={styles.productDetailSection} aria-label="Publicação do produto"><header className={styles.productSectionHeader}><h3>Publicação</h3><span>{visibleLinks.length} anúncio(s) vinculado(s)</span></header>
      {canManage && !visibleLinks.length && product.stock_quantity != null && <><div className={styles.productPublishRow}><div className={styles.productPrepareAction}><BotaoAcaoCompacto variante="primario" disabled={busy || preparationLocked || !validTargetAccount} onClick={prepareAnnouncement}>Preparar anúncio</BotaoAcaoCompacto></div></div><p className={styles.help}>{preparationLocked ? 'Conclua ou limpe a preparação aberta antes de iniciar outra.' : 'Abre Novo anúncio com os dados cadastrados. Escolha uma ou mais contas ao final da preparação.'}</p></>}
      <StockSync companyId={companyId} productId={product.id} dark={props.dark} brand={props.brand} request={stockRequest} hint={stockDivergence(product.stock_quantity,product.links)} onUpdated={onStockUpdated} onBusyChange={onStockBusy}/>
      <ProductLinkedListings showQuality={false} product={linkedProduct||product} accounts={accounts} canManage={canManage} busy={busy} dark={props.dark} brand={props.brand} request={request} onBusy={onStockBusy} onUpdated={onStockUpdated}/>
      {canManage&&<ProductRemoval preserveProduct onListingsRemoved={onStockUpdated} companyId={companyId} productId={product.id} request={stockRequest} disabled={busy} dark={props.dark} brand={props.brand} onBusyChange={onStockBusy} onRemoved={result=>{if(onProductRemoved)onProductRemoved(result.mode);else onStockUpdated();}}/>}
    </section>
    <section className={styles.productDetailSection} aria-label="Históricos do produto"><header className={styles.productSectionHeader}><h3>Históricos</h3></header><div className={styles.productHistoryGrid}>
    <details className={styles.localSection}><summary>Histórico de estoque</summary>{historyLoaded && !movements.length && <p className={styles.help}>Nenhuma movimentação de estoque.</p>}<ul>{movements.map(movement => <li key={movement.id}><strong>{movement.kind === 'confirmation' ? 'Confirmação' : movement.kind === 'sale' ? 'Venda' : 'Ajuste'} · {date(movement.created_at)}</strong><span>{movement.stock_before ?? 0} → {movement.stock_after} un. {movement.note}</span></li>)}</ul></details>
    {product.allocations&&<details className={styles.localSection}><summary>Movimentações por estoque</summary>{warehouseMovements===null?<p>Histórico indisponível. Atualize o produto.</p>:!warehouseMovements.length?<p>Nenhuma movimentação nesta estrutura.</p>:<ul>{warehouseMovements.map(m=><li key={m.id}><strong>{({add:'Entrada',set:'Saldo final',transfer:'Transferência',sale:'Venda direta',withdraw:'Outra saída',sale_return:'Devolução de venda'} as Record<string,string>)[m.kind]||m.kind} · {date(m.created_at)}</strong><span>{m.warehouse_name}: {m.stock_before ?? 0} → {m.stock_after} un.{m.destination_id?` · Para ${m.destination_name}: ${m.quantity} un.`:''}</span>{m.note&&<small>{m.note}</small>}</li>)}</ul>}</details>}
    </div></section>
    {detailError && <p className={styles.connectionMessage} role="alert">{detailError}</p>}
  </div>;
}

export default function ProductsStock(props: ListProps) {
  const { companyId, dark, brand, canManage, refreshKey, reorderHandle } = props;
  const warehouseId = props.warehouse?.id;
  const stockAccountId=props.stockAccountId || '';
  const publicationFilter = props.publicationFilter || 'all';
  const searchId = warehouseId ? `warehouse-${warehouseId}-search` : 'local-product-search';
  const detailPrefix = warehouseId ? `local-detail-warehouse-${warehouseId}` : 'local-detail';
  const request = props.request ?? marketplaceClientRequest;
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [countLoading, setCountLoading] = useState(true);
  const [countFailed, setCountFailed] = useState(false);
  const [page, setPage] = useState(1);
  const pageScrollRequested = useRef(false);
  const [query, setQuery] = useState('');
  const [readerArmed, setReaderArmed] = useState(false);
  const [expanded, setExpanded] = usePanelExpansion(props);
  const [detailId, setDetailId] = useState('');
  const productRows=useRef(new Map<string,HTMLElement>()),expansionScrollRequested=useRef('');
  const focusCanClose=useRef(true);
  useEffect(() => {
    if (!detailId) return;
    const ficha = productRows.current.get(detailId);
    if (ficha) {
      const restore=ativarFocoProduto(ficha,()=>{if(!focusCanClose.current)return false;setDetailId('');return true;},()=>setDetailId(''));
      const stopAlignment=keepExpandedProductHeaderVisible(ficha);
      return()=>{stopAlignment();restore();};
    }
  }, [detailId, companyId, warehouseId]);
  useEffect(()=>{
    if(!detailId || expansionScrollRequested.current!==detailId)return;
    expansionScrollRequested.current='';
    return scrollExpandedMarketplaceProduct(()=>productRows.current.get(detailId)||null);
  },[detailId]);
  const [noticeProduct, setNoticeProduct] = useState('');
  const consumedNotice=useRef('');
  const noticeOpeningPending=useRef(false);
  const [noticeResult,setNoticeResult]=useState<{key:string;error?:string}>();
  const [creating, setCreating] = useState(false);
  const [stockLoadOpen, setStockLoadOpen] = useState(false);
  const [stockLoadConfirmation, setStockLoadConfirmation] = useState(false);
  const [loading, setLoading] = useState(!!warehouseId);
  const [busy, setBusy] = useState(false);
  const [researchingId, setResearchingId] = useState('');
  const [priceFeedback, setPriceFeedback] = useState<{productId:string;message:string;error?:boolean;updated?:boolean}|null>(null);
  const [message, setMessage] = useState('');
  const [listingUpdate,setListingUpdate]=useState<ListingUpdateRequest|null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  useEffect(()=>{
    if(!priceFeedback&&!actionError&&!message)return;
    const timer=setTimeout(()=>{setPriceFeedback(null);setActionError('');setMessage('');},20_000);
    return ()=>clearTimeout(timer);
  },[priceFeedback,actionError,message]);
  useEffect(()=>{setPriceFeedback(null);setActionError('');setMessage('');},[companyId,warehouseId,detailId,query,page]);
  const [confirmation, setConfirmation] = useState<{ command: Command; message: string } | null>(null);
  const active = useRef(true);
  const mutationInFlight = useRef(false);
  focusCanClose.current=!busy&&!mutationInFlight.current;
  useEffect(()=>{
    if (!props.noticeTarget?.productId || consumedNotice.current===props.noticeTarget.key || busy || creating || stockLoadOpen) return;
    consumedNotice.current=props.noticeTarget.key;
    noticeOpeningPending.current=true;
    setNoticeResult(undefined);
    controller.current?.abort();generation.current++;
    pageScrollRequested.current=false;
    // Mesmo ciclo da expansão manual: medir no quadro seguinte, após detalhes/foco.
    expansionScrollRequested.current=props.noticeTarget.origin==='announced'?'':props.noticeTarget.productId;
    setNoticeProduct(props.noticeTarget.productId); setDetailId(''); setExpanded(true);setQuery('');setPage(1);
    setProducts([]);setError('');setActionError('');setLoading(true);
    loadedListKey.current='';
  },[props.noticeTarget?.key,props.noticeTarget?.productId,busy,creating,stockLoadOpen]);
  const panel = useRef<HTMLElement>(null), searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (loading || !pageScrollRequested.current) return;
    pageScrollRequested.current = false;
    return scrollMarketplacePageTop(panel.current);
  }, [loading]);
  function changeProductPage(next: number) {
    if (busy || loading || next < 1 || (next > page && next > Math.ceil(total / 25)) || next === page) return;
    pageScrollRequested.current = true;
    setLoading(true); setDetailId(''); setPage(next);
  }
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const onInteractionLockChange = props.onInteractionLockChange;
  const countCallback = useRef(props.onCountChange);
  const confirmedCount = useRef<number | null>(null);
  const confirmedCountScope = useRef('');
  const countController = useRef<AbortController | null>(null);
  const listVisible = warehouseId ? props.listVisible !== false : expanded;
  const countProducts = useCallback(async () => {
    const scope=JSON.stringify([companyId,warehouseId,query,publicationFilter,stockAccountId]);
    if(confirmedCountScope.current!==scope){confirmedCount.current=null;confirmedCountScope.current=scope;}
    countController.current?.abort(); const c = new AbortController(); countController.current = c;
    setCountLoading(true); setCountFailed(false);
    countCallback.current?.({total:confirmedCount.current,loading:true});
    try {
      const data = await request(`produtos?${new URLSearchParams({empresaId:companyId,q:query,...(warehouseId?{warehouseId}:{}),publication:publicationFilter,countOnly:'1',...(stockAccountId?{connectionId:stockAccountId}:{})})}`,undefined,AbortSignal.any([c.signal,AbortSignal.timeout(20_000)]));
      if(c.signal.aborted || !active.current) return;
      if(!Number.isSafeInteger(data.total) || data.total<0) throw new Error('Total indisponível.');
      confirmedCount.current=data.total; setTotal(data.total); countCallback.current?.({total:data.total,loading:false});
    } catch {if(!c.signal.aborted && active.current){setCountFailed(true);countCallback.current?.({total:null,loading:false});}}
    finally { if(!c.signal.aborted && active.current)setCountLoading(false); }
  },[companyId,warehouseId,query,publicationFilter,stockAccountId,request]);
  useEffect(()=>{const timer=setTimeout(()=>{void countProducts();},query?productSearchDelay(query):0);return()=>{clearTimeout(timer);countController.current?.abort();};},[countProducts,refreshKey,query]);
  const loadedListKey = useRef('');
  useEffect(() => { countCallback.current = props.onCountChange; }, [props.onCountChange]);
  useEffect(() => { onInteractionLockChange?.(busy || creating); }, [onInteractionLockChange, busy, creating]);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (shouldDismissMarketplaceDetail(event, companyId, detailId ? `product:${detailPrefix}:${detailId}` : '', busy || mutationInFlight.current)) setDetailId('');
    };
    window.addEventListener(MARKETPLACE_DETAIL_NAVIGATION, dismiss);
    return () => window.removeEventListener(MARKETPLACE_DETAIL_NAVIGATION, dismiss);
  }, [companyId, detailPrefix, detailId, busy]);
  useEffect(() => () => { onInteractionLockChange?.(false); }, [onInteractionLockChange]);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  const load = useCallback(async () => {
    loadedListKey.current=JSON.stringify([companyId,warehouseId,publicationFilter,stockAccountId,query,page,refreshKey,noticeProduct,props.noticeTarget?.key]);
    controller.current?.abort(); const current = new AbortController(); controller.current = current;
    const revision = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await request(`produtos?${new URLSearchParams(noticeProduct ? {empresaId:companyId,productId:noticeProduct} : { empresaId: companyId, q: query, page: String(page), skipCount:'1', ...(warehouseId ? { warehouseId } : {}), ...(stockAccountId?{connectionId:stockAccountId}:{}), ...(publicationFilter !== 'all' ? { publication: publicationFilter } : {}) })}`, undefined, noticeProduct ? AbortSignal.any([current.signal,AbortSignal.timeout(20_000)]) : current.signal);
      if (noticeProduct && (result.product?.id !== noticeProduct || result.product?.empresa_id !== companyId)) throw new Error('Produto não encontrado neste perfil. O cadastro pode ter sido removido ou o vínculo do anúncio precisa ser conferido.');
      const data = noticeProduct ? {products:[result.product],total:1} : result;
      if (!current.signal.aborted && active.current && generation.current === revision) {
        setProducts(data.products); if(!warehouseId && Number.isSafeInteger(data.total) && data.total>=0){setTotal(data.total);confirmedCount.current=data.total;countCallback.current?.({ total: data.total, loading: false });}
        const openNotice=!!noticeProduct&&noticeOpeningPending.current;
        if(openNotice)noticeOpeningPending.current=false;
        if(openNotice&&props.noticeTarget)setNoticeResult({key:props.noticeTarget.key});
        if(openNotice)setDetailId(props.noticeTarget?.origin==='announced'?'':noticeProduct);
        else setDetailId(id => data.products.some((product: LocalProduct) => product.id === id) ? id : '');
        if(openNotice)requestAnimationFrame(()=>{
          if(current.signal.aborted || !active.current || generation.current!==revision)return;
          const row=productRows.current.get(noticeProduct);
          if(!row)return;
          if(props.noticeTarget?.origin==='announced'){
            if(row){scrollMarketplaceRow(row);row.querySelector<HTMLButtonElement>('button[aria-controls]')?.focus({preventScroll:true});}
          }
        });
        if (readerArmed && document.activeElement === searchInput.current && searchInput.current?.value === query) searchInput.current.select();
      }
    } catch (failure) { if (!current.signal.aborted && active.current && generation.current === revision) { const message=failure instanceof Error && failure.name==='TimeoutError'?'A consulta do produto demorou mais que o esperado. Tente novamente.':failure instanceof Error ? failure.message : 'Não foi possível carregar produtos.';setError(message);if(noticeProduct&&props.noticeTarget){setNoticeResult({key:props.noticeTarget.key,error:message});reportMarketplaceNoticeOpening(props.noticeTarget.key,message);} if(!warehouseId)countCallback.current?.({ total: null, loading: false }); } }
    finally { if (!current.signal.aborted && active.current && generation.current === revision) setLoading(false); }
  }, [companyId, query, page, request, readerArmed, warehouseId, publicationFilter,stockAccountId,refreshKey,noticeProduct,props.noticeTarget?.origin,props.noticeTarget?.key]);
  useEffect(() => {
    // Uma venda não pode apagar campos que o usuário está revisando.
    if (detailId || creating || busy || !listVisible) return;
    const key=JSON.stringify([companyId,warehouseId,publicationFilter,stockAccountId,query,page,refreshKey,noticeProduct,props.noticeTarget?.key]);
    if(loadedListKey.current===key)return;
    const timer = setTimeout(() => { loadedListKey.current=key; void load(); }, query ? productSearchDelay(query) : 0);
    return () => { clearTimeout(timer); };
  }, [load, refreshKey, detailId, creating, busy, query, companyId, warehouseId, publicationFilter, stockAccountId, page, listVisible,noticeProduct,props.noticeTarget?.key]);
  useEffect(()=>{
    const cancel=(event:Event)=>{
      if((event as CustomEvent<{key:string}>).detail?.key!==props.noticeTarget?.key)return;
      controller.current?.abort();generation.current++;noticeOpeningPending.current=false;
      setLoading(false);setDetailId('');setNoticeProduct('');loadedListKey.current='';props.onNoticeDismiss?.();
    };
    window.addEventListener(NOTICE_OPENING_CANCEL,cancel);
    return()=>window.removeEventListener(NOTICE_OPENING_CANCEL,cancel);
  },[props.noticeTarget?.key,props.onNoticeDismiss]);
  useEffect(() => {
    const referenceChanged = (event: Event) => {
      const detail = (event as CustomEvent<{companyId:string;product:LocalProduct}>).detail;
      if (detail?.companyId !== companyId || detail.product?.empresa_id !== companyId) return;
      setProducts(rows => rows.map(row => row.id === detail.product.id ? detail.product : row));
    };
    window.addEventListener(PRODUCT_REFERENCE_CHANGED, referenceChanged);
    return () => window.removeEventListener(PRODUCT_REFERENCE_CHANGED, referenceChanged);
  }, [companyId]);
  useEffect(() => {
    const refresh = (event: Event) => {
      if ((event as CustomEvent<{ companyId?: string }>).detail?.companyId !== companyId) return;
      loadedListKey.current=''; void countProducts();
      if (!detailId && !creating && !busy && !stockLoadOpen && listVisible) void load();
    };
    window.addEventListener(PRODUCT_STOCK_CHANGED, refresh);
    return () => { window.removeEventListener(PRODUCT_STOCK_CHANGED, refresh); };
  }, [companyId, load, countProducts, detailId, creating, busy, stockLoadOpen, listVisible]);
  useImperativeHandle(props.searchRef, () => ({ focusSearch() {
    setExpanded(true);
    requestAnimationFrame(() => {
      searchInput.current?.focus({ preventScroll: true });
      if (panel.current) scrollMarketplaceRow(panel.current);
    });
  } }), []);
  function changeSearch(value: string) {
    if (busy || mutationInFlight.current || creating) return;
    if (noticeProduct) props.onNoticeDismiss?.();
    controller.current?.abort(); generation.current++; setNoticeProduct('');
    setQuery(value); setPage(1); setDetailId(''); setProducts([]); setTotal(0); setError(''); setActionError(''); setLoading(true);
    countCallback.current?.({ total: null, loading: true });
    if (value.trim()) setExpanded(true);
  }
  async function execute(command: Command) {
    if (busy || mutationInFlight.current || !canManage) return;
    mutationInFlight.current = true;
    const previousProduct=command.action==='update'?products.find(row=>row.id===command.productId):undefined;
    const listingFields=previousProduct?changedProductListingFields(previousProduct,command):[];
    setBusy(true); setError(''); setActionError(''); setMessage('');
    if (command.action === 'refresh_price') { setResearchingId(String(command.productId)); setPriceFeedback(null); }
    try {
      if (command.action === 'import') {
        let offset: number | null = 0, count = 0, skippedVariants = 0, photosPending = 0;
        while (offset != null && active.current) {
          const result: { created: number; skippedVariants: number; nextOffset: number | null; photosPending?: number } = await request('produtos', { empresaId: companyId, action: 'import', offset });
          count += result.created; skippedVariants += result.skippedVariants; offset = result.nextOffset;
          photosPending += result.photosPending || 0;
        }
        if (active.current) setMessage(`${count} produtos importados. Fotos disponíveis incluídas somente nos cadastros sem fotos; fotos existentes preservadas. Produtos sem saldo informado exibem zero; nenhuma quantidade foi somada.${skippedVariants ? ` ${skippedVariants} anúncios com variações não foram importados: precisam de cadastro por variação.` : ''}${photosPending ? ` ${photosPending} anúncio(s) ainda sem fotos recuperáveis. Consulte a ficha ou tente importar novamente.` : ''}`);
      } else if (command.action === 'recover_photos') {
        let cursor: string | null = null, recovered = 0, pending = 0;
        do {
          const result = await request('produtos/fotos', { empresaId: companyId, cursor }, AbortSignal.timeout(60_000));
          recovered += result.recovered; pending += result.no_photos + result.unavailable; cursor = result.nextCursor;
          if (active.current) setMessage(`${recovered} produto(s) com fotos recuperadas${cursor ? ' · Recuperando os próximos…' : '.'}`);
        } while (cursor && active.current);
        if (active.current) setMessage(`${recovered} produto(s) com fotos recuperadas. Fotos existentes preservadas; preços e estoque não foram alterados.${pending ? ` ${pending} cadastro(s) continuam sem fotos recuperáveis. Consulte a origem e tente novamente.` : ''}`);
      } else if (command.action === 'refresh_price') {
        const result = await request('produtos/preco', { ...command, empresaId: companyId, requestKey: command.requestKey || crypto.randomUUID() }, AbortSignal.timeout(65_000));
        if (!active.current) return;
        if (!['updated','no_offers'].includes(result.status) || typeof result.message !== 'string') throw new Error('Não foi possível confirmar o resultado da pesquisa. A referência anterior foi preservada.');
        const saved = await request(`produtos?${new URLSearchParams({empresaId:companyId,productId:String(command.productId)})}`, undefined, AbortSignal.timeout(20_000));
        if (!active.current) return;
        if (saved.product?.id !== command.productId || saved.product?.empresa_id !== companyId) throw new Error('Não foi possível conferir a referência salva deste produto.');
        setProducts(rows => rows.map(row => row.id === command.productId ? saved.product : row));
        notifyProductReferenceChanged(companyId, saved.product);
        setPriceFeedback({productId:String(command.productId),message:result.message,updated:result.status==='updated'});
        if(result.status==='updated'&&saved.product.links?.length)setListingUpdate({id:crypto.randomUUID(),productId:String(command.productId),fields:['price_cents']});
        return;
      } else {
        await request(command.action === 'refresh_listing' ? 'produtos/atualizar' : 'produtos', { ...command, empresaId: companyId, requestKey: command.requestKey || crypto.randomUUID() });
        if(active.current&&previousProduct&&listingFields.length)setListingUpdate({id:crypto.randomUUID(),productId:previousProduct.id,fields:listingFields});
        if (active.current) { setMessage(command.action === 'merge' ? 'Anúncios vinculados. Estoque do destino preservado.' : command.action === 'confirm_stock' ? 'Estoque físico confirmado e registrado no histórico.' : command.action === 'refresh_listing' ? 'Ficha consultada. Dados disponíveis incluídos; estoque físico mantido.' : 'Cadastro salvo. Nenhum anúncio foi alterado.'); setCreating(false); }
      }
      if (active.current) { setConfirmation(null); notifyProductStockChanged(companyId); await load(); }
    } catch (failure) { if (active.current) { setConfirmation(null); if (command.action === 'refresh_price') setPriceFeedback({productId:String(command.productId),message:failure instanceof Error ? failure.message : 'Não foi possível concluir a pesquisa de preço.',error:true}); if (command.action === 'recover_photos') setMessage(''); setActionError(command.action === 'refresh_price' && failure instanceof Error && ['TimeoutError','AbortError'].includes(failure.name) ? 'A pesquisa demorou e a resposta não foi confirmada. Atualize a lista para conferir a referência antes de tentar novamente.' : `${failure instanceof Error ? failure.message : 'Não foi possível salvar.'}${command.action === 'recover_photos' ? ' Atualize a lista para conferir as fotos já incluídas antes de repetir.' : ''}`); } }
    finally { mutationInFlight.current = false; if (active.current) { setBusy(false); setResearchingId(''); } }
  }
  const onCommand = (command: Command, prompt?: string) => {
    return prompt ? setConfirmation({ command, message: prompt }) : void execute(command);
  };
  const noticeNavigation = noticeProduct ? <div className={styles.productNoticeNavigation} role="group" aria-label="Navegação do produto"><span role="status">{props.noticeTarget?.origin==='announced'?'Produto selecionado':'Produto da pendência'}</span><BotaoAcaoCompacto disabled={busy || creating} onClick={()=>changeSearch('')}>Voltar à lista</BotaoAcaoCompacto></div> : null;
  function prepareFromProduct(productId:string,connectionId:string){
    if(busy||mutationInFlight.current||!recolherProdutoEmFoco(panel.current?.ownerDocument))return;
    setDetailId('');
    requestAnimationFrame(()=>props.onPrepare(productId,connectionId));
  }
  const registeredActions=canManage&&!warehouseId&&expanded?<div className={styles.registeredProductActions} role="group" aria-label="Ações dos produtos cadastrados">
    <Tooltip texto="Criar um cadastro local sem publicar"><BotaoAcaoCompacto disabled={busy} onClick={()=>setCreating(value=>!value)} aria-expanded={creating}>Novo produto</BotaoAcaoCompacto></Tooltip>
    <Tooltip texto="Importar anúncios já sincronizados, sem somar estoques"><BotaoAcaoCompacto disabled={busy||loading} onClick={()=>onCommand({action:'import'},'Importar os anúncios já sincronizados de todas as contas desta empresa? Produtos novos sem saldo informado exibem zero. Anúncios do mesmo produto poderão ser vinculados por você depois, sem somar quantidades.')}>{busy?'Aguarde…':'Importar anúncios existentes'}</BotaoAcaoCompacto></Tooltip>
    <Tooltip texto="Recuperar fotos dos anúncios vinculados somente nos cadastros vazios."><BotaoAcaoCompacto disabled={busy||loading||creating} onClick={()=>onCommand({action:'recover_photos'})}>Recuperar fotos</BotaoAcaoCompacto></Tooltip>
    <Tooltip texto="Revisar as quantidades atuais dos anúncios ativos para a carga inicial local"><BotaoAcaoCompacto id="load-listing-stock-button" disabled={busy||loading||stockLoadOpen} aria-expanded={stockLoadOpen} aria-controls="initial-stock-load" onClick={()=>setStockLoadConfirmation(true)}>Carregar estoque dos anúncios</BotaoAcaoCompacto></Tooltip>
  </div>:null;
  const publicationAccountId = (props.publicationAccounts ?? props.accounts).find(publicationAccountAvailable)?.id || '';
  const searchControls = <div className={styles.productSearchArea}>
      {!warehouseId && <label htmlFor={searchId}>Pesquisar produtos cadastrados</label>}
      <div className={styles.productSearchRow}>
        <div className={`${styles.form} ${styles.productSearchInput}`}><Icon name="search" size={20} /><CampoBusca id={searchId} inputRef={searchInput} aria-label={warehouseId ? "Buscar produtos neste estoque" : "Buscar produtos locais"} value={query} maxLength={120} autoComplete="off" spellCheck={false} disabled={busy || creating} onChange={changeSearch} placeholder="Nome, descrição, código interno ou EAN" onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); if (event.key === 'Escape') setReaderArmed(false); }} /></div>
        <button type="button" className={styles.productSearchReader} aria-pressed={readerArmed} disabled={busy || creating} onClick={() => { setReaderArmed(value => !value); setExpanded(true); searchInput.current?.focus({ preventScroll: true }); searchInput.current?.select(); }}><Icon name="barcode" size={20} />Ler EAN</button>
      </div>
    </div>;
  return <section ref={panel} data-marketplace-notice-result={noticeResult?.key} data-marketplace-notice-error={noticeResult?.error} data-marketplace-page-card={warehouseId ? undefined : ''} className={`${warehouseId ? styles.embeddedProducts : styles.panel} ${styles.listingsPanel}`} aria-labelledby={warehouseId ? undefined : "products-title"} aria-label={props.warehouse ? `Produtos do estoque ${props.warehouse.name}` : undefined}>
    {noticeNavigation && (props.noticeNavigationHost ? createPortal(noticeNavigation, props.noticeNavigationHost) : noticeNavigation)}
{!warehouseId && <div className={`${styles.panelHeading} ${expanded ? '' : styles.panelHeadingCollapsed}`}><div><h2 id="products-title" tabIndex={-1}>Produtos cadastrados</h2><p className={styles.help} role="status">{countFailed ? 'Quantidade indisponível' : countLoading && confirmedCount.current == null ? 'Consultando quantidade…' : productCountLabel(total, query)}</p></div><div className={styles.panelHeadingActions}>{reorderHandle}<Tooltip texto="Atualizar os cadastros locais"><BotaoAcaoCompacto disabled={loading || busy} onClick={() => { setActionError(''); void countProducts(); if(listVisible)void load(); }}>Atualizar</BotaoAcaoCompacto></Tooltip>{registeredActions}<BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="produtos cadastrados" controlsId="products-content" expandido={expanded} corPrimaria={brand} darkMode={dark} onClick={() => setExpanded(value => !value)} /></div></div>}
    {warehouseId && props.searchNavigationHost ? createPortal(searchControls, props.searchNavigationHost) : searchControls}
    <div id={warehouseId ? `${searchId}-content` : "products-content"} hidden={!expanded && !warehouseId}>
      {stockLoadOpen && canManage && <div id="initial-stock-load" className={styles.localStockLoad}><InitialStockLoad companyId={companyId} dark={dark} brand={brand} onBusyChange={setBusy} onUpdated={load} onClose={() => {
        setStockLoadOpen(false); requestAnimationFrame(() => document.getElementById('load-listing-stock-button')?.focus({ preventScroll: true }));
      }} /></div>}
      {creating && canManage && <ProductFields disabled={busy} onSave={onCommand} onCancel={() => setCreating(false)} />}
      <CarregamentoDadosModulo ativo={loading} variante="local" esqueletos titulo="Produtos" mensagem="Carregando produtos…" corPrimaria={brand} temaEscuro={dark} />
      {!loading && !products.length && !error && <p className={styles.help} role="status">{publicationFilter !== 'all' ? 'Nenhum produto corresponde ao filtro de publicação neste estoque.' : query.trim() ? 'Nenhum produto encontrado para esta pesquisa.' : warehouseId ? 'Nenhum produto com saldo neste estoque.' : 'Nenhum produto cadastrado nesta empresa.'}</p>}
      <div className={styles.localProducts}>{products.map(product => <article key={product.id} ref={row=>{if(row)productRows.current.set(product.id,row);else productRows.current.delete(product.id);}} data-marketplace-detail={`product:${detailPrefix}:${product.id}`} className={`${styles.localProduct} ${detailId === product.id ? styles.localProductOpen : ''} ${noticeProduct===product.id&&props.noticeTarget?.origin==='announced'?styles.localProductLocated:''}`}>
        <ProductPublicationRibbon state={productPublicationState(product.links)} />
        <LocalProductHeader warehouse={props.warehouse} detailPrefix={detailPrefix} product={product} expanded={detailId === product.id} canManage={canManage} busy={busy} researching={researchingId === product.id} dark={dark} brand={brand} percentages={props.percentages === undefined ? DEFAULT_PRICE_PERCENTAGES : props.percentages} preparationDisabled={props.preparationLocked || !publicationAccountId} onPrepareAnnouncement={() => prepareFromProduct(product.id, publicationAccountId)} onToggle={() => {if(busy)return;expansionScrollRequested.current=detailId===product.id?'':product.id;setDetailId(value => value === product.id ? '' : product.id);}} onCommand={onCommand} />
        {researchingId === product.id && <p className={`${styles.help} ${styles.productResearchNotice}`} role="status">Pesquisando preços deste produto… A lista e os filtros serão mantidos.</p>}
        {priceFeedback?.productId === product.id && <p className={priceFeedback.error ? styles.connectionMessage : priceFeedback.updated ? styles.catalogSuccess : styles.catalogNotice} role={priceFeedback.error ? 'alert' : 'status'}>{priceFeedback.message}</p>}
        {detailId === product.id && <DetalhesRolaveis cabecalhoId={`identity-${detailPrefix}-${product.id}`} rotulo={`Detalhes de ${product.name}`}><ProductDetail key={`${product.id}:${product.revision}`} product={product} props={{...props,onPrepare:prepareFromProduct}} busy={busy} onCommand={onCommand} onStockBusy={setBusy} onStockUpdated={()=>void load()} onProductRemoved={mode=>{setDetailId('');setNoticeProduct('');setProducts(rows=>rows.filter(row=>row.id!==product.id));loadedListKey.current='';setMessage(mode==='archived'?'Produto arquivado. Histórico preservado.':'Cadastro excluído definitivamente.');void countProducts();}} /></DetalhesRolaveis>}
      </article>)}</div>
      {!noticeProduct && total > 25 && <div className={styles.localPagination}><button disabled={busy || loading || page === 1} onClick={() => changeProductPage(page - 1)}>Anterior</button><span>Página {page} de {Math.ceil(total / 25)}</span><button disabled={busy || loading || page * 25 >= total} onClick={() => changeProductPage(page + 1)}>Próxima</button></div>}
      <p className={styles.help}>Cadastro único por produto, com saldos separados por estoque. Somente o estoque marcado Online alimenta os anúncios. A distribuição não duplica o produto.</p>
{!warehouseId && <div className={`${styles.panelHeadingActions} ${styles.panelFooterActions}`}><BotaoExpandirCard variante="painel" somenteIcone modo="lista" contexto="produtos cadastrados" controlsId="products-content" expandido={expanded} corPrimaria={brand} darkMode={dark} onClick={() => collapseMarketplacePanel('products-content', () => setExpanded(false))} /></div>}
    </div>
    {message && <p className={styles.catalogSuccess} role="status">{message}</p>}{error && <p className={styles.connectionMessage} role="alert">{error}</p>}{actionError && <p className={styles.connectionMessage} role="alert">{actionError}</p>}
    {canManage&&listingUpdate&&<ProductListingUpdate key={listingUpdate.id} companyId={companyId} change={listingUpdate} accounts={props.accounts} request={request} brand={brand} dark={dark} onClose={()=>setListingUpdate(null)} onBusyChange={setBusy} onUpdated={pending=>{setMessage(pending?'Cadastro salvo. Atualização do anúncio enviada; aguardando confirmação do marketplace.':'Cadastro salvo. Alterações do anúncio confirmadas pelo marketplace.');void load();}}/>}
    {canManage && <ModalConfirmacao aberto={stockLoadConfirmation} titulo="Revisar estoque dos anúncios?"
      mensagem={'Vamos consultar os anúncios ativos e mostrar as quantidades para sua revisão.\n\nSó produtos sem estoque definido poderão receber um saldo. Estoques já definidos, inclusive zero, serão mantidos.\n\nNada será salvo nesta consulta.'}
      textoConfirmar="Revisar anúncios" variante="alerta" carregando={busy} corPrimaria={brand} darkMode={dark}
      aoCancelar={() => { if (!busy) setStockLoadConfirmation(false); }}
      aoConfirmar={() => { if (!busy) { setStockLoadConfirmation(false); setStockLoadOpen(true); } }} />}
    <ModalConfirmacao aberto={!!confirmation} titulo={confirmation?.command.action === 'import' ? 'Importar anúncios?' : confirmation?.command.action === 'merge' ? 'Vincular cadastros?' : 'Confirmar estoque físico?'} mensagem={confirmation?.message || ''} textoConfirmar="Confirmar" variante="primaria" carregando={busy} corPrimaria={brand} darkMode={dark} aoCancelar={() => { if (!busy) setConfirmation(null); }} aoConfirmar={() => { if (confirmation) void execute(confirmation.command); }} />
  </section>;
}
