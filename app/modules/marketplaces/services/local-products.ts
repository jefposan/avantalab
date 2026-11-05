import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { objectValue, uuidIsValid, type ListingSnapshot } from './listing-model';
import { localProductData, physicalQuantity, type LocalProduct } from './local-product-model';
import { safeHttpsImage, safeText } from './catalog-publication';
import { findProductSearchIds, type ProductSearchRow } from '../local-product-search';
import { readImportedProductPictures } from './imported-product-photos';
import { productAllocations, listWarehouses } from './warehouses';
import { readProductInternalNotes } from './product-internal-notes';
import { publicationFilterValue, PUBLICATION_PROVIDERS, PUBLICATION_STATUS_QUERY, PUBLICATION_STATES, publicationStatusesQuery } from '../local-product-publications';
import {productListingUrl} from '../product-listing-update';
import { readPersistedReference } from './price-persistence';

const columns = 'id,empresa_id,sku,name,ean,description,pictures,category_id,catalog_product_id,attributes,publication_form,price_cents,stock_quantity,stock_confirmed_at,listing_stock_review_at,revision,created_at,updated_at';

function editableAttributes(raw: unknown, ean: string | null) {
  if (!Array.isArray(raw) || raw.length > 100) throw new MarketplaceError(400, 'invalid_attributes', 'Use até 100 características válidas.');
  const ids = new Set<string>();
  return raw.map(item => {
    const attribute = objectValue(item);
    const id = safeText(attribute.id, 80).toUpperCase();
    const name = safeText(attribute.name, 120);
    const value = safeText(attribute.value, 1000);
    if (!/^[A-Z0-9_]{1,80}$/.test(id) || !name || !value || ids.has(id)) throw new MarketplaceError(400, 'invalid_attributes', 'Confira identificador, nome e valor de cada característica.');
    ids.add(id);
    if (/^(GTIN|EAN|GTIN14|PRODUCT_GTIN)$/.test(id) && (!ean || value.replace(/\D/g, '') !== ean)) {
      throw new MarketplaceError(400, 'identity_attribute', 'O EAN informado nas características deve ser exatamente o EAN do cadastro.');
    }
    return { id, name, value };
  });
}

async function saveLocalProductEditor(db: SupabaseClient, empresaId: string, actor: string, raw: Record<string, unknown>) {
  const values = localProductData(raw);
  if (!values.name || values.invalidEan) throw new MarketplaceError(400, 'invalid_product', values.invalidEan ? 'Confira o EAN informado ou deixe em branco.' : 'Informe o nome do produto.');
  if (raw.price != null && values.price_cents == null) throw new MarketplaceError(400, 'invalid_product', 'Confira o preço informado ou deixe em branco.');
  if (safeText(raw.categoryId, 30) && !values.category_id) throw new MarketplaceError(400, 'invalid_product', 'Confira o código da categoria do Mercado Livre.');
  if (!Array.isArray(raw.pictures) || raw.pictures.length > 12 || raw.pictures.some(value => !safeHttpsImage(value))) throw new MarketplaceError(400, 'invalid_product', 'Informe até 12 fotos com endereços HTTPS válidos.');
  if (!uuidIsValid(raw.productId) || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1 || !uuidIsValid(raw.requestKey)) throw new MarketplaceError(400, 'invalid_product', 'Atualize o produto antes de salvar.');
  const attributes = editableAttributes(raw.attributes, values.ean);
  const result = await db.rpc('marketplace_product_editor_save', {
    p_empresa_id: empresaId,
    p_actor_id: actor,
    p_product_id: raw.productId,
    p_revision: raw.revision,
    p_data: { name: values.name, sku: values.sku, ean: values.ean || '', description: values.description, pictures: values.pictures, category_id: values.category_id, price_cents: values.price_cents, attributes },
    p_request_key: raw.requestKey,
  });
  if (result.error) {
    if (result.error.code === '23505' && result.error.message.includes('marketplace_products_active_ean')) throw new MarketplaceError(409, 'duplicate_ean', 'Este EAN já existe na base da empresa. Abra o produto existente; nenhum novo cadastro foi criado.');
    throw new MarketplaceError(result.error.code === 'P0001' ? 409 : 503, result.error.code === 'P0001' ? 'product_conflict' : 'products_database', result.error.code === 'P0001' ? result.error.message : 'Não foi possível salvar o cadastro. Recarregue para conferir.');
  }
  const saved = result.data as { product_id: string; created: boolean };
  if (values.price_cents != null) await readPersistedReference(db, empresaId, saved.product_id, values.price_cents);
  return saved;
}

export async function productCommand(db: SupabaseClient, empresaId: string, actor: string, action: string, data: unknown, requestKey: unknown) {
  if (!uuidIsValid(requestKey)) throw new MarketplaceError(400, 'invalid_request', 'Atualize o formulário e tente novamente.');
  // Publicar em outra conta não é cadastrar outro produto nem confirmar outro saldo.
  if (action === 'draft') {
    const ean = safeText(objectValue(data).ean, 30);
    if (/^\d{8,14}$/.test(ean)) {
      const key = ean.replace(/^0+/, '');
      const variants = Array.from({ length: 15 - key.length }, (_, index) => key.padStart(key.length + index, '0'));
      const existing = await db.from('marketplace_products').select('id').eq('empresa_id', empresaId).is('archived_at', null).in('ean', variants);
      if (existing.error) throw new MarketplaceError(503, 'products_database', 'Não foi possível conferir o EAN existente. Nenhum anúncio foi publicado.');
      if ((existing.data?.length || 0) > 1) throw new MarketplaceError(409, 'duplicate_ean', 'Este EAN tem cadastros duplicados. Abra o cadastro correto em Estoques para preparar o anúncio sem criar outro produto.');
      if (existing.data?.length === 1) return { product_id: existing.data[0].id as string, created: false };
    }
  }
  if (action === 'update') {
    const payload = objectValue(data);
    if (uuidIsValid(payload.product_id) && payload.price_cents == null) {
      const saved = await readPersistedReference(db, empresaId, String(payload.product_id));
      data = { ...payload, price_cents: saved.price_cents };
    }
  }
  const result = await db.rpc('marketplace_product_command', { p_empresa_id: empresaId, p_actor_id: actor, p_action: action, p_data: data, p_request_key: requestKey });
  if (result.error) {
    if (result.error.code === '23505' && result.error.message.includes('marketplace_products_active_ean')) throw new MarketplaceError(409, 'duplicate_ean', 'Este EAN já existe na base da empresa. Abra o produto existente; nenhum novo cadastro foi criado.');
    if (result.error.code === 'P0001') throw new MarketplaceError(409, 'product_conflict', result.error.message);
    throw new MarketplaceError(503, 'products_database', 'Não foi possível salvar o cadastro. Confira se o banco está atualizado.');
  }
  const saved = result.data as { product_id: string; created: boolean };
  const price = objectValue(data).price_cents;
  if (['create', 'update'].includes(action) && typeof price === 'number' && price > 0) await readPersistedReference(db, empresaId, saved.product_id, price);
  if(/stock|transfer|withdraw|link/.test(action)){try{const {dispatchStockAfterCommit}=await import('./inventory-dispatch');dispatchStockAfterCommit(db,empresaId);}catch{console.error('marketplace_stock_delivery_pending');}}
  return saved;
}

export async function getLocalProduct(db: SupabaseClient, empresaId: string, id: unknown): Promise<LocalProduct> {
  if (!uuidIsValid(id)) throw new MarketplaceError(400, 'invalid_product', 'Produto inválido.');
  const { data, error } = await db.from('marketplace_products').select(columns).eq('empresa_id', empresaId).eq('id', id).is('archived_at', null).maybeSingle();
  if (error) throw new MarketplaceError(503, 'products_database', 'Não foi possível consultar o cadastro.');
  if (!data) throw new MarketplaceError(404, 'product_missing', 'Produto não encontrado nesta empresa.');
  return { ...data, links: [] } as LocalProduct;
}

/** Abertura exata pela pendência conserva a mesma gestão de anúncios/saldos da lista. */
export async function getLocalProductPresentation(db:SupabaseClient,empresaId:string,id:unknown){
 const product=await getLocalProduct(db,empresaId,id);
 const links=await db.from('marketplace_product_links').select('id,connection_id,provider,provider_listing_id,title,reported_stock,status,source_snapshot,updated_at').eq('empresa_id',empresaId).eq('product_id',product.id);
 if(links.error)throw new MarketplaceError(503,'products_database','Não foi possível consultar os anúncios vinculados.');
 // O importador conserva apenas metadados no vínculo. URL vem da projeção local do anúncio.
 const linkedRows=links.data||[];
 if(linkedRows.length)try{
  const cached=await db.from('marketplace_listings').select('connection_id,provider_listing_id,provider,url:snapshot->>permalink').eq('empresa_id',empresaId).in('connection_id',[...new Set(linkedRows.map(l=>l.connection_id))]).in('provider_listing_id',linkedRows.map(l=>l.provider_listing_id));
  if(!cached.error)for(const link of linkedRows){
   const listing=cached.data?.find(l=>l.connection_id===link.connection_id&&l.provider_listing_id===link.provider_listing_id&&l.provider===link.provider);
   const url=listing?productListingUrl({provider:link.provider,source_snapshot:{permalink:listing.url}}):null;
   if(url)link.source_snapshot={...objectValue(link.source_snapshot),permalink:url};
  }
 }catch{/* Link pode ser consultado explicitamente; falha opcional não esconde o produto. */}
 let distribution:Awaited<ReturnType<typeof productAllocations>>|null=null;
 try{distribution=await productAllocations(db,empresaId,[product.id]);}catch{/* Não inventar distribuição quando indisponível. */}
 const allocations=distribution?.get(product.id);
 return {...product,links:linkedRows,...(allocations?{allocations,total_stock_quantity:allocations.some(b=>b.quantity==null)?null:allocations.reduce((sum,b)=>sum+(b.quantity||0),0)}:{})};
}

export async function listLocalProducts(db: SupabaseClient, empresaId: string, search: string, page: number, signal?: AbortSignal, warehouseId?: string | null, publication?: string | null, countOnly = false, skipCount = false, connectionId?: string | null) {
  const publicationFilter = publicationFilterValue(publication);
  if (!publicationFilter) throw new MarketplaceError(400, 'invalid_publication_filter', 'Selecione um filtro de publicação válido.');
  const term = search.trim();
  if (term.length > 120) throw new MarketplaceError(400, 'invalid_search', 'Use até 120 caracteres na pesquisa.');
  const searchSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000);
  const accountId=connectionId || null;
  if(accountId){
    if(!uuidIsValid(accountId))throw new MarketplaceError(400,'invalid_account','Selecione uma conta válida.');
    const account=await db.from('marketplace_connections').select('id').eq('empresa_id',empresaId).eq('id',accountId).range(0,0).abortSignal(searchSignal);
    if(account.error)throw new MarketplaceError(503,'products_database','Não foi possível conferir a conta.');
    if(!account.data?.length)throw new MarketplaceError(403,'invalid_account','A conta não pertence a este perfil.');
  }
  if (warehouseId != null) {
    if (!uuidIsValid(warehouseId)) throw new MarketplaceError(400, 'warehouse_missing', 'Selecione um estoque válido.');
    if (!(await listWarehouses(db, empresaId)).some(w => w.id === warehouseId)) throw new MarketplaceError(404, 'warehouse_missing', 'Estoque não encontrado neste perfil.');
  }
  const warehouseJoin = warehouseId != null ? ',warehouse_balance:marketplace_warehouse_balances!inner(warehouse_id,quantity)' : '';
  const stateKeys=Object.keys(PUBLICATION_STATES) as Array<keyof typeof PUBLICATION_STATES>;
  const higherStates=stateKeys.slice(0,stateKeys.indexOf(publicationFilter as keyof typeof PUBLICATION_STATES)).flatMap(key=>[...PUBLICATION_STATES[key].statuses]);
  const excludeHigher=['paused','review','disabled'].includes(publicationFilter);
  const publicationJoin = publicationFilter === 'all' && !accountId ? '' : ',publication_link:marketplace_product_links()'+(excludeHigher?',higher_link:marketplace_product_links()':'');
  const scopePublication = <T extends {
    eq: (key: string, value: string) => T;
    in: (key: string, values: string[]) => T;
    neq: (key: string, value: string) => T;
    or: (value: string, options: { referencedTable: string }) => T;
    not: (key: string, operator: string, value: null) => T;
    is: (key: string, value: null) => T;
  }>(query: T): T => {
    if (publicationFilter === 'all' && !accountId) return query;
    let scoped = query.eq('publication_link.empresa_id', empresaId).in('publication_link.provider', PUBLICATION_PROVIDERS).neq('publication_link.provider_listing_id', '');
    if(accountId)scoped=scoped.eq('publication_link.connection_id',accountId);
    if(publicationFilter==='all')return scoped.not('publication_link','is',null);
    const statuses=publicationFilter==='unadvertised'?Object.values(PUBLICATION_STATES).flatMap(state=>[...state.statuses]):PUBLICATION_STATES[publicationFilter as keyof typeof PUBLICATION_STATES].statuses;
    scoped=scoped.or(publicationFilter==='advertised'?PUBLICATION_STATUS_QUERY:publicationStatusesQuery(statuses), { referencedTable: 'publication_link' });
    if(excludeHigher){
      scoped=scoped.eq('higher_link.empresa_id',empresaId).in('higher_link.provider',PUBLICATION_PROVIDERS).neq('higher_link.provider_listing_id','');
      if(accountId)scoped=scoped.eq('higher_link.connection_id',accountId);
      scoped=scoped.or(publicationStatusesQuery(higherStates),{referencedTable:'higher_link'}).is('higher_link',null);
    }
    return publicationFilter !== 'unadvertised' ? scoped.not('publication_link', 'is', null) : scoped.is('publication_link', null);
  };
  const scopeWarehouse = <T extends { eq: (key: string, value: string) => T; gt: (key: string, value: number) => T }>(query: T): T => warehouseId != null
    ? query.eq('warehouse_balance.empresa_id', empresaId).eq('warehouse_balance.warehouse_id', warehouseId).gt('warehouse_balance.quantity', 0) : query;
  let orderedIds: string[] | null = null;
  if (term) {
    try {
      orderedIds = await findProductSearchIds(async offset => {
        const result = await scopePublication(scopeWarehouse(db.from('marketplace_products').select('id,name,sku,ean,description' + warehouseJoin + publicationJoin)
          .eq('empresa_id', empresaId).is('archived_at', null)
          .order('created_at', { ascending: false }).order('id'))).range(offset, offset + 199).abortSignal(searchSignal);
        if (result.error) throw result.error;
        return (result.data || []) as unknown as ProductSearchRow[];
      }, term, searchSignal);
    } catch {
      throw new MarketplaceError(503, 'products_search', 'Não foi possível concluir a pesquisa. Tente novamente ou refine o termo.');
    }
    const ids = orderedIds.slice((page - 1) * 25, page * 25);
    if (!ids.length) return { products: [], total: orderedIds.length, page };
  }
  // Contagem independente: não carrega fotos, anúncios, notas ou distribuição.
  if (countOnly) {
    if (orderedIds) return { products: [], total: orderedIds.length, page };
    const {count,error} = await scopePublication(scopeWarehouse(db.from('marketplace_products').select('id' + warehouseJoin + publicationJoin, {count:'exact',head:true}).eq('empresa_id',empresaId).is('archived_at',null))).abortSignal(searchSignal);
    if(error || count == null) throw new MarketplaceError(503,'products_count','Não foi possível conferir o total de produtos.');
    return {products:[],total:count,page};
  }
  let query = scopePublication(scopeWarehouse(db.from('marketplace_products').select(columns + warehouseJoin + publicationJoin, skipCount ? {} : { count: 'exact' }).eq('empresa_id', empresaId).is('archived_at', null)));
  if (orderedIds) query = query.in('id', orderedIds.slice((page - 1) * 25, page * 25));
  else query = query.order('created_at', { ascending: false }).order('id').range((page - 1) * 25, page * 25 - 1);
  const { data, error, count } = await query.abortSignal(searchSignal);
  if (error) throw new MarketplaceError(503, 'products_database', 'Não foi possível carregar produtos e estoque.');
  const rawRows = (data || []) as unknown as Array<Omit<LocalProduct, 'links'>>;
  const rows = orderedIds ? [...rawRows].sort((a, b) => orderedIds!.indexOf(a.id) - orderedIds!.indexOf(b.id)) : rawRows;
  const ids = rows.map(row => row.id);
  const links = ids.length ? await db.from('marketplace_product_links').select('id,product_id,connection_id,provider,provider_listing_id,title,reported_stock,status,source_snapshot,updated_at').eq('empresa_id', empresaId).in('product_id', ids).abortSignal(searchSignal) : { data: [], error: null };
  if (links.error) throw new MarketplaceError(503, 'products_database', 'Não foi possível consultar os anúncios vinculados.');
  let allocations: Awaited<ReturnType<typeof productAllocations>> | null=null;
  try { allocations=await productAllocations(db,empresaId,ids); } catch { /* Não presumir distribuição vazia em falha ou migração pendente. */ }
  const internalNotes = await readProductInternalNotes(db, empresaId, ids);
  return { products: rows.map(row => {
    const distribution=allocations?.get(row.id);
    return { ...row, internal_notes: internalNotes.get(row.id)?.internalNotes || '', internal_notes_revision: internalNotes.get(row.id)?.internalNotesRevision || 0, ...(distribution?{allocations:distribution,total_stock_quantity:distribution.some(b=>b.quantity==null)?null:distribution.reduce((sum,b)=>sum+(b.quantity||0),0)}:{}),links: (links.data || []).filter(link => link.product_id === row.id) };
  }), total: orderedIds?.length ?? count ?? (skipCount ? null : 0), page };
}

export async function importLocalListing(db: SupabaseClient, empresaId: string, actor: string, connectionId: unknown, listingId: unknown) {
  const { data, error } = await db.from('marketplace_listings').select('connection_id,provider,provider_listing_id,snapshot,status').eq('empresa_id', empresaId).eq('connection_id', connectionId).eq('provider_listing_id', listingId).maybeSingle();
  if (error || !data) throw new MarketplaceError(404, 'listing_missing', 'Sincronize este anúncio antes de importar.');
  const snapshot = data.snapshot as ListingSnapshot;
  if (snapshot.variations?.length) throw new MarketplaceError(409, 'variants_pending', 'Este anúncio tem variações. O cadastro por variação ainda precisa ser estruturado; nenhuma quantidade foi confirmada.');
  let pictures: string[] = [];
  try { pictures = await readImportedProductPictures(db, empresaId, data, snapshot.ean); }
  catch { /* A importação continua, mas informa fotos pendentes; nunca apaga as manuais. */ }
  const registered = await db.rpc('marketplace_listing_catalog_import', { p_empresa: empresaId, p_connection: connectionId, p_listing: listingId });
  if(registered.error)throw new MarketplaceError(503,'products_database','Não foi possível cadastrar ou vincular o anúncio. Confira a migração do catálogo.');
  const result=registered.data as {product_id:string;created:boolean;issue?:string;archived?:boolean;removed?:boolean};
  if(result.removed)throw new MarketplaceError(409,'product_removed','O cadastro deste anúncio foi excluído. A sincronização não recriou o produto.');
  if(result.archived)throw new MarketplaceError(409,'product_archived','O cadastro deste anúncio foi arquivado. A sincronização não recriou o produto.');
  if(result.issue || !uuidIsValid(result.product_id))throw new MarketplaceError(409,result.issue || 'import_identity_ambiguous','Confira a identidade do produto antes de vincular; nenhum cadastro duplicado foi criado.');
  if (!result.created && pictures.length) await fillMissingProductPictures(db, empresaId, actor, result.product_id, pictures);
  const current = await getLocalProduct(db, empresaId, result.product_id);
  return { ...result, photosPending: !current.pictures.length };
}

async function fillMissingProductPictures(db: SupabaseClient, companyId: string, actor: string, productId: string, pictures: string[]) {
  const product = await getLocalProduct(db, companyId, productId);
  if (product.pictures.length || !pictures.length) return false;
  // O RPC trava a linha, verifica revisão e preenche APENAS a lista vazia.
  await productCommand(db, companyId, actor, 'enrich', { product_id: product.id, revision: product.revision, pictures }, crypto.randomUUID());
  return true;
}

export async function recoverLocalProductPictures(db: SupabaseClient, companyId: string, actor: string, productId: string) {
  const product = await getLocalProduct(db, companyId, productId);
  if (product.pictures.length) return { status: 'preserved' as const };
  const { data: links, error } = await db.from('marketplace_product_links').select('connection_id,provider,provider_listing_id').eq('empresa_id', companyId).eq('product_id', product.id).order('created_at');
  if (error) throw new MarketplaceError(503, 'photos_database', 'Não foi possível consultar a origem das fotos.');
  let failed = false;
  for (const link of links || []) {
    try {
      const pictures = await readImportedProductPictures(db, companyId, link, product.ean);
      if (pictures.length) return { status: await fillMissingProductPictures(db, companyId, actor, product.id, pictures) ? 'recovered' as const : 'preserved' as const };
    } catch { failed = true; }
  }
  return { status: failed ? 'unavailable' as const : 'no_photos' as const };
}

export async function manageLocalProduct(db: SupabaseClient, empresaId: string, actor: string, raw: unknown) {
  const input = objectValue(raw), action = input.action;
  if (action === 'editor_update') return saveLocalProductEditor(db, empresaId, actor, input);
  if(action==='choose_import_product'){
    if(!uuidIsValid(input.productId)||!uuidIsValid(input.connectionId)||!uuidIsValid(input.requestKey)||typeof input.listingId!=='string'||!input.listingId||input.listingId.length>200)throw new MarketplaceError(400,'invalid_product','Selecione o cadastro local para conferir o estoque.');
    const result=await db.rpc('marketplace_import_choose_local',{p_empresa:empresaId,p_actor:actor,p_connection:input.connectionId,p_listing:input.listingId,p_product:input.productId,p_key:input.requestKey});
    if(result.error)throw new MarketplaceError(result.error.code==='P0001'?409:503,'import_stock_review',result.error.code==='P0001'?result.error.message:'Não foi possível confirmar o cadastro local. Atualize os avisos antes de repetir.');
    return result.data;
  }
  if (action === 'import') {
    const offset = typeof input.offset === 'number' && Number.isSafeInteger(input.offset) && input.offset >= 0 ? input.offset : 0;
    const { data, error } = await db.from('marketplace_listings').select('connection_id,provider_listing_id,snapshot').eq('empresa_id', empresaId).order('id').range(offset, offset + 4);
    if (error) throw new MarketplaceError(503, 'products_database', 'Não foi possível consultar os anúncios salvos.');
    let created = 0, skippedVariants = 0, photosPending = 0;
    for (const listing of data || []) {
      if ((listing.snapshot as ListingSnapshot).variations?.length) { skippedVariants++; continue; }
      const result = await importLocalListing(db, empresaId, actor, listing.connection_id, listing.provider_listing_id);
      if (result.created) created++;
      if (result.photosPending) photosPending++;
    }
    return { created, skippedVariants, photosPending, nextOffset: (data || []).length === 5 ? offset + 5 : null };
  }
  if (!['create', 'update', 'confirm_stock', 'merge'].includes(String(action))) throw new MarketplaceError(400, 'invalid_action', 'Operação inválida.');
  let data: Record<string, unknown>;
  if (action === 'create' || action === 'update') {
    const values = localProductData(input);
    if (!values.name || values.invalidEan) throw new MarketplaceError(400, 'invalid_product', values.invalidEan ? 'Confira o EAN informado ou deixe em branco.' : 'Informe o nome do produto.');
    if (input.price != null && values.price_cents == null) throw new MarketplaceError(400, 'invalid_product', 'Confira o preço informado ou deixe em branco.');
    if (safeText(input.categoryId, 30) && !values.category_id) throw new MarketplaceError(400, 'invalid_product', 'Confira o código da categoria do Mercado Livre.');
    if (!Array.isArray(input.pictures) || input.pictures.length > 12 || input.pictures.some(value => !safeHttpsImage(value))) throw new MarketplaceError(400, 'invalid_product', 'Informe até 12 fotos com endereços HTTPS válidos.');
    data = { name: values.name, sku: values.sku, ean: values.ean, description: values.description, pictures: values.pictures, price_cents: values.price_cents, category_id: values.category_id, catalog_product_id: values.catalog_product_id, attributes: values.attributes };
    if (action === 'create' && input.stockQuantity != null) {
      const quantity = physicalQuantity(input.stockQuantity);
      if (quantity == null || input.physicalConfirmation !== true) throw new MarketplaceError(400, 'confirm_stock', 'Confira e confirme a quantidade física.');
      data.stock_quantity = quantity; data.physical_confirmation = true;
    }
  } else data = {};
  if (action !== 'create') {
    if (!uuidIsValid(input.productId) || !Number.isSafeInteger(input.revision) || Number(input.revision) < 1) throw new MarketplaceError(400, 'invalid_product', 'Atualize o produto antes de salvar.');
    data.product_id = input.productId; data.revision = input.revision;
  }
  if (action === 'confirm_stock') {
    const quantity = physicalQuantity(input.quantity);
    if (quantity == null || input.physicalConfirmation !== true) throw new MarketplaceError(400, 'confirm_stock', 'Confira e confirme a quantidade física de 0 a 99.999.');
    data.quantity = quantity; data.physical_confirmation = true; data.note = typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '';
  }
  if (action === 'merge') {
    if (!uuidIsValid(input.targetId) || !Number.isSafeInteger(input.targetRevision) || input.sameProduct !== true) throw new MarketplaceError(400, 'confirm_product', 'Confirme que os anúncios são do mesmo produto físico.');
    data.target_id = input.targetId; data.target_revision = input.targetRevision;
  }
  return productCommand(db, empresaId, actor, String(action), data, input.requestKey);
}
