'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import CampoBusca from '@/app/components/CampoBusca';
import BotaoExpandirCard from '@/app/components/BotaoExpandirCard';
import Tooltip from '@/app/components/Tooltip';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import { formatarMoeda, formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import type { LocalProduct } from '@/app/modules/marketplaces/services/local-product-model';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import MarketplaceSelect from './MarketplaceSelect';
import { collapseMarketplacePanel } from './collapse-panel';
import InitialStockLoad from './InitialStockLoad';
import styles from './marketplaces.module.css';

type Props = { companyId: string; dark: boolean; brand: string; canManage: boolean; accounts: MarketplaceAccount[]; refreshKey: number; preparationLocked: boolean; onPrepare: (productId: string, connectionId: string) => void; reorderHandle?: ReactNode };
type Movement = { id: string; kind: string; stock_before: number | null; stock_after: number; note: string; created_at: string };
type Command = { action: string; [key: string]: unknown };
const stockLabel = (quantity: number | null) => quantity == null ? 'Estoque a confirmar' : `${quantity.toLocaleString('pt-BR')} un. físicas`;
const date = (value: string) => new Date(value).toLocaleString('pt-BR');

function ProductFields({ product, disabled, onSave, onCancel }: { product?: LocalProduct; disabled: boolean; onSave: (command: Command) => void; onCancel: () => void }) {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [ean, setEan] = useState(product?.ean || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price_cents ? formatarMoedaDigitada(String(product.price_cents)) : '');
  const [pictures, setPictures] = useState((product?.pictures || []).join('\n'));
  const [category, setCategory] = useState(product?.category_id || '');
  const [requestKey] = useState(() => crypto.randomUUID());
  const prefix = `local-${product?.id || 'new'}`;
  return <form className={styles.localForm} onSubmit={event => { event.preventDefault(); onSave({ action: product ? 'update' : 'create', requestKey, productId: product?.id, revision: product?.revision, name, sku, ean, description, price: price ? moedaDigitadaParaNumero(price) : null, pictures: pictures.split('\n').map(url => url.trim()).filter(Boolean), categoryId: category }); }}>
    <div className={styles.catalogFields}>
      <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor={`${prefix}-name`}>Nome do produto<input id={`${prefix}-name`} required maxLength={220} value={name} disabled={disabled} onChange={event => setName(event.target.value)} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-sku`}>Código interno (SKU)<input id={`${prefix}-sku`} maxLength={80} value={sku} disabled={disabled || !!product} placeholder="Gerado automaticamente se vazio" onChange={event => setSku(event.target.value)} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-ean`}>EAN / GTIN (opcional)<input id={`${prefix}-ean`} inputMode="numeric" maxLength={14} value={ean} disabled={disabled} onChange={event => setEan(event.target.value.replace(/\D/g, ''))} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-price`}>Preço de referência (opcional)<input id={`${prefix}-price`} inputMode="decimal" value={price} disabled={disabled} onChange={event => setPrice(formatarMoedaDigitada(event.target.value))} /></label>
      <label className={styles.catalogField} htmlFor={`${prefix}-category`}>Categoria do Mercado Livre (opcional)<input id={`${prefix}-category`} maxLength={30} placeholder="Ex.: MLB1234" value={category} disabled={disabled} onChange={event => setCategory(event.target.value.toUpperCase())} /></label>
      <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor={`${prefix}-description`}>Descrição<textarea id={`${prefix}-description`} rows={4} maxLength={50000} value={description} disabled={disabled} onChange={event => setDescription(event.target.value)} /></label>
      <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor={`${prefix}-pictures`}>Fotos — um endereço HTTPS por linha<textarea id={`${prefix}-pictures`} rows={3} value={pictures} disabled={disabled} onChange={event => setPictures(event.target.value)} /></label>
    </div>
    <p className={styles.help}>Salvar aqui não altera os anúncios. O estoque físico é confirmado separadamente.</p>
    <div className={styles.actionBar}><button type="submit" className={styles.primary} disabled={disabled || !name.trim()}>Salvar cadastro</button><button type="button" disabled={disabled} onClick={onCancel}>Cancelar</button></div>
  </form>;
}

function ProductDetail({ product, props, busy, onCommand }: { product: LocalProduct; props: Props; busy: boolean; onCommand: (command: Command, confirmation?: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [targets, setTargets] = useState<LocalProduct[]>([]);
  const [targetId, setTargetId] = useState('');
  const [sameProduct, setSameProduct] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [detailError, setDetailError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const { companyId, canManage, accounts, preparationLocked, onPrepare } = props;
  useEffect(() => {
    const controller = new AbortController();
    void marketplaceClientRequest(`produtos?${new URLSearchParams({ empresaId: companyId, productId: product.id })}`, undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { setMovements(data.movements); setHistoryLoaded(true); }
    }).catch(error => { if (!controller.signal.aborted) setDetailError(error.message); });
    return () => controller.abort();
  }, [companyId, product.id, product.revision]);
  useEffect(() => {
    if (!canManage || product.stock_quantity != null) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void marketplaceClientRequest(`produtos?${new URLSearchParams({ empresaId: companyId, q: targetSearch })}`, undefined, controller.signal).then(data => {
        if (!controller.signal.aborted) { setTargets(data.products.filter((row: LocalProduct) => row.id !== product.id)); setTargetId(''); setSameProduct(false); }
      }).catch(error => { if (!controller.signal.aborted) setDetailError(error.message); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [companyId, canManage, product.id, product.stock_quantity, targetSearch]);
  const target = targets.find(row => row.id === targetId);
  const sourceLink = product.links.find(link => accounts.some(account => account.id === link.connection_id && account.status === 'connected'));
  return <div className={styles.localProductDetail} id={`local-detail-${product.id}`}>
    <dl className={styles.localFacts}><dt>Código interno</dt><dd>{product.sku}</dd><dt>EAN / GTIN</dt><dd>{product.ean || 'Não informado'}</dd><dt>Estoque físico</dt><dd>{stockLabel(product.stock_quantity)}</dd><dt>Preço de referência</dt><dd>{product.price_cents ? formatarMoeda(product.price_cents / 100) : 'Não informado'}</dd><dt>Descrição</dt><dd className={styles.localDescription}>{product.description || 'Ainda não cadastrada'}</dd><dt>Categoria</dt><dd>{product.category_id || 'Ainda não cadastrada'}</dd></dl>
    {product.pictures.length > 0 && <div className={styles.catalogPictures}>{product.pictures.map(url => <img key={url} src={url} alt={product.name} loading="lazy" />)}</div>}
    <details className={styles.localSection}><summary>Dados para publicação e características</summary><dl className={styles.localFacts}><dt>Condição</dt><dd>{({ new: 'Novo', used: 'Usado', refurbished: 'Recondicionado' } as Record<string, string>)[product.publication_form.condition || ''] || 'Não informada'}</dd><dt>Garantia</dt><dd>{({ none: 'Sem garantia', seller: 'Do vendedor', factory: 'De fábrica' } as Record<string, string>)[product.publication_form.warrantyType || ''] || 'Não informada'} {product.publication_form.warrantyTime}</dd><dt>Tipo de anúncio</dt><dd>{({ free: 'Grátis', gold_special: 'Clássico', gold_pro: 'Premium' } as Record<string, string>)[product.publication_form.listingType || ''] || 'Não informado'}</dd><dt>Envio</dt><dd>{({ me2: 'Mercado Envios', not_specified: 'A combinar' } as Record<string, string>)[product.publication_form.shippingMode || ''] || 'Não informado'}</dd>{product.attributes.map(attr => <div key={attr.id}><dt>{attr.name}</dt><dd>{attr.value}</dd></div>)}</dl></details>
    <section className={styles.localSection}><h3>Anúncios vinculados ({product.links.length})</h3>{product.links.length ? <ul>{product.links.map(link => <li key={link.id}><strong>{accounts.find(account => account.id === link.connection_id)?.seller_name || 'Conta conectada'} · {link.provider_listing_id}</strong><span>{link.title} · Quantidade informada no anúncio: {link.reported_stock ?? 'Não informada'}</span></li>)}</ul> : <p className={styles.help}>Nenhum anúncio vinculado. Prepare uma publicação a partir deste cadastro.</p>}</section>
    {canManage && <>
      {product.links.length > 0 && <><button type="button" disabled={busy || !sourceLink} onClick={() => onCommand({ action: 'refresh_listing', productId: product.id, connectionId: sourceLink?.connection_id, listingId: sourceLink?.provider_listing_id })}>Consultar ficha do anúncio</button><p className={styles.help}>Completa fotos, descrição e características que faltam no cadastro. Não altera o anúncio nem confirma estoque.</p></>}
      <button type="button" disabled={busy} aria-expanded={editing} onClick={() => setEditing(value => !value)}>Editar cadastro</button>
      {editing && <ProductFields product={product} disabled={busy} onSave={onCommand} onCancel={() => setEditing(false)} />}
      <section className={styles.localSection}><h3>{product.stock_quantity == null ? 'Confirmar estoque físico' : 'Ajustar estoque físico'}</h3>
        <p className={styles.help}>Conte as unidades reais deste produto. Não some as quantidades das contas.</p>
        <div className={styles.catalogFields}><label className={styles.catalogField} htmlFor={`quantity-${product.id}`}>Quantidade física<input id={`quantity-${product.id}`} inputMode="numeric" value={quantity} maxLength={5} disabled={busy} onChange={event => { setQuantity(event.target.value.replace(/\D/g, '')); setConfirmed(false); }} placeholder="Inclua zero se não houver unidades" /></label><label className={styles.catalogField} htmlFor={`note-${product.id}`}>Observação (opcional)<input id={`note-${product.id}`} value={note} maxLength={500} disabled={busy} onChange={event => setNote(event.target.value)} /></label></div>
        <label className={styles.catalogMatch}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Conferi o estoque físico; não estou somando os anúncios das contas.</label>
        <button type="button" className={styles.primary} disabled={busy || !confirmed || !quantity} onClick={() => onCommand({ action: 'confirm_stock', productId: product.id, revision: product.revision, quantity: Number(quantity), physicalConfirmation: confirmed, note }, `Confirmar ${quantity} unidades físicas de “${product.name}”? O saldo anterior será substituído, com registro no histórico. Nenhum anúncio será alterado.`)}>Confirmar estoque</button>
      </section>
      {product.stock_quantity == null && <details className={styles.localSection}><summary>Este produto já está em outro cadastro?</summary><p className={styles.help}>Vincule os anúncios ao cadastro correto. O estoque dele será mantido, sem somar quantidades.</p><div className={styles.form}><CampoBusca id={`target-search-${product.id}`} aria-label="Buscar cadastro de destino" value={targetSearch} onChange={setTargetSearch} placeholder="Nome, SKU ou EAN" /></div>
        <MarketplaceSelect id={`target-product-${product.id}`} label="Cadastro que será mantido" value={targetId} onChange={value => { setTargetId(value); setSameProduct(false); }} options={targets.map(row => ({ value: row.id, label: row.name, detail: `${row.sku} · ${stockLabel(row.stock_quantity)}` }))} placeholder="Selecione o produto físico correspondente" disabled={busy} />
        <label className={styles.catalogMatch}><input type="checkbox" disabled={busy || !target} checked={sameProduct} onChange={event => setSameProduct(event.target.checked)} />Confirmo que são exatamente o mesmo produto físico.</label>
        <button type="button" disabled={busy || !target || !sameProduct} onClick={() => onCommand({ action: 'merge', productId: product.id, revision: product.revision, targetId: target?.id, targetRevision: target?.revision, sameProduct }, `Vincular os anúncios de “${product.name}” ao cadastro “${target?.name}”? Este cadastro ficará arquivado e o estoque do destino será mantido, sem soma.`)}>Vincular ao cadastro</button>
      </details>}
      <section className={styles.localSection}><h3>Anunciar a partir deste cadastro</h3><MarketplaceAccountPicker label="Conta para publicar" value={targetAccount} onChange={setTargetAccount} options={accounts.filter(account => account.status === 'connected').map(account => ({ id: account.id, name: account.seller_name || account.seller_reference, detail: `ID ${account.seller_reference}` }))} placeholder="Selecione a conta" disabled={busy || preparationLocked} />
        <button type="button" disabled={busy || preparationLocked || !targetAccount || product.stock_quantity == null || product.stock_quantity === 0} onClick={() => onPrepare(product.id, targetAccount)}>Preparar anúncio</button><p className={styles.help}>{product.stock_quantity == null ? 'Confirme o estoque físico primeiro.' : preparationLocked ? 'Conclua ou limpe a preparação aberta antes de iniciar outra.' : 'Abre Novo anúncio para revisar preço, descrição e opções da conta. Não publica automaticamente.'}</p>
      </section>
    </>}
    <details className={styles.localSection}><summary>Histórico de estoque</summary>{historyLoaded && !movements.length && <p className={styles.help}>Nenhuma quantidade física confirmada.</p>}<ul>{movements.map(movement => <li key={movement.id}><strong>{movement.kind === 'confirmation' ? 'Confirmação' : movement.kind === 'sale' ? 'Venda' : 'Ajuste'} · {date(movement.created_at)}</strong><span>{movement.stock_before == null ? 'A confirmar' : movement.stock_before} → {movement.stock_after} un. {movement.note}</span></li>)}</ul></details>
    {detailError && <p className={styles.connectionMessage} role="alert">{detailError}</p>}
  </div>;
}

export default function ProductsStock(props: Props) {
  const { companyId, dark, brand, canManage, refreshKey, reorderHandle } = props;
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [detailId, setDetailId] = useState('');
  const [creating, setCreating] = useState(false);
  const [stockLoadOpen, setStockLoadOpen] = useState(false);
  const [stockLoadConfirmation, setStockLoadConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<{ command: Command; message: string } | null>(null);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; controller.current?.abort(); }; }, []);
  const load = useCallback(async () => {
    controller.current?.abort(); const current = new AbortController(); controller.current = current;
    setLoading(true); setError('');
    try {
      const data = await marketplaceClientRequest(`produtos?${new URLSearchParams({ empresaId: companyId, q: query, page: String(page) })}`, undefined, current.signal);
      if (!current.signal.aborted) { setProducts(data.products); setTotal(data.total); }
    } catch (failure) { if (!current.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar produtos.'); }
    finally { if (!current.signal.aborted) setLoading(false); }
  }, [companyId, query, page]);
  useEffect(() => {
    // Uma venda não pode apagar campos que o usuário está revisando.
    if (detailId || creating || busy) return;
    const timer = setTimeout(() => { void load(); }, 250);
    return () => { clearTimeout(timer); controller.current?.abort(); };
  }, [load, refreshKey, detailId, creating, busy]);
  async function execute(command: Command) {
    if (busy || !canManage) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (command.action === 'import') {
        let offset: number | null = 0, count = 0, skippedVariants = 0;
        while (offset != null && active.current) {
          const result: { created: number; skippedVariants: number; nextOffset: number | null } = await marketplaceClientRequest('produtos', { empresaId: companyId, action: 'import', offset });
          count += result.created; skippedVariants += result.skippedVariants; offset = result.nextOffset;
        }
        if (active.current) setMessage(`${count} produtos importados. Estoque físico a confirmar; nenhuma quantidade foi somada.${skippedVariants ? ` ${skippedVariants} anúncios com variações não foram importados: precisam de cadastro por variação.` : ''}`);
      } else {
        await marketplaceClientRequest(command.action === 'refresh_listing' ? 'produtos/atualizar' : 'produtos', { ...command, empresaId: companyId, requestKey: command.requestKey || crypto.randomUUID() });
        if (active.current) { setMessage(command.action === 'merge' ? 'Anúncios vinculados. Estoque do destino preservado.' : command.action === 'confirm_stock' ? 'Estoque físico confirmado e registrado no histórico.' : command.action === 'refresh_listing' ? 'Ficha consultada. Dados disponíveis incluídos; estoque físico mantido.' : 'Cadastro salvo. Nenhum anúncio foi alterado.'); setCreating(false); }
      }
      if (active.current) { setConfirmation(null); await load(); }
    } catch (failure) { if (active.current) { setConfirmation(null); setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.'); } }
    finally { if (active.current) setBusy(false); }
  }
  const onCommand = (command: Command, prompt?: string) => prompt ? setConfirmation({ command, message: prompt }) : void execute(command);
  return <section className={`${styles.panel} ${styles.listingsPanel}`} aria-labelledby="products-title">
    <div className={`${styles.panelHeading} ${expanded ? '' : styles.panelHeadingCollapsed}`}><div><h2 id="products-title">Produtos e estoque</h2><p className={styles.help}>{total} {query ? 'produtos encontrados' : 'cadastros locais da empresa'}</p></div><div className={styles.panelHeadingActions}>{reorderHandle}<Tooltip texto="Atualizar os cadastros locais"><button type="button" className={styles.refreshSales} disabled={loading || busy} onClick={() => void load()}>Atualizar</button></Tooltip><BotaoExpandirCard variante="painel" modo="lista" contexto="produtos e estoque" controlsId="products-content" expandido={expanded} corPrimaria={brand} darkMode={dark} onClick={() => setExpanded(value => !value)} /></div></div>
    <div id="products-content" hidden={!expanded}>
      <p className={styles.help}>Um estoque físico por produto, compartilhado pelos anúncios vinculados. Após a ativação, novas vendas baixam o saldo e ajustes de estoque são enviados aos anúncios compatíveis. Confira as pendências de sincronização acima.</p>
      <div className={styles.localToolbar}><div className={styles.form}><CampoBusca id="local-product-search" aria-label="Buscar produtos locais" value={query} onChange={value => { setQuery(value); setPage(1); setDetailId(''); }} placeholder="Nome, código interno ou EAN" /></div>{canManage && <><Tooltip texto="Criar um cadastro local sem publicar"><button type="button" disabled={busy} onClick={() => setCreating(value => !value)} aria-expanded={creating}>Novo produto</button></Tooltip><Tooltip texto="Importar anúncios já sincronizados, sem somar estoques"><button type="button" disabled={busy || loading} onClick={() => onCommand({ action: 'import' }, 'Importar os anúncios já sincronizados de todas as contas desta empresa? Os produtos novos ficarão com estoque a confirmar. Anúncios do mesmo produto poderão ser vinculados por você depois, sem somar quantidades.')}>{busy ? 'Aguarde…' : 'Importar anúncios existentes'}</button></Tooltip></>}</div>
      {canManage && <div className={styles.actionBar}><Tooltip texto="Revisar as quantidades atuais dos anúncios ativos para a carga inicial local"><button id="load-listing-stock-button" className={styles.initialStockTrigger} type="button" disabled={busy || loading || stockLoadOpen} aria-expanded={stockLoadOpen} aria-controls="initial-stock-load" onClick={() => setStockLoadConfirmation(true)}>Carregar estoque dos anúncios</button></Tooltip></div>}
      {stockLoadOpen && canManage && <div id="initial-stock-load" className={styles.localStockLoad}><InitialStockLoad companyId={companyId} dark={dark} brand={brand} onBusyChange={setBusy} onUpdated={load} onClose={() => {
        setStockLoadOpen(false); requestAnimationFrame(() => document.getElementById('load-listing-stock-button')?.focus({ preventScroll: true }));
      }} /></div>}
      {creating && canManage && <ProductFields disabled={busy} onSave={onCommand} onCancel={() => setCreating(false)} />}
      {loading && <p className={styles.help} role="status">Carregando produtos…</p>}
      {!loading && !products.length && !error && <p className={styles.help}>Nenhum produto encontrado. Cadastre um produto ou importe os anúncios existentes.</p>}
      <div className={styles.localProducts}>{products.map(product => <article key={product.id} className={`${styles.localProduct} ${detailId === product.id ? styles.localProductOpen : ''}`}>
        <div className={styles.localProductHeading}><div><strong>{product.name}</strong><small>{product.sku} · {product.links.length} anúncios vinculados</small><span className={product.stock_quantity == null ? styles.localStockPending : styles.localStock}>{stockLabel(product.stock_quantity)}</span></div><BotaoExpandirCard variante="painel" modo="lista" contexto={`produto ${product.name}`} controlsId={`local-detail-${product.id}`} expandido={detailId === product.id} corPrimaria={brand} darkMode={dark} desabilitado={busy} onClick={() => setDetailId(value => value === product.id ? '' : product.id)} /></div>
        {detailId === product.id && <ProductDetail key={`${product.id}:${product.revision}`} product={product} props={props} busy={busy} onCommand={onCommand} />}
      </article>)}</div>
      {total > 25 && <div className={styles.localPagination}><button disabled={busy || loading || page === 1} onClick={() => { setPage(page - 1); setDetailId(''); }}>Anterior</button><span>Página {page} de {Math.ceil(total / 25)}</span><button disabled={busy || loading || page * 25 >= total} onClick={() => { setPage(page + 1); setDetailId(''); }}>Próxima</button></div>}
      <div className={`${styles.panelHeadingActions} ${styles.panelFooterActions}`}><BotaoExpandirCard variante="painel" modo="lista" contexto="produtos e estoque" controlsId="products-content" expandido={expanded} corPrimaria={brand} darkMode={dark} onClick={() => collapseMarketplacePanel('products-content', () => setExpanded(false))} /></div>
    </div>
    {message && <p className={styles.catalogSuccess} role="status">{message}</p>}{error && <p className={styles.connectionMessage} role="alert">{error}</p>}
    {canManage && <ModalConfirmacao aberto={stockLoadConfirmation} titulo="Revisar estoque dos anúncios?"
      mensagem={'Vamos consultar os anúncios ativos e mostrar as quantidades para sua revisão.\n\nSó produtos sem estoque definido poderão receber um saldo. Estoques já definidos, inclusive zero, serão mantidos.\n\nNada será salvo nesta consulta.'}
      textoConfirmar="Revisar anúncios" variante="alerta" carregando={busy} corPrimaria={brand} darkMode={dark}
      aoCancelar={() => { if (!busy) setStockLoadConfirmation(false); }}
      aoConfirmar={() => { if (!busy) { setStockLoadConfirmation(false); setStockLoadOpen(true); } }} />}
    <ModalConfirmacao aberto={!!confirmation} titulo={confirmation?.command.action === 'import' ? 'Importar anúncios?' : confirmation?.command.action === 'merge' ? 'Vincular cadastros?' : 'Confirmar estoque físico?'} mensagem={confirmation?.message || ''} textoConfirmar="Confirmar" variante="primaria" carregando={busy} corPrimaria={brand} darkMode={dark} aoCancelar={() => { if (!busy) setConfirmation(null); }} aoConfirmar={() => { if (confirmation) void execute(confirmation.command); }} />
  </section>;
}
