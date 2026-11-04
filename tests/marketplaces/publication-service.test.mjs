import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier.endsWith('/management-access') || specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error { constructor(status,code,message,fields,details){super(message);this.status=status;this.code=code;this.fields=fields;this.details=details;} }', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { prepareMercadoLivreCatalog, prepareMercadoLivreListingCopy, prepareMercadoLivrePublication, prepareLocalProductPublication, refreshLocalProductListing, publishMercadoLivreCatalog: publishWithoutShippingReview, quoteMercadoLivrePublicationShipping } = await import('../../app/modules/marketplaces/services/mercadolivre-publication.ts');
// Simula a conferência de frete feita pelo formulário; todas as requisições são mocks locais.
async function publishMercadoLivreCatalog(db, account, actor, requestKey, form) {
  let reviewed = form;
  try {
    const quote = await quoteMercadoLivrePublicationShipping(db, account, form);
    reviewed = { ...form, freeShipping: quote.freeShipping, shippingQuoteToken: quote.token, acknowledgeUnavailableShippingCost: quote.sellerCost == null };
  } catch { /* Casos de formulário inválido continuam testando a recusa original. */ }
  return publishWithoutShippingReview(db, account, actor, requestKey, reviewed);
}
const { sealMarketplaceSecret } = await import('../../app/modules/marketplaces/services/secret-vault.ts');
const { reviewPublicationShipping, productPackageDimensions } = await import('../../app/modules/marketplaces/services/mercadolivre-publication-shipping.ts');
const { publicationShippingKey, packageDimensionsText } = await import('../../app/modules/marketplaces/publication-shipping.ts');
hooks.deregister();

const shippingForm = () => ({ ean, productId, categoryId, price: 160, stock: 1, listingType: 'gold_special', shippingMode: 'me2', condition: 'new', warrantyType: 'none', attributes: {}, packageDimensions: { height: 20, width: 30, length: 40, weightKg: 2 } });
function shippingProvider({ policy = 'mandatory', cost = 58.75, currency = 'BRL', failPolicy = false, failCost = false, categoryDimensions = false } = {}) {
  const base = provider(), calls = [];
  return { calls, fetch: async (input, options = {}) => {
    const url = new URL(input), path = url.pathname;
    calls.push({ path, query: url.searchParams, method: options.method || 'GET', body: options.body && JSON.parse(options.body) });
    if (path.endsWith('/shipping_modes')) {
      assert.equal(options.method, 'POST'); assert.equal(options.headers['X-Format-New'], 'true'); assert.equal(options.headers['x-multichannel'], 'true');
      if (failPolicy) return Response.json({}, { status: 403 });
      return Response.json({ channels: { marketplace: { available_modes: [{ mode: 'me2', shipping_attributes: { free_shipping: policy }, logistic_types: [{ type: 'cross_docking', default: true }] }] }, mshops: { available_modes: [{ mode: 'me2', shipping_attributes: { free_shipping: 'optional' } }] } } });
    }
    if (path.endsWith('/shipping_options/free')) return failCost ? Response.json({}, { status: 403 }) : Response.json({ coverage: { all_country: { list_cost: cost, currency_id: currency } } });
    if (categoryDimensions && path === `/categories/${categoryId}/shipping_preferences`) return Response.json({ dimensions: { height: 10, width: 20, length: 30, weight: 1500 } });
    return base.fetch(input, options);
  } };
}

for (const policy of ['mandatory', 'optional', 'not_allowed']) test(`frete ${policy}: consulta autenticada, seleção e custo sem criar produto`, () => environment(async () => {
  const mock = shippingProvider({ policy }), db = database(); globalThis.fetch = mock.fetch;
  const form = { ...shippingForm(), freeShipping: policy !== 'mandatory' };
  const quote = await quoteMercadoLivrePublicationShipping(db, connection(), form);
  assert.equal(quote.policy, policy); assert.equal(quote.freeShipping, policy !== 'not_allowed'); assert.equal(quote.sellerCost, 58.75);
  const query = mock.calls.find(c => c.path.endsWith('/shipping_options/free')).query;
  assert.equal(query.get('free_shipping'), quote.freeShipping ? 'True' : 'False'); assert.equal(query.get('dimensions'), '20x30x40,2000'); assert.equal(query.get('logistic_type'), 'cross_docking');
  assert.ok(quote.token.length < 1000); assert.equal(quote.dimensionsSource, 'manual');
  const prepared = await prepareMercadoLivrePublication(db, connection(), form);
  reviewPublicationShipping(connection(), { ...form, freeShipping: quote.freeShipping, shippingQuoteToken: quote.token }, prepared);
  assert.equal(mock.calls.some(c => c.path === '/items' || c.path === '/items/validate'), false);
  for (const table of ['marketplace_products', 'marketplace_product_links', 'marketplace_publications']) assert.deepEqual(db.tables[table], []);
}));

test('frete opcional desmarcado usa False; custo zero explícito não é indisponível', () => environment(async () => {
  const mock = shippingProvider({ policy: 'optional', cost: 0 }), db = database(); globalThis.fetch = mock.fetch;
  const form = shippingForm(), quote = await quoteMercadoLivrePublicationShipping(db, connection(), form);
  assert.equal(quote.freeShipping, false); assert.equal(quote.sellerCost, 0);
  assert.equal(mock.calls.find(c => c.path.endsWith('/shipping_options/free')).query.get('free_shipping'), 'False');
  reviewPublicationShipping(connection(), { ...form, shippingQuoteToken: quote.token }, await prepareMercadoLivrePublication(db, connection(), form));
}));

for (const options of [{ failCost: true }, { cost: null }, { cost: -1 }, { currency: 'USD' }]) test(`custo ausente/inválido exige ciência: ${JSON.stringify(options)}`, () => environment(async () => {
  const mock = shippingProvider(options), db = database(); globalThis.fetch = mock.fetch;
  const form = shippingForm(), quote = await quoteMercadoLivrePublicationShipping(db, connection(), form);
  assert.equal(quote.policy, 'mandatory'); assert.equal(quote.freeShipping, true); assert.equal(quote.sellerCost, null);
  const prepared = await prepareMercadoLivrePublication(db, connection(), form), reviewed = { ...form, freeShipping: true, shippingQuoteToken: quote.token };
  assert.throws(() => reviewPublicationShipping(connection(), reviewed, prepared), { code: 'shipping_review_required' });
  reviewPublicationShipping(connection(), { ...reviewed, acknowledgeUnavailableShippingCost: true }, prepared);
}));

for (const options of [{ failPolicy: true }, { policy: 'invalid' }]) test(`regra não confirmada não libera publicação: ${JSON.stringify(options)}`, () => environment(async () => {
  const mock = shippingProvider(options), db = database(); globalThis.fetch = mock.fetch;
  const quote = await quoteMercadoLivrePublicationShipping(db, connection(), shippingForm());
  assert.equal(quote.policy, 'unknown'); assert.equal(quote.token, undefined); assert.equal(quote.sellerCost, null);
  assert.equal(mock.calls.some(c => c.path.endsWith('/shipping_options/free')), false);
}));

test('assinatura de frete rejeita outro preço, conta, empresa, embalagem, produto, expiração ou token adulterado', () => environment(async () => {
  const db = database(), mock = shippingProvider(); globalThis.fetch = mock.fetch;
  const form = shippingForm(), quote = await quoteMercadoLivrePublicationShipping(db, connection(), form);
  const prepared = await prepareMercadoLivrePublication(db, connection(), form), reviewed = { ...form, freeShipping: true, shippingQuoteToken: quote.token };
  for (const patch of [{ price: 161 }, { productId: 'MLB999' }, { freeShipping: false }, { packageDimensions: { ...form.packageDimensions, height: 21 } }, { shippingQuoteToken: quote.token + 'x' }, { shippingQuoteToken: undefined }]) assert.throws(() => reviewPublicationShipping(connection(), { ...reviewed, ...patch }, prepared), { code: 'shipping_review_required' });
  for (const account of [{ ...connection(), id: crypto.randomUUID() }, { ...connection(), empresa_id: crypto.randomUUID() }, { ...connection(), seller_reference: '999' }]) assert.throws(() => reviewPublicationShipping(account, reviewed, prepared), { code: 'shipping_review_required' });
  assert.throws(() => reviewPublicationShipping(connection(), reviewed, { ...prepared, product: { ...prepared.product, attributes: [{ id: 'BRAND', value: 'Outra' }] } }), { code: 'shipping_review_required' });
  const originalNow = Date.now; Date.now = () => originalNow() + 11 * 60000;
  try { assert.throws(() => reviewPublicationShipping(connection(), reviewed, prepared), { code: 'shipping_review_required' }); } finally { Date.now = originalNow; }
  await assert.rejects(publishWithoutShippingReview(db, connection(), 'actor', crypto.randomUUID(), form), { code: 'shipping_review_required' });
  assert.equal(mock.calls.some(c => c.path === '/items' && c.method === 'POST'), false); assert.deepEqual(db.tables.marketplace_products, []); assert.deepEqual(db.tables.marketplace_publications, []);
}));

test('estimativa padrão de categoria é identificada; embalagem parcial não usa fallback silencioso', () => environment(async () => {
  const db = database(), mock = shippingProvider({ categoryDimensions: true }); globalThis.fetch = mock.fetch;
  const form = { ...shippingForm(), packageDimensions: undefined }, quote = await quoteMercadoLivrePublicationShipping(db, connection(), form);
  assert.equal(quote.dimensionsSource, 'category'); assert.equal(mock.calls.find(c => c.path.endsWith('/shipping_options/free')).query.get('dimensions'), '10x20x30,1500');
  const partial = await quoteMercadoLivrePublicationShipping(db, connection(), { ...form, packageDimensions: { height: 10 } });
  assert.equal(partial.sellerCost, null); assert.equal(partial.dimensionsSource, null); assert.match(partial.notice, /Informe altura/);
}));

test('medidas distinguem caixa/produto e convertem cm/mm/m/kg/g, rejeitando inválidos', () => {
  const attrs = [['SELLER_PACKAGE_HEIGHT', '200 mm'], ['SELLER_PACKAGE_WIDTH', '0,3 m'], ['SELLER_PACKAGE_LENGTH', '40 cm'], ['SELLER_PACKAGE_WEIGHT', '2000 g']].map(([id, value]) => ({ id, value }));
  assert.equal(packageDimensionsText(productPackageDimensions({ product: { attributes: attrs } })), '20x30x40,2000');
  assert.equal(productPackageDimensions({ product: { attributes: [{ id: 'HEIGHT', value: '30 cm' }] } }), undefined);
  for (const value of [undefined, {}, { height: 0, width: 2, length: 3, weightKg: 1 }, { height: NaN, width: 2, length: 3, weightKg: 1 }, { height: 1, width: 2, length: 3, weightKg: -1 }]) assert.equal(packageDimensionsText(value), null);
  const form = shippingForm(); assert.equal(publicationShippingKey(form), publicationShippingKey({ ...form, shippingQuoteToken: 'x', description: 'Outra', acknowledgeUnavailableShippingCost: true }));
  assert.notEqual(publicationShippingKey(form), publicationShippingKey({ ...form, price: 200 }));
});

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
  is(key, value) { this.filters.push((row) => (row[key] ?? null) === value); return this; }
  in(key, values) { this.filters.push((row) => values.includes(row[key])); return this; }
  order() { return this; }
  limit() { return this; }
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
  if (overrides.marketplace_products) overrides = { ...overrides, marketplace_products: overrides.marketplace_products.map(row => ({ pictures: [], revision: 1, ...row })) };
  return { tables: { marketplace_products: [], marketplace_product_links: [], marketplace_publications: [], marketplace_listings: [], vendas_mobile_catalogos: [], vendas_mobile_catalogo_produtos: [], ...overrides }, from(table) { return new Query(this, table); },
    async rpc(name, args) {
      if(name==='marketplace_listing_catalog_import'){
        const linked=this.tables.marketplace_product_links.find(l=>l.connection_id===args.p_connection&&l.provider_listing_id===args.p_listing);
        assert.ok(linked);assert.equal(args.p_empresa,company);return {data:{product_id:linked.product_id,created:false},error:null};
      }
      assert.equal(name, 'marketplace_product_command');
      const data = args.p_data;
      if (args.p_action === 'draft') {
        const row = { id: crypto.randomUUID(), empresa_id: args.p_empresa_id, ...data }; this.tables.marketplace_products.push(row);
        return { data: { product_id: row.id, created: true }, error: null };
      }
      if (args.p_action === 'import') {
        const link = this.tables.marketplace_product_links.find(row => row.connection_id === data.connection_id && row.provider_listing_id === data.provider_listing_id);
        assert.ok(link, 'fixture de cópia deve ter estoque físico já confirmado');
        return { data: { product_id: link.product_id, created: false }, error: null };
      }
      if (args.p_action === 'enrich') {
        const row = this.tables.marketplace_products.find(row => row.id === data.product_id && row.empresa_id === args.p_empresa_id);
        assert.ok(row);
        if (!row.description) row.description = data.description;
        if (!row.pictures.length) row.pictures = data.pictures;
        return { data: { product_id: row.id, created: false }, error: null };
      }
      assert.equal(args.p_action, 'link');
      this.tables.marketplace_product_links.push(data);
      return { data: { product_id: data.product_id, created: false }, error: null };
    } };
}

function connection() {
  return { id: connectionId, empresa_id: company, seller_reference: '230210240', seller_name: 'FEJE298426', status: 'connected', expires_at: new Date(Date.now() + 3600000).toISOString(), token_sealed: sealMarketplaceSecret(JSON.stringify({ accessToken: 'test-access', refreshToken: 'test-refresh' })) };
}

function provider() {
  const sequence = [];
  const fetch = async (input, options = {}) => {
    const url = new URL(input); const path = url.pathname; const method = options.method || 'GET'; sequence.push(`${method} ${path}`);
    if (['/users/230210240', '/users/99887766'].includes(path)) return Response.json({ id: Number(path.split('/').at(-1)), tags: [] });
    if (path === '/products/search') return Response.json({ results: [{ id: productId, name: 'Geladeira Brastemp', domain_id: 'MLB-REFRIGERATORS', status: 'active', pictures: [{ secure_url: 'https://http2.mlstatic.com/a.jpg' }] }] });
    if (path === `/products/${productId}`) return Response.json({ id: productId, name: 'Geladeira Brastemp', domain_id: 'MLB-REFRIGERATORS', status: 'active', short_description: { content: 'Descrição do catálogo' }, pictures: [{ secure_url: 'https://http2.mlstatic.com/a.jpg' }], attributes: [{ id: 'BRAND', name: 'Marca', value_name: 'Brastemp' }] });
    if (path === '/catalog_domains/MLB-REFRIGERATORS/categories') return Response.json([{ id: categoryId, name: 'Geladeiras' }]);
    if (path === `/categories/${categoryId}`) return Response.json({ id: categoryId, settings: { catalog_domain: 'MLB-REFRIGERATORS', listing_allowed: true, status: 'enabled', item_conditions: ['new'], minimum_price: 10, maximum_price: 50000, max_description_length: 50000 } });
    if (path.endsWith('/available_listing_types')) return Response.json({ available: [{ id: 'gold_special', name: 'Clássico', remaining_listings: null }] });
    if (path.endsWith('/shipping_modes')) return Response.json({ channels: { marketplace: { available_modes: [{ mode: 'me2', shipping_attributes: { free_shipping: 'optional' } }] } } });
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

test('preparo oferece atributos opcionais editáveis; validador recebe preenchidos e omite vazios/protegidos sem criar anúncio',()=>environment(async()=>{
 const mock=provider(),db=database();let body;
 globalThis.fetch=async(input,options={})=>{const path=new URL(input).pathname;
  if(path===`/categories/${categoryId}/attributes`)return Response.json([
   {id:'ITEM_CONDITION',name:'Condição',values:[{id:'2230284',name:'Novo'}]},
   {id:'LINE',name:'Linha',value_type:'list',values:[{id:'A',name:'Linha A'}]},
   {id:'CAPACITY',name:'Capacidade',value_type:'number_unit',allowed_units:[{id:'L',name:'L'}]},
   {id:'SOURCE',name:'Fonte',value_type:'string'},
   {id:'READ_ONLY',name:'Interno',value_type:'string',tags:{read_only:true}},
   {id:'FIXED',name:'Fixo',value_type:'string',tags:{fixed:true}}
  ]);
  if(path==='/items/validate'){body=JSON.parse(options.body);return Response.json({message:'Recusa simulada para impedir criação'},{status:400});}
  if(path==='/items')throw Error('Teste não pode criar anúncio');return mock.fetch(input,options);
 };
 const prepared=await prepareMercadoLivreCatalog(db,connection(),{ean,productId,categoryId});assert.deepEqual(prepared.optionalAttributes.map(f=>f.id),['LINE','CAPACITY','SOURCE']);
 await assert.rejects(publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),{...shippingForm(),attributes:{LINE:'A',CAPACITY:'20 L',READ_ONLY:'forjado'}}));
 assert.ok(body.attributes.some(a=>a.id==='LINE'&&a.value_id==='A'));assert.ok(body.attributes.some(a=>a.id==='CAPACITY'&&a.value_name==='20 L'));assert.equal(body.attributes.some(a=>['SOURCE','READ_ONLY','FIXED'].includes(a.id)),false);
}));

async function environment(task) {
  const previousFetch = globalThis.fetch, previousKey = process.env.MARKETPLACE_SECRETS_KEY;
  process.env.MARKETPLACE_SECRETS_KEY = Buffer.alloc(32, 7).toString('base64url');
  try { await task(); } finally { globalThis.fetch = previousFetch; if (previousKey === undefined) delete process.env.MARKETPLACE_SECRETS_KEY; else process.env.MARKETPLACE_SECRETS_KEY = previousKey; }
}

test('preparação resolve nomes e caminhos de todas as opções antes da escolha, reutilizando o detalhe selecionado', () => environment(async () => {
 const mock=provider(),reads=new Map();
 globalThis.fetch=async(input,options)=>{
  const path=new URL(input).pathname;
  if(path==='/catalog_domains/MLB-REFRIGERATORS/categories')return Response.json([{id:categoryId,name:categoryId},{id:'MLB40289',name:'Ventiladores'}]);
  if(path===`/categories/${categoryId}`||path==='/categories/MLB40289'){
   reads.set(path,(reads.get(path)||0)+1);
   const value=path===`/categories/${categoryId}`?await (await mock.fetch(input,options)).json():{id:'MLB40289'};
   return Response.json({...value,name:'Ventiladores',path_from_root:[{name:path.endsWith('40289')?'Antiguidades e Coleções':'Eletrodomésticos'},{name:'Ventiladores'}]});
  }
  return mock.fetch(input,options);
 };
 const result=await prepareMercadoLivreCatalog(database(),connection(),{ean,productId});
 assert.deepEqual(result.categories.map(row=>row.path),['Eletrodomésticos → Ventiladores','Antiguidades e Coleções → Ventiladores']);
 assert.ok(result.categories.every(row=>row.name==='Ventiladores'));
 assert.equal(result.categoryId,undefined);
 reads.clear();await prepareMercadoLivreCatalog(database(),connection(),{ean,productId,categoryId});
 assert.equal(reads.get(`/categories/${categoryId}`),1,'detalhe da opção selecionada não é consultado duas vezes');
}));

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

test('garantia sem unidade bloqueia antes de qualquer POST externo ou gravação', () => environment(async () => {
  const mock=provider(),db=database(),calls=[];
  globalThis.fetch=async(input,options={})=>{
    calls.push(options.method || 'GET');return mock.fetch(input,options);
  };
  await assert.rejects(publishWithoutShippingReview(db,connection(),'actor',crypto.randomUUID(),{ean,productId,categoryId,price:160,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'factory',warrantyTime:'3',attributes:{}}),error=>{
    assert.match(error.fields.warrantyTime,/Ex\.: 3 meses/);return true;
  });
  assert.equal(calls.includes('POST'),false);
  for(const table of ['marketplace_publications','marketplace_products','marketplace_product_links','marketplace_listings'])assert.deepEqual(db.tables[table],[]);
}));

test('publicação simulada filtra read_only/inferred e segue após pré-validador com somente advertências',()=>environment(async()=>{
  const mock=provider(),db=database(),bodies=[];
  globalThis.fetch=async(input,options={})=>{
    const path=new URL(input).pathname;
    if(path===`/products/${productId}`){const row=await (await mock.fetch(input,options)).json();row.attributes.push({id:'PACKAGE_DATA_SOURCE',value_name:'CERTIFIED_MEASUREMENT'},{id:'INFERRED_ATTRIBUTE',value_name:'Interno'});return Response.json(row);}
    if(path===`/categories/${categoryId}/attributes`)return Response.json([{id:'BRAND',name:'Marca'},{id:'PACKAGE_DATA_SOURCE',tags:{read_only:true,required:true}},{id:'INFERRED_ATTRIBUTE',tags:{inferred:true,required:true}},{id:'ITEM_CONDITION',values:[{id:'2230284',name:'Novo'}]}]);
    if(options.method==='POST'&&['/items/validate','/items'].includes(path))bodies.push({path,body:JSON.parse(options.body)});
    if(path==='/items/validate')return Response.json({error:'validation_error',status:400,cause:[{type:'warning',code:'item.shipping.mandatory_free_shipping',message:'Mandatory free shipping added'}]},{status:400});
    return mock.fetch(input,options);
  };
  const result=await publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),{ean,productId,categoryId,price:160,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'none',freeShipping:true,attributes:{PACKAGE_DATA_SOURCE:'injetado'}});
  assert.equal(result.status,'published');assert.deepEqual(bodies.map(x=>x.path),['/items/validate','/items']);
  for(const {body} of bodies){assert.equal(body.attributes.some(x=>['PACKAGE_DATA_SOURCE','INFERRED_ATTRIBUTE'].includes(x.id)),false);assert.ok(body.attributes.some(x=>x.id==='BRAND'));}
}));

test('recusa do validador devolve motivo e campo sem criar anúncio, cadastro, saldo ou tentativa de publicação', () => environment(async () => {
  const mock=provider(),db=database();const calls=[];
  globalThis.fetch=async(input,options={})=>{
    calls.push(`${options.method || 'GET'} ${new URL(input).pathname}`);
    if(new URL(input).pathname==='/items/validate')return Response.json({message:'Validation error',cause:[{type:'error',code:'item.sale_terms.invalid',references:['item.sale_terms[WARRANTY_TIME]'],message:'Warranty time must include a unit.'}]},{status:400});
    return mock.fetch(input,options);
  };
  await assert.rejects(publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),{ean,productId,categoryId,price:160,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'factory',warrantyTime:'3 meses',attributes:{}}),error=>{
    assert.equal(error.code,'invalid_fields');assert.match(error.message,/quantidade e a unidade/);assert.match(error.details,/item.sale_terms.invalid/);return true;
  });
  assert.ok(calls.includes('POST /items/validate'));assert.equal(calls.some(call=>/^POST \/items$/.test(call)),false);
  for(const table of ['marketplace_publications','marketplace_products','marketplace_product_links','marketplace_listings'])assert.deepEqual(db.tables[table],[]);
}));

for(const accepted of [true,false])test(`nome longo oficial de catálogo chega à validação do ML e respeita sua ${accepted?'aceitação':'recusa'}`,()=>environment(async()=>{
 const name='Cafeteira Elétrica Electrolux 600ml Capacidade 15 xicaras Jarra Inox filtro permanente removivel corta pingos função manter aquecido ECM12 - INOX';
 const mock=provider(),db=database();let validations=0,creates=0;
 globalThis.fetch=async(input,options={})=>{
  const path=new URL(input).pathname;
  if(path===`/products/${productId}`){const response=await mock.fetch(input,options);const data=await response.json();return Response.json({...data,name});}
  if(path===`/categories/${categoryId}`){const response=await mock.fetch(input,options);const data=await response.json();return Response.json({...data,settings:{...data.settings,max_title_length:60}});}
  if(path==='/items/validate'){validations++;assert.equal(JSON.parse(options.body).title,name);if(!accepted)return Response.json({message:'Recusa do provedor',error:'validation_error',cause:[{type:'error',code:'item.title.invalid',message:'Título recusado pelo provedor',references:['title']}]},{status:400});}
  if(path==='/items'&&options.method==='POST')creates++;
  return mock.fetch(input,options);
 };
 const send=()=>publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),{ean,productId,categoryId,price:160,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'none',attributes:{}});
 if(accepted)await send();else await assert.rejects(send);
 assert.equal(validations,1);assert.equal(creates,accepted?1:0);
}));

test('publicação de catálogo conclui sem tentar gravar descrição imutável após criar o anúncio',()=>environment(async()=>{
 const mock=provider(),db=database();let descriptions=0;
 globalThis.fetch=async(input,options={})=>{if(new URL(input).pathname===`/items/${itemId}/description`&&options.method==='POST'){descriptions++;return Response.json({message:'Descrição de catálogo não é editável',error:'validation_error'},{status:400});}return mock.fetch(input,options);};
 const result=await publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),{...shippingForm(),description:'Descrição local preservada'});
 assert.equal(descriptions,0);assert.equal(result.status,'published');assert.equal(db.tables.marketplace_publications[0].status,'published');
 assert.equal(db.tables.marketplace_product_links.length,1);
}));

test('anúncio comum continua enviando a descrição local após criar o item',()=>environment(async()=>{
 const local=localFixture(),db=database({marketplace_products:[local]}),mock=provider();globalThis.fetch=mock.fetch;
 const prepared=await prepareLocalProductPublication(db,connection(),local.id);
 const result=await publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),prepared.form);
 assert.equal(result.status,'published');assert.ok(mock.sequence.includes(`POST /items/${itemId}/description`));
}));

for (const userProducts of [false, true]) test(`publicação identifica modelo da conta de destino: ${userProducts ? 'family_name sem title' : 'title sem family_name'}`, () => environment(async () => {
  const mock=provider(),db=database(),bodies=[];const calls=[];
  globalThis.fetch=async(input,options={})=>{
    const path=new URL(input).pathname;calls.push(`${options.method || 'GET'} ${path}`);
    if(path==='/users/230210240')return Response.json({id:230210240,tags:userProducts?['user_product_seller']:['normal']});
    if(path==='/items/validate'||(path==='/items'&&options.method==='POST'))bodies.push({path,body:JSON.parse(options.body)});
    return mock.fetch(input,options);
  };
  // Todos os endpoints são simulados; nenhum anúncio real é publicado.
  await publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),{ean,productId,categoryId,price:160,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'none',attributes:{}});
  assert.equal(bodies.length,2);assert.deepEqual(bodies[0].body,bodies[1].body);
  assert.equal(bodies[0].body[userProducts?'family_name':'title'],'Geladeira Brastemp');
  assert.equal(Object.hasOwn(bodies[0].body,userProducts?'title':'family_name'),false);
  assert.ok(calls.indexOf('GET /users/230210240')<calls.indexOf('POST /items/validate'));
}));

test('cópia de conta legada para conta User Products usa somente family_name no destino, sem criar anúncio',()=>environment(async()=>{
  const source={...connection(),provider:'mercado_livre'},target=copyTarget();const mock=noEanProvider();const db=database({marketplace_connections:[source]});
  const reads=[];
  globalThis.fetch=async(input,options={})=>{
    const path=new URL(input).pathname;reads.push(path);
    if(path==='/users/99887766')return Response.json({id:99887766,tags:['user_product_seller']});
    if(path==='/items/validate'){mock.bodies.push({path,body:JSON.parse(options.body)});return Response.json({message:'Simulated stop before item creation'},{status:400});}
    return mock.fetch(input,options);
  };
  const copied=await prepareMercadoLivreListingCopy(db,source,target,itemId);
  await assert.rejects(publishMercadoLivreCatalog(db,target,'actor',crypto.randomUUID(),copied.form),{code:'invalid_fields'});
  assert.ok(reads.includes('/users/99887766'));assert.equal(reads.includes('/users/230210240'),false);
  const body=mock.bodies.find(row=>row.path==='/items/validate').body;
  assert.equal(body.family_name,'Geladeira Brastemp');assert.equal(Object.hasOwn(body,'title'),false);
  assert.equal(mock.sequence.includes('POST /items'),false);assert.deepEqual(db.tables.marketplace_publications,[]);
}));

test('modelo é relido por conta e por tentativa, sem usar configuração da origem ou cache anterior',()=>environment(async()=>{
  const mock=provider(),db=database();let tagged=false;const seen=[];
  globalThis.fetch=async(input,options={})=>{
    const path=new URL(input).pathname;
    if(path==='/users/230210240'||path==='/users/999')return Response.json({id:path.endsWith('/999')?999:230210240,tags:tagged?['user_product_seller']:[]});
    if(path==='/items/validate'){seen.push(JSON.parse(options.body));return Response.json({cause:[{code:'test.validation',message:'Simulated validation stops before creating an item'}]},{status:400});}
    return mock.fetch(input,options);
  };
  const form={ean,productId,categoryId,price:160,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'none',attributes:{}};
  await assert.rejects(publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),form),{code:'invalid_fields'});
  tagged=true;
  await assert.rejects(publishMercadoLivreCatalog(db,{...connection(),seller_reference:'999'},'actor',crypto.randomUUID(),form),{code:'invalid_fields'});
  await assert.rejects(publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),form),{code:'invalid_fields'});
  assert.equal(seen[0].title,'Geladeira Brastemp');assert.equal(seen[0].family_name,undefined);
  for(const payload of seen.slice(1)){assert.equal(payload.family_name,'Geladeira Brastemp');assert.equal(payload.title,undefined);}
  assert.deepEqual(db.tables.marketplace_publications,[]);assert.deepEqual(db.tables.marketplace_products,[]);
}));

test('identidade/modelo indisponível ou malformado bloqueia antes de validar/criar/gravar e não presume legado',()=>environment(async()=>{
  for(const seller of [{id:999,tags:['user_product_seller']},{id:230210240},{id:230210240,tags:null},{id:230210240,tags:[{}]},null]){
    const mock=provider(),db=database();const posts=[];
    globalThis.fetch=async(input,options={})=>{const path=new URL(input).pathname;if(options.method==='POST')posts.push(path);if(path==='/users/230210240')return seller===null?Response.json({message:'unavailable'},{status:503}):Response.json(seller);return mock.fetch(input,options);};
    await assert.rejects(publishWithoutShippingReview(db,connection(),'actor',crypto.randomUUID(),{ean,productId,categoryId,price:160,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'none',attributes:{}}));
    assert.deepEqual(posts,[]);for(const table of ['marketplace_products','marketplace_publications','marketplace_listings','marketplace_product_links'])assert.deepEqual(db.tables[table],[]);
  }
}));

test('fluxo completo valida antes de criar e registra o anúncio confirmado', () => environment(async () => {
  const mock = provider(); globalThis.fetch = mock.fetch; const db = database();
  const result = await publishMercadoLivreCatalog(db, connection(), 'actor', crypto.randomUUID(), { ean, productId, categoryId, price: 160, stock: 1, listingType: 'gold_special', shippingMode: 'me2', condition: 'new', warrantyType: 'none', description: 'Produto novo.', attributes: {} });
  assert.equal(result.status, 'published'); assert.equal(result.listing.id, itemId);
  assert.ok(mock.sequence.indexOf('POST /items/validate') < mock.sequence.indexOf('POST /items'));
  assert.equal(db.tables.marketplace_publications[0].status, 'published');
  assert.equal(db.tables.marketplace_listings[0].provider_listing_id, itemId);
  assert.equal(db.tables.marketplace_products[0].stock_quantity, 1);
  assert.equal(db.tables.marketplace_publications[0].response_summary.local_product_id, result.localProductId);
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

test('cópia com EAN mantém título, fotos e características do anúncio em vez do catálogo',()=>environment(async()=>{
 const mock=provider();globalThis.fetch=async(input,options)=>{
  const url=new URL(input);
  if(url.pathname===`/items/${itemId}`)return Response.json({...(await (await mock.fetch(input,options)).json()),title:'Título personalizado do vendedor',attributes:[{id:'GTIN',value_name:ean},{id:'BRAND',name:'Marca',value_name:'Marca da origem'},{id:'VOLTAGE',name:'Voltagem',value_id:'127',value_name:'127 V'}]});
  return mock.fetch(input,options);
 };
 const copied=await prepareMercadoLivreListingCopy(database(),connection(),copyTarget(),itemId);
 assert.equal(copied.result.product.name,'Título personalizado do vendedor');
 assert.equal(copied.result.product.description,'Descrição revisável da origem.');
 assert.deepEqual(copied.result.product.pictures,['https://http2.mlstatic.com/origem.jpg']);
 assert.equal(copied.form.attributes.VOLTAGE,'127');assert.equal(copied.form.listingType,'gold_special');assert.equal(copied.form.shippingMode,'me2');assert.equal(copied.form.condition,'new');
 assert.equal(copied.result.product.attributes.find(attribute=>attribute.id==='BRAND').value,'Marca da origem');
 assert.equal(mock.sequence.some(request=>request.startsWith('POST /items')),false);
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

const localFixture = (overrides = {}) => ({ id: '55555555-5555-4555-8555-555555555555', empresa_id: company, name: 'Geladeira local', sku: 'MP-TESTE', ean: null, description: 'Descrição local completa.', pictures: ['https://http2.mlstatic.com/origem.jpg'], category_id: categoryId, catalog_product_id: '', attributes: [{ id: 'BRAND', name: 'Marca', value: 'Brastemp' }], publication_form: { listingType: 'gold_special', shippingMode: 'me2', condition: 'new', warrantyType: 'none', stock: 99 }, price_cents: 17000, stock_quantity: 3, revision: 1, ...overrides });

for(const scenario of ['confirmed','other-company','wrong-ean','wrong-variant','ambiguous','missing-gtin'])test(`cadastro pesquisado recupera catálogo somente com origem/EAN/variante confirmados: ${scenario}`,()=>environment(async()=>{
 const name='Cafeteira Elétrica Electrolux 600ml Capacidade 15 xicaras Jarra Inox filtro permanente removivel corta pingos função manter aquecido ECM12 - INOX';
 const local=localFixture({ean,name,attributes:[{id:'BRAND',value:'Electrolux'},{id:'VOLTAGE',value:'127V'}]});
 const origins=[{empresa_id:scenario==='other-company'?'other':company,product_id:local.id,source_key:`mercado_livre:${productId}`}];
 if(scenario==='ambiguous')origins.push({empresa_id:company,product_id:local.id,source_key:'mercado_livre:MLB12345'});
 const db=database({marketplace_products:[local],marketplace_price_product_sources:origins}),mock=provider();
 globalThis.fetch=async(input,options={})=>{
  const path=new URL(input).pathname;
  const response=await mock.fetch(input,options);
  if(path===`/products/${productId}`){const data=await response.json();return Response.json({...data,name,attributes:[{id:'BRAND',name:'Marca',value_name:'Electrolux'},{id:'VOLTAGE',name:'Voltagem',value_name:scenario==='wrong-variant'?'220V':'127V'},...(scenario==='missing-gtin'?[]:[{id:'GTIN',name:'EAN',value_name:scenario==='wrong-ean'?'7899882306941':ean}])]});}
  return response;
 };
 const prepared=await prepareLocalProductPublication(db,connection(),local.id);
 assert.equal(prepared.result.product.source,scenario==='confirmed'?'mercadolivre_catalog':'local_product');
 assert.equal(prepared.form.productId,scenario==='confirmed'?productId:local.id);
 assert.equal(prepared.result.localProductId,local.id);assert.equal(prepared.form.stock,3);assert.equal(prepared.form.price,153);
 assert.equal(db.tables.marketplace_products[0].catalog_product_id,'','preparar não grava associação nem reescreve cadastro');
 assert.equal(mock.sequence.some(call=>call.startsWith('POST')),false);
 if(scenario==='confirmed'){
  await publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),prepared.form);
  assert.ok(mock.sequence.includes('POST /items/validate'));
  assert.ok(mock.sequence.includes('POST /items'));
  assert.equal(db.tables.marketplace_product_links[0].product_id,local.id,'publicação usa o cadastro existente, sem duplicá-lo');
 }
}));

test('revalidar cópia vinculada não substitui dados do anúncio pelos dados comerciais do cadastro',()=>environment(async()=>{
 const local=localFixture({ean}),source={...connection(),provider:'mercado_livre'};
 const link={id:crypto.randomUUID(),empresa_id:company,product_id:local.id,connection_id:source.id,provider_listing_id:itemId};
 const db=database({marketplace_products:[local],marketplace_product_links:[link],marketplace_connections:[source]});
 const mock=provider();globalThis.fetch=mock.fetch;
 const prepared=await prepareMercadoLivrePublication(db,copyTarget(),{localProductId:local.id,copySource:{connectionId:source.id,listingId:itemId},categoryId});
 assert.equal(prepared.localProductId,local.id);assert.equal(prepared.product.description,'Descrição revisável da origem.');assert.notEqual(prepared.product.description,local.description);
 assert.equal(mock.sequence.some(request=>request.startsWith('POST')),false);
 const withoutLink=database({marketplace_products:[local],marketplace_connections:[source]});
 await assert.rejects(()=>prepareMercadoLivrePublication(withoutLink,copyTarget(),{localProductId:local.id,copySource:{connectionId:source.id,listingId:itemId},categoryId}),{code:'invalid_copy_source'});
}));

for(const scenario of ['unique','ambiguous','different','wrong-total','wrong-echo','missing-model','missing-voltage','wrong-voltage'])test(`catálogo sem GTIN reconfirma origem por EAN e identidade completa: ${scenario}`,()=>environment(async()=>{
 const code='7909569463178';
 const name='Cafeteira Elétrica Electrolux 600ml Capacidade 15 xicaras Jarra Inox filtro permanente removivel corta pingos função manter aquecido ECM12 - INOX';
 const local=localFixture({ean:code,name,attributes:[{id:'BRAND',value:'Electrolux'},{id:'MODEL',value:'ECM12'},{id:'COLOR',value:'Cinza'},{id:'VOLTAGE',value:'127V'}]});
 const db=database({marketplace_products:[local],marketplace_price_product_sources:[{empresa_id:company,product_id:local.id,source_key:`mercado_livre:${productId}`}]}),mock=provider();let searches=0;
 const item={id:productId,name,status:'active',domain_id:'MLB-REFRIGERATORS',attributes:[{id:'BRAND',name:'Marca',value_name:'Electrolux'},...(scenario==='missing-model'?[]:[{id:'MODEL',name:'Modelo',value_name:'ECM12'}]),{id:'COLOR',name:'Cor',value_name:'Cinza'},...(scenario==='missing-voltage'?[]:[{id:'VOLTAGE',name:'Voltagem',value_name:scenario==='wrong-voltage'?'220V':'127V'}])]};
 globalThis.fetch=async(input,options={})=>{
  const url=new URL(input),path=url.pathname;
  if(path==='/products/search'){
   searches++;assert.equal(url.searchParams.get('product_identifier'),code);
   return Response.json({...(scenario==='wrong-echo'?{product_identifier:ean}:{}),paging:{total:scenario==='ambiguous'||scenario==='wrong-total'?2:1},results:scenario==='ambiguous'?[item,{...item,id:'MLB12345'}]:[{...item,...(scenario==='different'?{id:'MLB12345'}:{})}]});
  }
  if(path===`/products/${productId}`)return Response.json(item);
  return mock.fetch(input,options);
 };
 const prepared=await prepareLocalProductPublication(db,connection(),local.id);
 const accepted=scenario==='unique';
 assert.equal(prepared.result.product.source,accepted?'mercadolivre_catalog':'local_product');
 assert.equal(prepared.result.product.name,name);assert.equal(prepared.result.localProductId,local.id);
 assert.equal(db.tables.marketplace_products[0].catalog_product_id,'');assert.equal(mock.sequence.some(call=>call.startsWith('POST')),false);
 if(accepted){await publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),prepared.form);assert.ok(searches>=3,'preparação, frete e envio reconfirmam o EAN');assert.ok(mock.sequence.includes('POST /items/validate'));}
}));

test('cadastro mínimo sem fotos, EAN, categoria ou saldo abre rascunho sem nenhuma escrita', () => environment(async () => {
  const local = localFixture({ pictures: [], ean: null, category_id: '', description: '', stock_quantity: null, price_cents: null, publication_form: {} });
  const db = database({ marketplace_products: [local] }), mock = provider();
  globalThis.fetch = async (input, options) => new URL(input).pathname.includes('/domain_discovery/') ? Response.json([]) : mock.fetch(input, options);
  const prepared = await prepareLocalProductPublication(db, connection(), local.id);
  assert.equal(prepared.result.product.id, local.id);
  assert.equal(prepared.result.localProductId, local.id);
  assert.equal(prepared.form.stock, 0);
  assert.equal(prepared.form.price, 0);
  assert.deepEqual(prepared.result.categories, []);
  assert.equal(db.tables.marketplace_publications.length, 0);
  assert.deepEqual(db.tables.marketplace_products[0], local);
  assert.ok(mock.sequence.every(request => request.startsWith('GET')));
}));

test('cadastro sem categoria recebe sugestões; categoria, foto e EAN completados no rascunho são revalidados', () => environment(async () => {
  const local = localFixture({ pictures: [], ean: null, category_id: '', stock_quantity: 0 });
  const db = database({ marketplace_products: [local] }), mock = provider();
  globalThis.fetch = async (input, options) => new URL(input).pathname.includes('/domain_discovery/') ? Response.json([{ category_id: categoryId, category_name: 'Geladeiras', domain_id: 'MLB-REFRIGERATORS' }]) : mock.fetch(input, options);
  const suggestion = await prepareLocalProductPublication(db, connection(), local.id);
  assert.equal(suggestion.result.categoryId, categoryId);
  assert.equal(suggestion.form.categoryId, categoryId);
  const prepared = await prepareMercadoLivrePublication(db, connection(), { localProductId: local.id, categoryId, pictureUrl: 'https://example.com/nova.jpg', ean });
  assert.equal(prepared.ean, ean);
  assert.equal(prepared.product.pictures[0], 'https://example.com/nova.jpg');
  assert.equal(prepared.categoryId, categoryId);
  assert.deepEqual(db.tables.marketplace_products[0], local);
  assert.ok(mock.sequence.every(request => request.startsWith('GET')));
}));

test('indisponibilidade externa mantém dados locais abertos com bloqueio explícito da publicação', () => environment(async () => {
  const local = localFixture({ category_id: '', pictures: [] }), db = database({ marketplace_products: [local] });
  globalThis.fetch = async () => Response.json({ message: 'Forbidden' }, { status: 403 });
  const prepared = await prepareLocalProductPublication(db, connection(), local.id);
  assert.equal(prepared.form.localProductId, local.id);
  assert.equal(prepared.result.product.name, local.name);
  assert.ok(prepared.result.blockingIssues.length);
  await assert.rejects(() => publishMercadoLivreCatalog(db, connection(), 'actor', crypto.randomUUID(), prepared.form));
  assert.equal(db.tables.marketplace_publications.length, 0);
}));

test('preparar cadastro local relê ficha e quantidade física, sem publicar ou usar estoque antigo da conta', () => environment(async () => {
  const local = localFixture(), db = database({ marketplace_products: [local] });
  const mock = provider(); globalThis.fetch = mock.fetch;
  const result = await prepareLocalProductPublication(db, connection(), local.id);
  assert.equal(result.form.stock, 3); assert.equal(result.form.localProductId, local.id);
  assert.equal(result.form.description, local.description); assert.equal(result.form.ean, '');
  assert.equal(result.result.product.source, 'local_product'); assert.equal(result.result.localProductId, local.id);
  assert.equal(mock.sequence.some(request => request.startsWith('POST')), false);
  await assert.rejects(() => prepareLocalProductPublication(database({ marketplace_products: [{...local, empresa_id:'other'}] }), connection(), local.id), { code:'product_missing' });
}));

test('publicar cadastro local vincula o anúncio e mantém o saldo físico, sem criar outro cadastro', () => environment(async () => {
  const local = localFixture(), db = database({ marketplace_products: [local] });
  const mock = noEanProvider(); globalThis.fetch = mock.fetch;
  const target = copyTarget(); const prepared = await prepareLocalProductPublication(db, target, local.id);
  const result = await publishMercadoLivreCatalog(db, target, 'actor', crypto.randomUUID(), prepared.form);
  assert.equal(result.localProductId, local.id); assert.equal(db.tables.marketplace_products.length,1);
  assert.equal(db.tables.marketplace_products[0].stock_quantity,3);
  assert.equal(db.tables.marketplace_product_links[0].product_id,local.id);
  assert.equal(mock.bodies.find(entry=>entry.path==='/items').body.attributes.some(attr=>attr.id==='GTIN'),false);
}));

test('publicação não cria saldo parcial divergente do estoque central', () => environment(async () => {
  const local = localFixture(), db = database({ marketplace_products: [local] });
  const mock = noEanProvider(); globalThis.fetch = mock.fetch;
  const target = copyTarget(); const prepared = await prepareLocalProductPublication(db, target, local.id);
  await assert.rejects(() => publishMercadoLivreCatalog(db, target, 'actor', crypto.randomUUID(), { ...prepared.form, stock: 1 }), { code: 'physical_stock_changed' });
  assert.equal(mock.sequence.includes('POST /items'), false);
  assert.equal(db.tables.marketplace_products[0].stock_quantity, 3);
}));

test('estoque pendente ou insuficiente impede criação no ML e não altera saldo', () => environment(async () => {
  for (const quantity of [null,0]) {
    const local=localFixture({stock_quantity:quantity}), db=database({marketplace_products:[local]});
    const mock=provider(); globalThis.fetch=mock.fetch;
    const prepared=await prepareLocalProductPublication(db,connection(),local.id);
    await assert.rejects(()=>publishMercadoLivreCatalog(db,connection(),'actor',crypto.randomUUID(),{...prepared.form,stock:1}),{code:quantity==null?'physical_stock_pending':'physical_stock_exceeded'});
    assert.equal(mock.sequence.includes('POST /items'),false); assert.equal(db.tables.marketplace_publications.length,0);
    assert.equal(db.tables.marketplace_products[0].stock_quantity,quantity);
  }
}));

test('variações não são copiadas como um único saldo físico', () => environment(async () => {
  const mock=provider(); globalThis.fetch=async(input,options)=>{
    const response=await mock.fetch(input,options);
    if (new URL(input).pathname===`/items/${itemId}`) return Response.json({...await response.json(),variations:[{id:123}]});
    return response;
  };
  await assert.rejects(()=>prepareMercadoLivreListingCopy(database(),connection(),copyTarget(),itemId),{code:'variants_pending'});
  assert.equal(mock.sequence.some(request=>request.startsWith('POST')),false);
}));

test('consultar ficha completa fotos/descrição sem confirmar estoque e exige vínculo da mesma empresa', () => environment(async () => {
  const local=localFixture({stock_quantity:null,description:'',pictures:[]});
  const source={...connection(),provider:'mercado_livre'};
  const link={empresa_id:company,product_id:local.id,connection_id:source.id,provider_listing_id:itemId,id:crypto.randomUUID()};
  const db=database({marketplace_products:[local],marketplace_product_links:[link],marketplace_connections:[source]});
  const mock=provider(); globalThis.fetch=mock.fetch;
  await refreshLocalProductListing(db,company,'actor',local.id,source.id,itemId,crypto.randomUUID());
  assert.equal(db.tables.marketplace_products[0].stock_quantity,null);
  assert.equal(db.tables.marketplace_products[0].description,'Descrição revisável da origem.');
  assert.deepEqual(db.tables.marketplace_products[0].pictures,['https://http2.mlstatic.com/origem.jpg']);
  assert.equal(mock.sequence.some(request=>request.startsWith('POST')),false);
  const before=mock.sequence.length;
  await assert.rejects(()=>refreshLocalProductListing(database({marketplace_products:[local],marketplace_product_links:[{...link,empresa_id:'other'}]}),company,'actor',local.id,source.id,itemId,crypto.randomUUID()),{code:'listing_missing'});
  assert.equal(mock.sequence.length,before);
}));

test('consulta sem chave do ambiente informa configuração, sem desconectar conta ou inventar ficha', () => environment(async () => {
  const local=localFixture(),db=database({marketplace_products:[local]});
  const mock=provider(); globalThis.fetch=mock.fetch;
  delete process.env.MARKETPLACE_SECRETS_KEY;
  await assert.rejects(()=>refreshLocalProductListing(db,company,'actor',local.id,connectionId,itemId,crypto.randomUUID()),error=>error.code==='local_integration_not_configured' && /continuam conectadas/.test(error.message));
  assert.equal(mock.sequence.length,0); assert.deepEqual(db.tables.marketplace_products,[local]);
}));

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
    const localId = crypto.randomUUID();
    const db = database({ marketplace_connections: [source], marketplace_products: [{ id: localId, empresa_id: company, stock_quantity: 1 }], marketplace_product_links: [{ product_id: localId, connection_id: source.id, provider_listing_id: itemId }], marketplace_listings: [{ empresa_id: company, connection_id: source.id, provider: 'mercado_livre', provider_listing_id: itemId, status: 'active', snapshot: { title: 'Geladeira Brastemp', stock: 1, price: 160, ean: '', category: categoryId, shipping: { mode: 'me2' } } }] });
    const mock = noEanProvider({ traditional }); globalThis.fetch = mock.fetch;
    const copied = await prepareMercadoLivreListingCopy(db, source, target, itemId);
    const result = await publishMercadoLivreCatalog(db, target, 'actor', crypto.randomUUID(), { ...copied.form, price: 170, description: 'Descrição alterada no destino.' });
    assert.equal(result.status, 'published');
    // A importação legada também relê a origem para preencher fotos vazias.
    assert.equal(mock.sequence.filter(request => request === `GET /items/${itemId}`).length, 5);
    assert.deepEqual(db.tables.marketplace_products[0].pictures,['https://http2.mlstatic.com/origem.jpg']);
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

 test('novo anúncio usa Ideal configurado sem substituir referência ou preço de formulário já editado',()=>environment(async()=>{
 const local=localFixture({price_cents:100000,ean:null,category_id:'',pictures:[],publication_form:{}});
 const settings={empresa_id:company,minimum_percent:50,medium_percent:75,ideal_percent:95,theme_mode:'profile',revision:1};
 const db=database({marketplace_products:[local],marketplace_price_settings:[settings]}),mock=provider();
 globalThis.fetch=async(input,options)=>new URL(input).pathname.includes('/domain_discovery/')?Response.json([]):mock.fetch(input,options);
 const first=await prepareLocalProductPublication(db,connection(),local.id);assert.equal(first.form.price,950);assert.equal(first.result.referencePriceCents,100000);
 first.form.price=890;settings.ideal_percent=85;settings.revision=2;
 const next=await prepareLocalProductPublication(db,connection(),local.id);assert.equal(next.form.price,850);assert.equal(first.form.price,890);assert.equal(db.tables.marketplace_products[0].price_cents,100000);
 }));
