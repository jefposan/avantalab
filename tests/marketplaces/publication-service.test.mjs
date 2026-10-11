import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier.endsWith('/management-access') || specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error { constructor(status,code,message,fields){super(message);this.status=status;this.code=code;this.fields=fields;} }', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { prepareMercadoLivreCatalog, prepareMercadoLivreListingCopy, prepareMercadoLivrePublication, publishMercadoLivreCatalog } = await import('../../app/modules/marketplaces/services/mercadolivre-publication.ts');
const { sealMarketplaceSecret } = await import('../../app/modules/marketplaces/services/secret-vault.ts');
hooks.deregister();

const company = '11111111-1111-4111-8111-111111111111';
const connectionId = '22222222-2222-4222-8222-222222222222';
const productId = 'MLB75636839';
const categoryId = 'MLB181294';
const ean = '7891129598607';
const itemId = 'MLB5999999999';

class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.mode = 'select'; this.one = false; }
  select() { return this; }
  eq(key, value) { this.filters.push((row) => row[key] === value); return this; }
  in(key, values) { this.filters.push((row) => values.includes(row[key])); return this; }
  order() { return this; }
  update(values) { this.mode = 'update'; this.values = values; return this; }
  insert(values) { this.mode = 'insert'; this.values = values; return this; }
  upsert(values) { this.mode = 'upsert'; this.values = values; return this; }
  single() { this.one = true; return this; }
  maybeSingle() { this.one = true; return this; }
  then(success, failure) { return Promise.resolve().then(() => this.execute()).then(success, failure); }
  execute() {
    const rows = this.db.tables[this.table] ||= [];
    let matched = rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.mode === 'insert') { const row = { id: crypto.randomUUID(), ...this.values }; rows.push(row); matched = [row]; }
    if (this.mode === 'update') for (const row of matched) Object.assign(row, this.values);
    if (this.mode === 'upsert') { const previous = rows.find((row) => row.connection_id === this.values.connection_id && row.provider_listing_id === this.values.provider_listing_id); previous ? Object.assign(previous, this.values) : rows.push(this.values); }
    return { error: null, data: structuredClone(this.one ? matched[0] || null : matched) };
  }
}

function database(overrides = {}) {
  return { tables: { marketplace_publications: [], marketplace_listings: [], vendas_mobile_catalogos: [], vendas_mobile_catalogo_produtos: [], ...overrides }, from(table) { return new Query(this, table); } };
}

function connection() {
  return { id: connectionId, empresa_id: company, seller_reference: '230210240', seller_name: 'FEJE298426', status: 'connected', expires_at: new Date(Date.now() + 3600000).toISOString(), token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: 'test-access', refreshToken: 'test-refresh' })) };
}

function provider() {
  const sequence = [];
  const fetch = async (input, options = {}) => {
    const url = new URL(input); const path = url.pathname; const method = options.method || 'GET'; sequence.push(`${method} ${path}`);
    if (path === '/products/search') return Response.json({ results: [{ id: productId, name: 'Geladeira Brastemp', domain_id: 'MLB-REFRIGERATORS', status: 'active', pictures: [{ secure_url: 'https://http2.mlstatic.com/a.jpg' }] }] });
    if (path === `/products/${productId}`) return Response.json({ id: productId, name: 'Geladeira Brastemp', domain_id: 'MLB-REFRIGERATORS', status: 'active', short_description: { content: 'Descrição do catálogo' }, pictures: [{ secure_url: 'https://http2.mlstatic.com/a.jpg' }], attributes: [{ id: 'BRAND', name: 'Marca', value_name: 'Brastemp' }] });
    if (path === '/catalog_domains/MLB-REFRIGERATORS/categories') return Response.json([{ id: categoryId, name: 'Geladeiras' }]);
    if (path === `/categories/${categoryId}`) return Response.json({ id: categoryId, settings: { catalog_domain: 'MLB-REFRIGERATORS', listing_allowed: true, status: 'enabled', item_conditions: ['new'], minimum_price: 10, maximum_price: 50000, max_description_length: 50000 } });
    if (path.endsWith('/available_listing_types')) return Response.json({ available: [{ id: 'gold_special', name: 'Clássico', remaining_listings: null }] });
    if (path.endsWith('/shipping_preferences')) return Response.json({ code: 'PA_UNAUTHORIZED_RESULT_FROM_POLICIES' }, { status: 403 });
    if (path === `/categories/${categoryId}/attributes`) return Response.json([{ id: 'ITEM_CONDITION', name: 'Condição', values: [{ id: '2230284', name: 'Novo' }] }]);
    if (path === '/items/validate' && method === 'POST') return new Response(null, { status: 204 });
    if (path === '/items' && method === 'POST') return Response.json({ id: itemId, seller_id: 230210240 }, { status: 201 });
    if (path === `/items/${itemId}/description` && method === 'POST') return Response.json({ text: '' }, { status: 201 });
    if (path === `/items/${itemId}/description`) return Response.json({ plain_text: 'Descrição revisável da origem.' });
    if (path === `/items/${itemId}`) return Response.json({ id: itemId, seller_id: 230210240, title: 'Geladeira Brastemp', status: 'active', price: 160, available_quantity: 1, sold_quantity: 0, listing_type_id: 'gold_special', category_id: categoryId, catalog_product_id: productId, condition: 'new', shipping: { mode: 'me2', free_shipping: false }, sale_terms: [{ id: 'WARRANTY_TYPE', value_name: 'Garantia do vendedor' }, { id: 'WARRANTY_TIME', value_name: '12 meses' }], pictures: [{ secure_url: 'https://http2.mlstatic.com/origem.jpg' }], attributes: [{ id: 'GTIN', name: 'EAN', value_name: ean }, { id: 'BRAND', value_id: '123', value_name: 'Brastemp' }] });
    if (path === '/sites/MLB/listing_prices') return Response.json([{ listing_type_id: 'gold_special', sale_fee_amount: 20 }]);
    if (path.endsWith('/shipping_options/free')) return Response.json({ coverage: { all_country: { currency_id: 'BRL', list_cost: 40 } } });
    throw new Error(`Unexpected provider route: ${method} ${url}`);
  };
  return { fetch, sequence };
}

async function environment(task) {
  const previousFetch = globalThis.fetch, previousKey = process.env.MARKETPLACE_SECRETS_KEY;
  process.env.MARKETPLACE_SECRETS_KEY = Buffer.alloc(32, 7).toString('base64url');
  try { await task(); } finally { globalThis.fetch = previousFetch; if (previousKey === undefined) delete process.env.MARKETPLACE_SECRETS_KEY; else process.env.MARKETPLACE_SECRETS_KEY = previousKey; }
}

test('preparação preserva o produto e usa envio seguro quando a consulta logística é negada', () => environment(async () => {
  const mock = provider(); globalThis.fetch = mock.fetch;
  const result = await prepareMercadoLivreCatalog(database(), connection(), { ean, productId, categoryId });
  assert.equal(result.product.id, productId);
  assert.deepEqual(result.shippingModes.map(({ id }) => id), ['me2', 'not_specified']);
  assert.equal(result.blockingIssues, undefined);
  assert.match(result.warnings[0], /validação antes de publicar/i);
  assert.equal(mock.sequence.some((request) => request.includes(`/categories/${categoryId}/shipping_preferences`)), false);
}));

function descriptionProvider(gtins = [ean]) {
  const base = provider();
  const urls = [];
  return { sequence: base.sequence, urls, fetch: async (input, options) => {
    const url = new URL(input); urls.push(url);
    const response = await base.fetch(input, options);
    if (url.pathname === `/products/${productId}`) {
      const detail = await response.json();
      detail.attributes.push({ id: 'GTIN', name: 'Código universal', values: gtins.map((name) => ({ name })) });
      return Response.json(detail);
    }
    return response;
  } };
}

test('descrição normalizada apresenta a ficha para escolha, inclusive resultado único, sem publicar', () => environment(async () => {
  const mock = descriptionProvider(); globalThis.fetch = mock.fetch;
  const result = await prepareMercadoLivreCatalog(database(), connection(), { query: '  GELADEÍRA   Brastemp  ' });
  assert.equal(result.query, 'geladeira brastemp');
  assert.equal(result.ean, ''); assert.equal(result.product, undefined);
  assert.equal(result.candidates[0].id, productId);
  assert.equal(mock.urls[0].searchParams.get('q'), 'geladeira brastemp');
  assert.equal(mock.urls[0].searchParams.has('product_identifier'), false);
  assert.equal(mock.sequence.some((request) => request.startsWith('POST')), false);
}));

test('escolher ficha por descrição preenche EAN único e reconfirma a mesma ficha pelo código', () => environment(async () => {
  const mock = descriptionProvider(); globalThis.fetch = mock.fetch;
  const result = await prepareMercadoLivreCatalog(database(), connection(), { query: 'geladeira brastemp', productId });
  assert.equal(result.ean, ean); assert.equal(result.product.id, productId);
  assert.equal(result.categoryId, categoryId);
  assert.ok(mock.urls.some((url) => url.searchParams.get('product_identifier') === ean));
  assert.equal(mock.sequence.some((request) => request.startsWith('POST')), false);
}));

test('ficha com vários EANs exige escolher o código da embalagem antes de preparar', () => environment(async () => {
  const codes = [ean, '7899882306941'];
  const mock = descriptionProvider(codes); globalThis.fetch = mock.fetch;
  const input = { query: 'geladeira brastemp', productId };
  const result = await prepareMercadoLivreCatalog(database(), connection(), input);
  assert.equal(result.ean, ''); assert.deepEqual(result.gtins, codes);
  assert.equal(result.blockingIssues[0].code, 'gtin_required');
  assert.equal(result.categoryId, undefined);
  assert.equal(result.product.raw, undefined);
  await assert.rejects(() => prepareMercadoLivreCatalog(database(), connection(), { ...input, ean: '12345670' }), { code: 'gtin_mismatch' });
  const chosen = await prepareMercadoLivreCatalog(database(), connection(), { ...input, ean: codes[1] });
  assert.equal(chosen.ean, codes[1]);
  assert.equal(mock.sequence.some((request) => request.startsWith('POST')), false);
}));

test('ficha sem EAN válido não prepara publicação nem deduz código do texto', () => environment(async () => {
  const mock = descriptionProvider(['7891129598608', 'sem código']); globalThis.fetch = mock.fetch;
  const result = await prepareMercadoLivreCatalog(database(), connection(), { query: 'geladeira brastemp', productId });
  assert.equal(result.ean, ''); assert.deepEqual(result.gtins, []);
  assert.equal(result.blockingIssues[0].code, 'gtin_required');
  assert.match(result.notice, /Digite ou leia o código da embalagem/);
  assert.equal(mock.sequence.some((request) => request.startsWith('POST')), false);
}));

test('descrição sem resultados ou curta informa vazio/erro sem alterar cadastros', () => environment(async () => {
  const mock = provider(); const db = database();
  globalThis.fetch = async (input, options) => new URL(input).pathname === '/products/search' ? Response.json({ results: [] }) : mock.fetch(input, options);
  const result = await prepareMercadoLivreCatalog(db, connection(), { query: 'produto inexistente' });
  assert.equal(result.status, 'not_found'); assert.equal(result.ean, '');
  await assert.rejects(() => prepareMercadoLivreCatalog(db, connection(), { query: 'ab' }), { code: 'invalid_query' });
  assert.deepEqual(db.tables.marketplace_publications, []);
  assert.deepEqual(db.tables.marketplace_listings, []);
}));

test('EAN da descrição que não reconfirma a ficha selecionada bloqueia a preparação', () => environment(async () => {
  const mock = descriptionProvider();
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    if (url.pathname === '/products/search' && url.searchParams.has('product_identifier')) return Response.json({ results: [{ id: 'MLB999999', name: 'Outra ficha', domain_id: 'MLB-REFRIGERATORS', status: 'active' }] });
    return mock.fetch(input, options);
  };
  await assert.rejects(() => prepareMercadoLivreCatalog(database(), connection(), { query: 'geladeira brastemp', productId }), { code: 'catalog_changed' });
  assert.equal(mock.sequence.some((request) => request.startsWith('POST')), false);
}));

test('fluxo completo valida antes de criar e registra o anúncio confirmado', () => environment(async () => {
  const mock = provider(); globalThis.fetch = mock.fetch; const db = database();
  const result = await publishMercadoLivreCatalog(db, connection(), 'actor', crypto.randomUUID(), { ean, productId, categoryId, price: 160, stock: 1, listingType: 'gold_special', shippingMode: 'me2', condition: 'new', warrantyType: 'none', description: 'Produto novo.', attributes: {} });
  assert.equal(result.status, 'published'); assert.equal(result.listing.id, itemId);
  assert.ok(mock.sequence.indexOf('POST /items/validate') < mock.sequence.indexOf('POST /items'));
  assert.equal(db.tables.marketplace_publications[0].status, 'published');
  assert.equal(db.tables.marketplace_listings[0].provider_listing_id, itemId);
}));

test('anúncio existente é relido e preparado como rascunho em outra conta, sem publicar', () => environment(async () => {
  const mock = provider(); globalThis.fetch = mock.fetch;
  const target = { ...connection(), id: '33333333-3333-4333-8333-333333333333', seller_reference: '99887766', seller_name: 'DESTINO' };
  const copied = await prepareMercadoLivreListingCopy(database(), connection(), target, itemId);
  assert.equal(copied.form.price, 160);
  assert.equal(copied.form.description, 'Descrição revisável da origem.');
  assert.equal(copied.form.warrantyType, 'seller');
  assert.equal(copied.form.warrantyTime, '12 meses');
  assert.equal(copied.result.product.id, productId);
  assert.ok(mock.sequence.includes(`GET /items/${itemId}`));
  assert.ok(mock.sequence.includes(`GET /items/${itemId}/description`));
  assert.equal(mock.sequence.some((request) => request.startsWith('POST /items')), false);
}));

test('cópia entre empresas é recusada antes de consultar ou publicar', () => environment(async () => {
  const mock = provider(); globalThis.fetch = mock.fetch;
  const target = { ...connection(), id: '33333333-3333-4333-8333-333333333333', empresa_id: '44444444-4444-4444-8444-444444444444' };
  await assert.rejects(() => prepareMercadoLivreListingCopy(database(), connection(), target, itemId), { code: 'cross_company_copy' });
  assert.equal(mock.sequence.length, 0);
}));

function noEanProvider({ traditional = false, gtinTags = {}, reason = false, owner = '230210240', inactive = false, rejectValidation = false } = {}) {
  const base = provider();
  const bodies = [];
  let created = false;
  return { sequence: base.sequence, bodies, fetch: async (input, options = {}) => {
    const path = new URL(input).pathname;
    if (options.method === 'POST' && ['/items', '/items/validate'].includes(path)) bodies.push({ path, body: JSON.parse(options.body) });
    if (rejectValidation && path === '/items/validate') return Response.json({ message: 'GTIN exigido pelo provedor' }, { status: 400 });
    const response = await base.fetch(input, options);
    if (path === '/items' && options.method === 'POST') { created = true; return Response.json({ id: itemId, seller_id: 99887766 }, { status: 201 }); }
    if (path === `/items/${itemId}`) {
      const item = await response.json();
      item.seller_id = created ? 99887766 : owner;
      item.attributes = item.attributes.filter(attribute => attribute.id !== 'GTIN');
      if (traditional) { delete item.catalog_product_id; item.domain_id = 'MLB-REFRIGERATORS'; }
      if (reason) item.attributes.push({ id: 'EMPTY_GTIN_REASON', name: 'Motivo sem EAN', value_id: '17055161', value_name: 'O produto não tem código cadastrado' });
      return Response.json(item);
    }
    if (inactive && path === `/products/${productId}`) { const item = await response.json(); item.status = 'inactive'; return Response.json(item); }
    if (path === `/categories/${categoryId}/attributes`) return Response.json([
      ...(await response.json()), { id: 'BRAND', name: 'Marca' }, { id: 'GTIN', name: 'EAN', tags: gtinTags },
      { id: 'EMPTY_GTIN_REASON', name: 'Motivo da ausência de EAN', values: [{ id: '17055161', name: 'O produto não tem código cadastrado' }] },
    ]);
    return response;
  } };
}

const copyTarget = () => ({ ...connection(), id: '33333333-3333-4333-8333-333333333333', seller_reference: '99887766' });

test('cópia de catálogo sem EAN usa a ficha original ativa, sem pesquisa textual ou publicação', () => environment(async () => {
  const mock = noEanProvider(); globalThis.fetch = mock.fetch;
  const copied = await prepareMercadoLivreListingCopy(database(), connection(), copyTarget(), itemId);
  assert.equal(copied.result.ean, ''); assert.equal(copied.form.ean, '');
  assert.equal(copied.result.product.id, productId);
  assert.equal(copied.result.copySource.listingId, itemId);
  assert.equal(copied.result.blockingIssues, undefined);
  assert.equal(mock.sequence.includes('GET /products/search'), false);
  assert.equal(mock.sequence.some(request => request.startsWith('POST')), false);
}));

test('cópia tradicional sem EAN preserva título, descrição, categoria e motivo real da origem', () => environment(async () => {
  const mock = noEanProvider({ traditional: true, gtinTags: { conditional_required: true }, reason: true }); globalThis.fetch = mock.fetch;
  const copied = await prepareMercadoLivreListingCopy(database(), connection(), copyTarget(), itemId);
  assert.equal(copied.result.product.source, 'marketplace_listing');
  assert.equal(copied.result.product.id, itemId);
  assert.equal(copied.result.product.name, 'Geladeira Brastemp');
  assert.equal(copied.result.categoryId, categoryId);
  assert.equal(copied.form.description, 'Descrição revisável da origem.');
  assert.equal(copied.result.presetAttributes.find(attr => attr.id === 'EMPTY_GTIN_REASON').valueId, '17055161');
  assert.equal(mock.sequence.includes('GET /products/search'), false);
}));

test('GTIN obrigatório continua bloqueando tradicional e motivo condicional não é inventado', () => environment(async () => {
  for (const tags of [{ required: true }, { conditional_required: true }]) {
    const mock = noEanProvider({ traditional: true, gtinTags: tags }); globalThis.fetch = mock.fetch;
    const copied = await prepareMercadoLivreListingCopy(database(), connection(), copyTarget(), itemId);
    if (tags.required) assert.equal(copied.result.blockingIssues[0].code, 'provider_gtin_required');
    else {
      assert.equal(copied.result.requiredAttributes[0].id, 'EMPTY_GTIN_REASON');
      assert.equal(copied.form.attributes.EMPTY_GTIN_REASON, undefined);
    }
    assert.equal(mock.sequence.some(request => request.startsWith('POST')), false);
  }
}));

test('origem de outro vendedor ou ficha inativa não libera cópia sem EAN', () => environment(async () => {
  const wrongOwner = noEanProvider({ owner: '99999' }); globalThis.fetch = wrongOwner.fetch;
  await assert.rejects(() => prepareMercadoLivreListingCopy(database(), connection(), copyTarget(), itemId), { code: 'listing_not_found' });
  const inactive = noEanProvider({ inactive: true }); globalThis.fetch = inactive.fetch;
  await assert.rejects(() => prepareMercadoLivreListingCopy(database(), connection(), copyTarget(), itemId), { code: 'catalog_changed' });
}));

test('ausência confirmada de descrição não exige EAN, mas recusa de acesso continua bloqueando', () => environment(async () => {
  for (const status of [404, 403]) {
    const mock = noEanProvider();
    globalThis.fetch = (input, options) => new URL(input).pathname === `/items/${itemId}/description` ? Response.json({ message: 'Descrição indisponível' }, { status }) : mock.fetch(input, options);
    if (status === 404) {
      const copied = await prepareMercadoLivreListingCopy(database(), connection(), copyTarget(), itemId);
      assert.equal(copied.form.description, ''); assert.equal(copied.form.ean, '');
      assert.equal(copied.result.product.id, productId);
    } else await assert.rejects(() => prepareMercadoLivreListingCopy(database(), connection(), copyTarget(), itemId), { code: 'provider_403' });
  }
}));

test('publicação de cópia sem EAN relê origem e valida payload sem GTIN vazio ou fictício', () => environment(async () => {
  for (const traditional of [false, true]) {
    const source = { ...connection(), provider: 'mercado_livre' }; const target = copyTarget();
    const db = database({ marketplace_connections: [source] });
    const mock = noEanProvider({ traditional }); globalThis.fetch = mock.fetch;
    const copied = await prepareMercadoLivreListingCopy(db, source, target, itemId);
    const result = await publishMercadoLivreCatalog(db, target, 'actor', crypto.randomUUID(), { ...copied.form, price: 170, description: 'Descrição alterada no destino.' });
    assert.equal(result.status, 'published');
    assert.equal(mock.sequence.filter(request => request === `GET /items/${itemId}`).length, 3);
    assert.ok(mock.sequence.indexOf('POST /items/validate') < mock.sequence.indexOf('POST /items'));
    const payload = mock.bodies.find(entry => entry.path === '/items').body;
    assert.equal(payload.attributes.some(attr => attr.id === 'GTIN'), false);
    assert.equal(payload.price, 170);
    assert.equal(payload.catalog_product_id, traditional ? undefined : productId);
    assert.equal(payload.title, 'Geladeira Brastemp');
    assert.equal(db.tables.marketplace_publications[0].ean, '');
  }
}));

test('origem falsa, empresa divergente e EAN ausente sem cópia autenticada são recusados', () => environment(async () => {
  const mock = noEanProvider(); globalThis.fetch = mock.fetch;
  const source = { ...connection(), provider: 'mercado_livre', empresa_id: '44444444-4444-4444-8444-444444444444' };
  const db = database({ marketplace_connections: [source] });
  await assert.rejects(() => prepareMercadoLivrePublication(db, copyTarget(), { copySource: { connectionId: 'invalid', listingId: itemId } }), { code: 'invalid_copy_source' });
  await assert.rejects(() => prepareMercadoLivrePublication(db, copyTarget(), { copySource: { connectionId: source.id, listingId: itemId } }), { code: 'account_not_found' });
  await assert.rejects(() => publishMercadoLivreCatalog(db, copyTarget(), 'actor', crypto.randomUUID(), { ean: '', productId }), { code: 'invalid_ean' });
  assert.equal(mock.sequence.length, 0);
}));

test('validador do Mercado Livre pode recusar cópia sem EAN; não cria anúncio nem auditoria de publicação', () => environment(async () => {
  const source = { ...connection(), provider: 'mercado_livre' }; const db = database({ marketplace_connections: [source] });
  const mock = noEanProvider({ rejectValidation: true }); globalThis.fetch = mock.fetch;
  const copied = await prepareMercadoLivreListingCopy(db, source, copyTarget(), itemId);
  await assert.rejects(() => publishMercadoLivreCatalog(db, copyTarget(), 'actor', crypto.randomUUID(), copied.form));
  assert.equal(mock.sequence.includes('POST /items'), false);
  assert.deepEqual(db.tables.marketplace_publications, []);
}));

test('EAN ausente no catálogo do ML usa o cadastro isolado da empresa e o preditor sem publicar', () => environment(async () => {
  const requests = [];
  globalThis.fetch = async (input) => {
    const url = new URL(input); requests.push(`${url.hostname}${url.pathname}`);
    if (url.hostname === 'api.mercadolibre.com' && url.pathname === '/products/search') return Response.json({ results: [] });
    if (url.hostname === 'api.mercadolibre.com' && url.pathname === '/sites/MLB/domain_discovery/search') return Response.json([
      { domain_id: 'MLB-GINS', category_id: 'MLB32130', category_name: 'Gin', attributes: [{ id: 'BRAND', name: 'Marca', value_name: 'Bóra' }] },
      { domain_id: 'MLB-ALCOHOLIC-DRINKS', category_id: 'MLB12345', category_name: 'Outras bebidas', attributes: [] },
    ]);
    throw new Error(`Unexpected provider route: ${url}`);
  };
  const profileCatalogId = '33333333-3333-4333-8333-333333333333';
  const profileProductId = '44444444-4444-4444-8444-444444444444';
  const db = database({
    vendas_mobile_catalogos: [{ id: profileCatalogId, empresa_id: company, ativo: true, padrao: true }],
    vendas_mobile_catalogo_produtos: [{ id: profileProductId, catalogo_id: profileCatalogId, nome: 'Bóra London Dry Gin 700 ml', marca: 'Bóra', descricao: 'Gin cadastrado no perfil.', imagem_url: 'https://images.example.test/bora.jpg', codigo_barras: ean, ativo: true }],
  });
  const result = await prepareMercadoLivreCatalog(db, connection(), { ean });
  assert.equal(result.product.source, 'profile_catalog');
  assert.equal(result.product.name, 'Bóra London Dry Gin 700 ml');
  assert.deepEqual(result.categories, [{ id: 'MLB32130', name: 'Gin' }, { id: 'MLB12345', name: 'Outras bebidas' }]);
  assert.equal(result.categoryId, undefined);
  assert.equal(requests.some((request) => request.includes('gs1')), false);
  assert.equal(requests.some((request) => request.endsWith('/items')), false);
}));
