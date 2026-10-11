import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { loadConnection, mlRequest, recordPublishedListing, type SellerConnection } from './mercadolivre-management';
import { catalogAttributes, catalogCandidate, catalogPictures, catalogGtins, publicationErrors, safeHttpsImage, safeText, validEan, type CatalogPreparation, type PublicationForm } from './catalog-publication';
import { normalizarTexto } from '@/app/lib/formatters';
import { identifyMercadoLivreCatalog } from './mercadolivre-catalog';
import { lookupProfileCatalogByEan } from './profile-catalog';
import { listingIdIsValid, objectValue, uuidIsValid } from './listing-model';

const listingTypeIds = new Set(['free', 'gold_special', 'gold_pro']);
const shippingNames: Record<string, string> = { me2: 'Mercado Envios', not_specified: 'A combinar com o comprador' };
const conditionNames: Record<string, string> = { new: 'Novo', used: 'Usado', refurbished: 'Recondicionado' };
const conditionValueIds: Record<string, string> = { new: '2230284', used: '2230581', refurbished: '2230582' };
const safeArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function preparationIssue(error: unknown, code: string, denied: string, unavailable: string) {
  return { code, message: error instanceof MarketplaceError && error.code === 'provider_403' ? denied : unavailable };
}

type PreparationInput = { ean?: unknown; query?: unknown; productId?: unknown; categoryId?: unknown };
type CopySeed = { product: NonNullable<CatalogPreparation['product']>; categoryId: string; source: NonNullable<PublicationForm['copySource']> };

export async function prepareMercadoLivreCatalog(db: SupabaseClient, connection: SellerConnection, input: PreparationInput): Promise<CatalogPreparation> {
  return prepareCatalog(db, connection, input);
}

// Semente disponível somente depois de reler e validar o anúncio de origem no servidor.
async function prepareCatalog(db: SupabaseClient, connection: SellerConnection, input: PreparationInput, seed?: CopySeed): Promise<CatalogPreparation> {
  const query = normalizarTexto(safeText(input.query, 120));
  if (query && !seed) {
    const identification = await identifyMercadoLivreCatalog(db, connection, { query, productId: input.productId });
    if (identification.status === 'not_found') return { status: 'not_found', ean: '', query, notice: identification.notice };
    // Mesmo um resultado único deve ser escolhido antes de preencher o anúncio.
    if (!safeText(input.productId, 30) || !identification.product) return { status: 'found', ean: '', query, candidates: identification.candidates, notice: 'Selecione o produto que você quer anunciar.' };
    const { raw, ...product } = identification.product;
    const gtins = catalogGtins(raw.attributes);
    const suppliedEan = input.ean != null && String(input.ean).trim() ? validEan(input.ean) : null;
    if (input.ean != null && String(input.ean).trim() && (!suppliedEan || !gtins.includes(suppliedEan))) throw new MarketplaceError(400, 'gtin_mismatch', 'Este código não está na ficha selecionada. Confira o produto e o EAN.');
    const selectedEan = suppliedEan || (gtins.length === 1 ? gtins[0] : '');
    if (!selectedEan) return { status: 'found', ean: '', query, product, gtins, candidates: identification.candidates,
      notice: gtins.length ? 'Selecione o EAN que aparece na embalagem do seu produto.' : 'Esta ficha não informa um EAN válido. Digite ou leia o código da embalagem no campo acima.',
      blockingIssues: [{ code: 'gtin_required', message: 'Confirme o EAN antes de preparar a publicação.' }] };
    const preparation = await prepareMercadoLivreCatalog(db, connection, { ean: selectedEan, productId: product.id, categoryId: input.categoryId });
    if (preparation.product?.id !== product.id) throw new MarketplaceError(409, 'catalog_changed', 'Não foi possível confirmar o código desta ficha. Confira o EAN na embalagem e pesquise novamente.');
    return { ...preparation, query };
  }
  const ean = validEan(input.ean) || '';
  if (!ean && !seed) throw new MarketplaceError(400, 'invalid_ean', 'Informe um EAN/GTIN válido com dígito verificador.');
  const identification = seed ? { status: 'found' as const, candidates: [], product: seed.product, notice: 'Dados do anúncio original. Revise antes de publicar nesta conta.' } : await identifyMercadoLivreCatalog(db, connection, { ean, productId: input.productId });
  const candidates = identification.candidates;
  let sourceNotice = identification.notice;
  let externalCategories: Array<{ id: string; name: string; domainId: string; attributes: Array<{ id: string; name: string; value: string }> }> = [];
  let fullProduct: CatalogPreparation['product'] = identification.product;
  if (identification.status === 'not_found') {
    const profile = await lookupProfileCatalogByEan(db, connection.empresa_id, ean, input.productId);
    if (profile.status === 'choose') return { status: 'found', ean, candidates: profile.candidates, notice: profile.notice };
    if (profile.status !== 'found' || !profile.product) return { status: 'not_found', ean, notice: profile.notice };
    fullProduct = profile.product;
    sourceNotice = profile.notice;
    const predicted = await mlRequest(db, connection, `/sites/MLB/domain_discovery/search?${new URLSearchParams({ q: profile.product.name, limit: '3', target: 'core' })}`);
    externalCategories = safeArray(predicted).map(objectValue).flatMap((row) => {
      const id = safeText(row.category_id, 30), name = safeText(row.category_name, 120), domainId = safeText(row.domain_id, 100);
      if (!/^MLB\d+$/.test(id) || !name || !domainId.startsWith('MLB-')) return [];
      const attributes = safeArray(row.attributes).map(objectValue).flatMap((attribute) => {
        const attributeId = safeText(attribute.id, 80), value = safeText(attribute.value_name, 300), valueId = safeText(attribute.value_id, 80);
        return attributeId && value ? [{ id: attributeId, name: safeText(attribute.name, 120) || attributeId, value, ...(valueId ? { valueId } : {}) }] : [];
      });
      return [{ id, name, domainId, attributes }];
    });
    if (!externalCategories.length) return { status: 'found', ean, product: fullProduct, blockingIssues: [{ code: 'category_prediction_empty', message: 'Produto localizado no cadastro do perfil, mas o Mercado Livre não sugeriu uma categoria. Revise o nome do produto ou cadastre-o diretamente no Mercado Livre.' }], notice: sourceNotice };
  }
  if (identification.status === 'choose') return { status: 'found', ean, candidates, notice: identification.notice };
  if (!fullProduct) return { status: 'not_found', ean, notice: identification.notice };
  let product = fullProduct;

  const categoryCandidates = new Map<string, { id: string; name: string; domainId: string; attributes: Array<{ id: string; name: string; value: string }> }>();
  if (product.source === 'marketplace_listing' && seed) {
    categoryCandidates.set(seed.categoryId, { id: seed.categoryId, name: seed.categoryId, domainId: product.domainId, attributes: [] });
  } else if (product.source === 'profile_catalog') {
    for (const category of externalCategories) categoryCandidates.set(category.id, category);
  } else {
    const domainCategories = await mlRequest(db, connection, `/catalog_domains/${encodeURIComponent(product.domainId)}/categories`);
    if (!Array.isArray(domainCategories)) throw new MarketplaceError(503, 'catalog_unavailable', 'O catálogo não retornou as categorias do produto. Tente novamente.');
    for (const raw of domainCategories) {
      const row = objectValue(raw), id = safeText(row.id, 30);
      if (/^MLB\d+$/.test(id)) categoryCandidates.set(id, { id, name: safeText(row.name, 120) || id, domainId: product.domainId, attributes: [] });
    }
  }
  const categories = [...categoryCandidates.values()].map(({ id, name }) => ({ id, name }));
  const requestedCategory = safeText(input.categoryId, 30);
  const categoryId = requestedCategory && categoryCandidates.has(requestedCategory) ? requestedCategory : categories.length === 1 ? categories[0].id : '';
  if (!categoryId) return { status: 'found', ean, product, candidates, categories, notice: categories.length ? `${sourceNotice ? `${sourceNotice} ` : ''}Selecione a categoria correta para consultar as condições de venda.` : 'Não foi possível confirmar a categoria do produto. Não publique sem revisar a ficha no Mercado Livre.' };
  const selectedCategory = categoryCandidates.get(categoryId)!;
  if (product.source === 'profile_catalog') product = { ...product, domainId: selectedCategory.domainId };

  const [categoryResult, availableResult, sellerShippingResult, categoryAttributesResult] = await Promise.allSettled([
    mlRequest(db, connection, `/categories/${categoryId}`).then(objectValue),
    mlRequest(db, connection, `/users/${connection.seller_reference}/available_listing_types?category_id=${categoryId}`).then(objectValue),
    mlRequest(db, connection, `/users/${connection.seller_reference}/shipping_preferences`).then(objectValue),
    mlRequest(db, connection, `/categories/${categoryId}/attributes`),
  ]);
  const blockingIssues = [] as Array<{ code: string; message: string }>;
  const warnings: string[] = [];
  const category = categoryResult.status === 'fulfilled' ? categoryResult.value : null;
  const available = availableResult.status === 'fulfilled' ? availableResult.value : null;
  const sellerShipping = sellerShippingResult.status === 'fulfilled' ? sellerShippingResult.value : null;
  const categoryAttributes = categoryAttributesResult.status === 'fulfilled' && Array.isArray(categoryAttributesResult.value) ? categoryAttributesResult.value : [];
  if (!category) blockingIssues.push(preparationIssue(categoryResult.status === 'rejected' ? categoryResult.reason : null, 'category_unavailable', 'O aplicativo não tem permissão para confirmar esta categoria.', 'Não foi possível confirmar a categoria agora. Tente novamente.'));
  if (!available) blockingIssues.push(preparationIssue(availableResult.status === 'rejected' ? availableResult.reason : null, 'listing_types_unavailable', 'O aplicativo não tem permissão para consultar os tipos de anúncio desta conta.', 'Não foi possível consultar os tipos de anúncio agora. Tente novamente.'));
  if (categoryAttributesResult.status === 'rejected') blockingIssues.push(preparationIssue(categoryAttributesResult.reason, 'attributes_unavailable', 'O aplicativo não tem permissão para consultar os campos obrigatórios desta categoria.', 'Não foi possível consultar os campos obrigatórios agora. Tente novamente.'));
  if (!sellerShipping) warnings.push(sellerShippingResult.status === 'rejected' && sellerShippingResult.reason instanceof MarketplaceError && sellerShippingResult.reason.code === 'provider_403'
    ? 'O Mercado Livre não liberou a consulta prévia dos envios desta conta. A opção escolhida será confirmada na validação antes de publicar.'
    : 'Não foi possível consultar os envios da conta agora. A opção escolhida será confirmada na validação antes de publicar.');

  const settings = objectValue(category?.settings);
  if (category && !['profile_catalog', 'marketplace_listing'].includes(product.source || '') && safeText(settings.catalog_domain, 100) !== product.domainId) throw new MarketplaceError(409, 'category_mismatch', 'A categoria selecionada não corresponde ao domínio do produto. Confira a ficha no Mercado Livre.');
  if (category && (settings.listing_allowed === false || safeText(settings.status, 30) === 'disabled')) blockingIssues.push({ code: 'category_not_allowed', message: 'O Mercado Livre não permite criar anúncios nesta categoria.' });
  const listingTypes = safeArray(available?.available).map(objectValue).flatMap((row) => {
    const id = safeText(row.id, 40);
    return listingTypeIds.has(id) && (row.remaining_listings == null || Number(row.remaining_listings) > 0) ? [{ id, name: safeText(row.name, 100) || id }] : [];
  });
  const categoryModes = new Set(safeArray(settings.shipping_modes).filter((value): value is string => typeof value === 'string'));
  const accountModes = sellerShipping ? new Set(safeArray(sellerShipping.modes).filter((value): value is string => typeof value === 'string')) : new Set<string>();
  // Algumas categorias de catálogo não expõem shipping_modes e a consulta logística da conta
  // pode ser protegida por permissão funcional. Nesse caso exibimos somente os modos canônicos
  // que este fluxo sabe publicar e deixamos /items/validate confirmar a escolha antes do POST /items.
  const fallbackModes = !sellerShipping && !categoryModes.size ? new Set(Object.keys(shippingNames)) : new Set<string>();
  const shippingModes = Object.entries(shippingNames).filter(([id]) => {
    const accountAllows = accountModes.size ? accountModes.has(id) : fallbackModes.has(id) || categoryModes.has(id);
    const categoryAllows = categoryModes.size ? categoryModes.has(id) : true;
    return accountAllows && categoryAllows;
  }).map(([id, name]) => ({ id, name }));
  const configuredConditions = new Set(safeArray(settings.item_conditions).filter((value): value is string => typeof value === 'string'));
  const itemCondition = categoryAttributes.map(objectValue).find((row) => row.id === 'ITEM_CONDITION');
  const attributeConditions = new Set(safeArray(itemCondition?.values).map((value) => safeText(objectValue(value).id, 30)));
  const conditions = Object.entries(conditionNames).filter(([id]) => configuredConditions.has(id) || attributeConditions.has(conditionValueIds[id])).map(([id, name]) => ({ id, name }));
  const knownAttributeIds = new Set(safeArray(categoryAttributes).map((row) => safeText(objectValue(row).id, 80)).filter(Boolean));
  const presetAttributes = [...product.attributes, ...selectedCategory.attributes]
    .filter((attribute, index, all) => !['GTIN', 'ITEM_CONDITION'].includes(attribute.id) && knownAttributeIds.has(attribute.id) && all.findIndex((candidate) => candidate.id === attribute.id) === index);
  const present = new Set(presetAttributes.map((attribute) => attribute.id));
  const requiredAttributes = safeArray(categoryAttributes).map(objectValue).filter((row) => {
    const tags = objectValue(row.tags), id = safeText(row.id, 80);
    return id && !present.has(id) && !['GTIN', 'ITEM_CONDITION'].includes(id)
      && (tags.required === true || tags.new_required === true || (product.source === 'profile_catalog' && tags.catalog_required === true)
        || (seed && !ean && product.source === 'marketplace_listing' && id === 'EMPTY_GTIN_REASON' && objectValue(categoryAttributes.map(objectValue).find((attr) => attr.id === 'GTIN')?.tags).conditional_required === true));
  }).slice(0, 30).map((row) => ({
    id: safeText(row.id, 80), name: safeText(row.name, 120) || safeText(row.id, 80),
    values: safeArray(row.values).slice(0, 50).map(objectValue).flatMap((value) => {
      const id = safeText(value.id, 80), name = safeText(value.name, 120);
      return id && name ? [{ id, name }] : [];
    }),
  }));
  const gtinTags = objectValue(categoryAttributes.map(objectValue).find((attr) => attr.id === 'GTIN')?.tags);
  if (seed && !ean && product.source === 'marketplace_listing' && (gtinTags.required === true || gtinTags.new_required === true)) blockingIssues.push({ code: 'provider_gtin_required', message: 'O Mercado Livre exige EAN nesta categoria para uma nova publicação. Informe o código real do produto para continuar.' });
  if (available && !listingTypes.length) blockingIssues.push({ code: 'listing_types_empty', message: 'Esta conta não possui um tipo de anúncio disponível para a categoria.' });
  if (!shippingModes.length) blockingIssues.push({ code: 'shipping_modes_empty', message: 'Nenhuma forma de envio compatível foi encontrada para esta conta e categoria.' });
  if (category && !conditions.length) blockingIssues.push({ code: 'conditions_empty', message: 'A categoria não retornou uma condição de produto compatível.' });
  if (product.source === 'profile_catalog' && !product.pictures.length) blockingIssues.push({ code: 'picture_required', message: 'O produto cadastrado no perfil não possui uma imagem HTTPS utilizável. Adicione uma imagem ao cadastro antes de publicar.' });
  const minimumPrice = Number(settings.minimum_price), maximumPrice = Number(settings.maximum_price), descriptionLimit = Number(settings.max_description_length);
  return { status: 'found', ean, ...(seed ? { copySource: seed.source } : {}), product, candidates, categories, categoryId, listingTypes, shippingModes, conditions, requiredAttributes, presetAttributes,
    constraints: { ...(Number.isFinite(minimumPrice) && minimumPrice > 0 ? { minimumPrice } : {}), ...(Number.isFinite(maximumPrice) && maximumPrice > 0 ? { maximumPrice } : {}), maxDescriptionLength: Number.isSafeInteger(descriptionLimit) && descriptionLimit > 0 ? descriptionLimit : 50000 },
    ...(blockingIssues.length ? { blockingIssues } : {}), ...(warnings.length ? { warnings } : {}),
    notice: blockingIssues.length ? 'Revise as pendências abaixo antes de publicar.' : sourceNotice };
}

function copiedWarranty(saleTerms: unknown[]) {
  const terms = saleTerms.map(objectValue);
  const type = safeText(terms.find((term) => term.id === 'WARRANTY_TYPE')?.value_name, 120).toLocaleLowerCase('pt-BR');
  const time = safeText(terms.find((term) => term.id === 'WARRANTY_TIME')?.value_name, 40);
  return {
    warrantyType: /fábrica|fabrica/.test(type) ? 'factory' : /vendedor/.test(type) ? 'seller' : 'none',
    ...(time ? { warrantyTime: time } : {}),
  } as Pick<PublicationForm, 'warrantyType' | 'warrantyTime'>;
}

function copiedAttributes(attributes: unknown[]) {
  const values: Record<string, string> = {};
  for (const raw of attributes.slice(0, 80)) {
    const attribute = objectValue(raw);
    const id = safeText(attribute.id, 80);
    const valueId = safeText(attribute.value_id, 300);
    const value = valueId || safeText(attribute.value_name, 300);
    if (/^[A-Z0-9_]{1,80}$/.test(id) && value) values[id] = value;
  }
  return values;
}

/**
 * Reabre um anúncio atual como rascunho em outra conta da mesma empresa.
 * A cópia nunca publica: o destino recebe uma preparação própria e o cliente
 * ainda precisa revisar, confirmar a ficha e acionar Publicar explicitamente.
 */
export async function prepareMercadoLivreListingCopy(db: SupabaseClient, source: SellerConnection, target: SellerConnection, listingId: unknown, options?: { categoryId?: unknown }) {
  if (source.empresa_id !== target.empresa_id) throw new MarketplaceError(403, 'cross_company_copy', 'A conta de destino precisa pertencer à mesma empresa.');
  if (!listingIdIsValid(listingId)) throw new MarketplaceError(400, 'invalid_item', 'Identificador de anúncio inválido.');
  if (source.id === target.id) throw new MarketplaceError(400, 'same_account_copy', 'Selecione outra conta para preparar esta publicação.');

  const item = objectValue(await mlRequest(db, source, `/items/${listingId}`));
  if (!listingIdIsValid(item.id) || item.id !== listingId || String(item.seller_id) !== source.seller_reference) {
    throw new MarketplaceError(404, 'listing_not_found', 'O anúncio não pertence à conta de origem selecionada.');
  }
  const attributes = safeArray(item.attributes).map(objectValue);
  const ean = validEan(attributes.find((attribute) => attribute.id === 'GTIN')?.value_name) || '';

  const description = await mlRequest(db, source, `/items/${listingId}/description`).then(objectValue).catch((error: unknown) => {
    // Ausência confirmada de descrição é diferente de consulta negada ou indisponível.
    if (error instanceof MarketplaceError && error.code === 'provider_404') return {} as Record<string, unknown>;
    throw error;
  });
  const pictures = safeArray(item.pictures).map(objectValue);
  const pictureUrl = pictures.map((picture) => safeHttpsImage(picture.secure_url || picture.url)).find(Boolean) || '';
  const shipping = objectValue(item.shipping);
  const catalogProductId = safeText(item.catalog_product_id, 90);
  const sourceForm: PublicationForm = {
    ean,
    productId: /^MLB\d+$/.test(catalogProductId) ? catalogProductId : '',
    categoryId: safeText(item.category_id, 30),
    price: typeof item.price === 'number' ? item.price : 0,
    stock: typeof item.available_quantity === 'number' ? item.available_quantity : -1,
    listingType: safeText(item.listing_type_id, 40),
    shippingMode: safeText(shipping.mode, 40),
    condition: safeText(item.condition, 20),
    ...copiedWarranty(safeArray(item.sale_terms)),
    description: safeText(description.plain_text, 50000),
    ...(pictureUrl ? { pictureUrl } : {}),
    attributes: copiedAttributes(attributes),
    copySource: { connectionId: source.id, listingId },
  };

  let seed: CopySeed | undefined;
  if (!ean) {
    if (!/^MLB\d+$/.test(sourceForm.categoryId)) throw new MarketplaceError(409, 'copy_category_unavailable', 'Não foi possível confirmar a categoria do anúncio original.');
    let product: NonNullable<CatalogPreparation['product']>;
    if (sourceForm.productId) {
      const detail = objectValue(await mlRequest(db, target, `/products/${sourceForm.productId}`));
      const candidate = catalogCandidate(detail);
      if (!candidate || candidate.id !== sourceForm.productId) throw new MarketplaceError(409, 'catalog_changed', 'A ficha original não está disponível no catálogo. Confira o anúncio no Mercado Livre.');
      product = { ...candidate, source: 'mercadolivre_catalog', attributes: catalogAttributes(detail.attributes), pictures: catalogPictures(detail.pictures), description: sourceForm.description || '' };
    } else {
      const urls = pictures.map((picture) => safeHttpsImage(picture.secure_url || picture.url)).filter((url): url is string => !!url);
      product = { id: listingId, name: safeText(item.title, 220), domainId: safeText(item.domain_id, 100), picture: urls[0] || null, source: 'marketplace_listing', pictures: urls, description: sourceForm.description || '', attributes: attributes.flatMap(attribute => {
        const id = safeText(attribute.id, 80), value = safeText(attribute.value_name, 300), valueId = safeText(attribute.value_id, 80);
        return id && value ? [{ id, name: safeText(attribute.name, 120) || id, value, ...(valueId ? { valueId } : {}) }] : [];
      }) };
      if (!product.name || !urls.length) throw new MarketplaceError(409, 'copy_product_unavailable', 'O anúncio original precisa ter título e imagens válidos para preparar a cópia.');
      sourceForm.productId = product.id;
    }
    seed = { product, categoryId: sourceForm.categoryId, source: sourceForm.copySource! };
  }

  let result: CatalogPreparation;
  try {
    result = await prepareCatalog(db, target, { ...sourceForm, categoryId: options?.categoryId ?? sourceForm.categoryId }, seed);
  } catch (error) {
    // A categoria que a origem aceitou pode não pertencer ao domínio vigente no destino.
    // Nesse caso, preservamos a ficha e deixamos a pessoa escolher a categoria novamente.
    if (!(error instanceof MarketplaceError) || error.code !== 'category_mismatch') throw error;
    result = await prepareCatalog(db, target, { ean, productId: sourceForm.productId }, seed);
  }
  result = { ...result, copySource: sourceForm.copySource };
  return { result, form: sourceForm, sourceTitle: safeText(item.title, 220) || listingId };
}

function publicationBody(form: PublicationForm, prepared: CatalogPreparation) {
  const product = prepared.product!;
  const attrs: Array<Record<string, string>> = [...(prepared.ean ? [{ id: 'GTIN', value_name: prepared.ean }] : []), { id: 'ITEM_CONDITION', value_id: conditionValueIds[form.condition], value_name: conditionNames[form.condition] }];
  for (const attribute of prepared.presetAttributes || []) attrs.push(attribute.valueId
    ? { id: attribute.id, value_id: attribute.valueId, value_name: attribute.value }
    : { id: attribute.id, value_name: attribute.value });
  for (const field of prepared.requiredAttributes || []) {
    const value = form.attributes?.[field.id]?.trim() || '';
    const option = field.values.find((choice) => choice.id === value);
    attrs.push(option ? { id: field.id, value_id: option.id } : { id: field.id, value_name: value });
  }
  const warranty = form.warrantyType === 'none' ? 'Sem garantia' : form.warrantyType === 'seller' ? 'Garantia do vendedor' : 'Garantia de fábrica';
  return {
    site_id: 'MLB', ...(['profile_catalog', 'marketplace_listing'].includes(product.source || '') ? {} : { catalog_product_id: product.id, catalog_listing: true }), category_id: form.categoryId,
    title: product.name,
    price: form.price, currency_id: 'BRL', available_quantity: form.stock, buying_mode: 'buy_it_now',
    listing_type_id: form.listingType, ...(form.condition === 'new' || form.condition === 'used' ? { condition: form.condition } : {}),
    shipping: { mode: form.shippingMode, local_pick_up: false, free_shipping: false },
    sale_terms: [{ id: 'WARRANTY_TYPE', value_name: warranty }, ...(form.warrantyType !== 'none' ? [{ id: 'WARRANTY_TIME', value_name: form.warrantyTime!.trim() }] : [])],
    attributes: attrs, pictures: form.pictureUrl ? [{ source: form.pictureUrl }] : [],
  };
}

function parsePublicationForm(raw: unknown): PublicationForm {
  const value = objectValue(raw), suppliedAttributes = objectValue(value.attributes);
  const attributes: Record<string, string> = {};
  for (const [id, choice] of Object.entries(suppliedAttributes).slice(0, 50)) {
    if (/^[A-Z0-9_]{1,80}$/.test(id) && typeof choice === 'string') attributes[id] = choice.trim().slice(0, 301);
  }
  return {
    ean: safeText(value.ean, 14), productId: safeText(value.productId, 90), categoryId: safeText(value.categoryId, 30),
    price: typeof value.price === 'number' ? value.price : NaN,
    stock: typeof value.stock === 'number' ? value.stock : NaN,
    listingType: safeText(value.listingType, 40), shippingMode: safeText(value.shippingMode, 40), condition: safeText(value.condition, 20),
    warrantyType: safeText(value.warrantyType, 20), warrantyTime: safeText(value.warrantyTime, 41),
    description: typeof value.description === 'string' ? value.description.slice(0, 50001) : '',
    pictureUrl: safeText(value.pictureUrl, 2048), attributes,
    ...(value.copySource != null ? { copySource: { connectionId: safeText(objectValue(value.copySource).connectionId, 36), listingId: safeText(objectValue(value.copySource).listingId, 30) } } : {}),
  };
}

/** Revalida a origem no servidor; um identificador vindo do navegador não dispensa autorização. */
export async function prepareMercadoLivrePublication(db: SupabaseClient, connection: SellerConnection, raw: unknown) {
  const form = objectValue(raw);
  if (form.copySource != null) {
    const sourceRef = objectValue(form.copySource);
    if (!uuidIsValid(sourceRef.connectionId) || !listingIdIsValid(sourceRef.listingId)) throw new MarketplaceError(400, 'invalid_copy_source', 'A origem da cópia é inválida. Prepare o anúncio novamente.');
    const source = await loadConnection(db, connection.empresa_id, sourceRef.connectionId);
    return (await prepareMercadoLivreListingCopy(db, source, connection, sourceRef.listingId, { categoryId: form.categoryId })).result;
  }
  return prepareMercadoLivreCatalog(db, connection, form);
}

export async function publishMercadoLivreCatalog(db: SupabaseClient, connection: SellerConnection, actor: string, requestKey: unknown, raw: unknown) {
  if (!uuidIsValid(requestKey)) throw new MarketplaceError(400, 'invalid_request', 'Tentativa de publicação inválida. Recarregue o formulário.');
  const form = parsePublicationForm(raw);
  const prepared = await prepareMercadoLivrePublication(db, connection, form);
  if (prepared.status !== 'found' || !prepared.product || !prepared.categoryId) throw new MarketplaceError(409, 'catalog_changed', 'O produto ou a categoria não estão mais disponíveis. Consulte o EAN novamente.');
  if (prepared.blockingIssues?.length) throw new MarketplaceError(409, 'preparation_blocked', 'O Mercado Livre não confirmou todos os dados necessários. Pesquise novamente e revise as pendências exibidas.');
  const errors = publicationErrors(form, prepared);
  if (Object.keys(errors).length) throw new MarketplaceError(400, 'invalid_fields', 'Revise os campos indicados.', errors);
  const body = publicationBody(form, prepared);
  // A validação do provedor é sem publicação e identifica requisitos condicionais da categoria.
  await mlRequest(db, connection, '/items/validate', 'POST', body);
  const { data: draft, error: insertError } = await db.from('marketplace_publications').insert({
    empresa_id: connection.empresa_id, connection_id: connection.id, provider: 'mercado_livre', ean: prepared.ean,
    price_cents: Math.round(form.price * 100), status: 'publishing', idempotency_key: requestKey, created_by: actor,
    response_summary: { product_id: prepared.product.id, category_id: form.categoryId },
  }).select('id').single();
  if (insertError || !draft) throw new MarketplaceError(insertError?.code === '23505' ? 409 : 503, insertError?.code === '23505' ? 'duplicate_publish' : 'publication_audit_unavailable',
    insertError?.code === '23505' ? 'Esta publicação já foi solicitada. Confira “Anunciados” antes de tentar novamente.' : 'Não foi possível registrar a publicação. Nada foi enviado ao Mercado Livre.');

  let itemId = '';
  try {
    const created = objectValue(await mlRequest(db, connection, '/items', 'POST', body));
    if (!listingIdIsValid(created.id) || String(created.seller_id) !== connection.seller_reference) throw new MarketplaceError(409, 'publication_uncertain', 'O Mercado Livre não confirmou a identificação do novo anúncio. Confira a conta antes de tentar novamente.');
    itemId = created.id;
    await db.from('marketplace_publications').update({ provider_listing_id: itemId }).eq('id', draft.id).eq('empresa_id', connection.empresa_id);
    if (form.description?.trim()) await mlRequest(db, connection, `/items/${itemId}/description`, 'POST', { plain_text: form.description.trim() });
    const listing = await recordPublishedListing(db, connection, itemId);
    const { error: completedError } = await db.from('marketplace_publications').update({ status: 'published', provider_listing_id: itemId, published_by: actor, published_at: new Date().toISOString(), response_summary: { product_id: prepared.product.id, category_id: form.categoryId, item_id: itemId } })
      .eq('id', draft.id).eq('empresa_id', connection.empresa_id);
    if (completedError) throw new Error('Publication persistence failed');
    return { status: 'published' as const, listing };
  } catch (failure) {
    await db.from('marketplace_publications').update({ status: 'failed', ...(itemId ? { provider_listing_id: itemId } : {}), response_summary: { product_id: prepared.product.id, category_id: form.categoryId, ...(itemId ? { item_id: itemId } : {}), error_code: failure instanceof MarketplaceError ? failure.code : 'integration' } })
      .eq('id', draft.id).eq('empresa_id', connection.empresa_id);
    if (itemId) throw new MarketplaceError(409, 'publication_partial', `O anúncio ${itemId} foi criado, mas a descrição ou a sincronização não foi confirmada. Confira-o no Mercado Livre; não clique em Publicar novamente.`);
    if (failure instanceof MarketplaceError && failure.code === 'mutation_uncertain') throw new MarketplaceError(409, 'publication_uncertain', 'A resposta da publicação não chegou. Ela pode ter sido criada. Confira “Anunciados” e o Mercado Livre antes de tentar novamente.');
    throw failure;
  }
}
