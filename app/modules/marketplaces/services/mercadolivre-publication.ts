import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { mlRequest, recordPublishedListing, type SellerConnection } from './mercadolivre-management';
import { publicationErrors, safeText, validEan, type CatalogPreparation, type PublicationForm } from './catalog-publication';
import { identifyMercadoLivreCatalog } from './mercadolivre-catalog';
import { listingIdIsValid, objectValue, uuidIsValid } from './listing-model';

const listingTypeIds = new Set(['free', 'gold_special', 'gold_pro']);
const shippingNames: Record<string, string> = { me2: 'Mercado Envios', not_specified: 'A combinar com o comprador' };
const conditionNames: Record<string, string> = { new: 'Novo', used: 'Usado', refurbished: 'Recondicionado' };
const conditionValueIds: Record<string, string> = { new: '2230284', used: '2230581', refurbished: '2230582' };
const safeArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function preparationIssue(error: unknown, code: string, denied: string, unavailable: string) {
  return { code, message: error instanceof MarketplaceError && error.code === 'provider_403' ? denied : unavailable };
}

export async function prepareMercadoLivreCatalog(db: SupabaseClient, connection: SellerConnection, input: { ean: unknown; productId?: unknown; categoryId?: unknown }): Promise<CatalogPreparation> {
  const ean = validEan(input.ean);
  if (!ean) throw new MarketplaceError(400, 'invalid_ean', 'Informe um EAN/GTIN válido com dígito verificador.');
  const identification = await identifyMercadoLivreCatalog(db, connection, { ean, productId: input.productId });
  const candidates = identification.candidates;
  if (identification.status === 'not_found') return { status: 'not_found', ean, notice: identification.notice };
  if (identification.status === 'choose' || !identification.product) return { status: 'found', ean, candidates, notice: identification.notice };
  const fullProduct = identification.product;
  const product = fullProduct;
  const attributes = fullProduct.attributes;

  const categoryCandidates = new Map<string, { id: string; name: string }>();
  const domainCategories = await mlRequest(db, connection, `/catalog_domains/${encodeURIComponent(product.domainId)}/categories`);
  if (!Array.isArray(domainCategories)) throw new MarketplaceError(503, 'catalog_unavailable', 'O catálogo não retornou as categorias do produto. Tente novamente.');
  for (const raw of domainCategories) {
    const row = objectValue(raw), id = safeText(row.id, 30);
    if (/^MLB\d+$/.test(id)) categoryCandidates.set(id, { id, name: safeText(row.name, 120) || id });
  }
  const categories = [...categoryCandidates.values()];
  const requestedCategory = safeText(input.categoryId, 30);
  const categoryId = requestedCategory && categoryCandidates.has(requestedCategory) ? requestedCategory : categories.length === 1 ? categories[0].id : '';
  if (!categoryId) return { status: 'found', ean, product: fullProduct, candidates, categories, notice: categories.length ? 'Selecione a categoria correta para consultar as condições de venda.' : 'Não foi possível confirmar a categoria do produto. Não publique sem revisar a ficha no Mercado Livre.' };

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
  if (category && safeText(settings.catalog_domain, 100) !== product.domainId) throw new MarketplaceError(409, 'category_mismatch', 'A categoria selecionada não corresponde ao domínio do produto. Confira a ficha no Mercado Livre.');
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
  const present = new Set(attributes.map((attribute) => attribute.id));
  const requiredAttributes = safeArray(categoryAttributes).map(objectValue).filter((row) => {
    const tags = objectValue(row.tags), id = safeText(row.id, 80);
    return id && !present.has(id) && !['GTIN', 'ITEM_CONDITION'].includes(id) && (tags.required === true || tags.new_required === true);
  }).slice(0, 30).map((row) => ({
    id: safeText(row.id, 80), name: safeText(row.name, 120) || safeText(row.id, 80),
    values: safeArray(row.values).slice(0, 50).map(objectValue).flatMap((value) => {
      const id = safeText(value.id, 80), name = safeText(value.name, 120);
      return id && name ? [{ id, name }] : [];
    }),
  }));
  if (available && !listingTypes.length) blockingIssues.push({ code: 'listing_types_empty', message: 'Esta conta não possui um tipo de anúncio disponível para a categoria.' });
  if (!shippingModes.length) blockingIssues.push({ code: 'shipping_modes_empty', message: 'Nenhuma forma de envio compatível foi encontrada para esta conta e categoria.' });
  if (category && !conditions.length) blockingIssues.push({ code: 'conditions_empty', message: 'A categoria não retornou uma condição de produto compatível.' });
  const minimumPrice = Number(settings.minimum_price), maximumPrice = Number(settings.maximum_price), descriptionLimit = Number(settings.max_description_length);
  return { status: 'found', ean, product: fullProduct, candidates, categories, categoryId, listingTypes, shippingModes, conditions, requiredAttributes,
    constraints: { ...(Number.isFinite(minimumPrice) && minimumPrice > 0 ? { minimumPrice } : {}), ...(Number.isFinite(maximumPrice) && maximumPrice > 0 ? { maximumPrice } : {}), maxDescriptionLength: Number.isSafeInteger(descriptionLimit) && descriptionLimit > 0 ? descriptionLimit : 50000 },
    ...(blockingIssues.length ? { blockingIssues } : {}), ...(warnings.length ? { warnings } : {}),
    notice: blockingIssues.length ? 'Revise as pendências abaixo antes de publicar.' : undefined };
}

function publicationBody(form: PublicationForm, prepared: CatalogPreparation) {
  const product = prepared.product!;
  const attrs: Array<Record<string, string>> = [{ id: 'GTIN', value_name: prepared.ean }, { id: 'ITEM_CONDITION', value_id: conditionValueIds[form.condition], value_name: conditionNames[form.condition] }];
  for (const field of prepared.requiredAttributes || []) {
    const value = form.attributes?.[field.id]?.trim() || '';
    const option = field.values.find((choice) => choice.id === value);
    attrs.push(option ? { id: field.id, value_id: option.id } : { id: field.id, value_name: value });
  }
  const warranty = form.warrantyType === 'none' ? 'Sem garantia' : form.warrantyType === 'seller' ? 'Garantia do vendedor' : 'Garantia de fábrica';
  return {
    site_id: 'MLB', catalog_product_id: product.id, catalog_listing: true, category_id: form.categoryId,
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
    ean: safeText(value.ean, 14), productId: safeText(value.productId, 30), categoryId: safeText(value.categoryId, 30),
    price: typeof value.price === 'number' ? value.price : NaN,
    stock: typeof value.stock === 'number' ? value.stock : NaN,
    listingType: safeText(value.listingType, 40), shippingMode: safeText(value.shippingMode, 40), condition: safeText(value.condition, 20),
    warrantyType: safeText(value.warrantyType, 20), warrantyTime: safeText(value.warrantyTime, 41),
    description: typeof value.description === 'string' ? value.description.slice(0, 50001) : '',
    pictureUrl: safeText(value.pictureUrl, 2048), attributes,
  };
}

export async function publishMercadoLivreCatalog(db: SupabaseClient, connection: SellerConnection, actor: string, requestKey: unknown, raw: unknown) {
  if (!uuidIsValid(requestKey)) throw new MarketplaceError(400, 'invalid_request', 'Tentativa de publicação inválida. Recarregue o formulário.');
  const form = parsePublicationForm(raw);
  const prepared = await prepareMercadoLivreCatalog(db, connection, { ean: form.ean, productId: form.productId, categoryId: form.categoryId });
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
