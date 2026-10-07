import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier.endsWith('/management-access') || specifier.endsWith('/management-access.ts') || specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error { constructor(status,code,message,fields){super(message);this.status=status;this.code=code;this.fields=fields;} }', shortCircuit: true };
  if (specifier.endsWith('/mercadolivre-management') || specifier === './mercadolivre-management') return { url: 'data:text/javascript,export async function mlRequest(db,connection,path){return globalThis.__mlPriceMock(path)}', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { calculatePriceSuggestions, consultMercadoLivrePrice } = await import('../../app/modules/marketplaces/services/mercadolivre-price-consultation.ts');
const { consultGoogleShoppingPrices, extractGoogleShoppingPriceSample, extractGoogleShoppingSellerPriceSample } = await import('../../app/modules/marketplaces/services/dataforseo-google-shopping.ts');
const { MarketplaceError } = await import('../../app/modules/marketplaces/services/management-access.ts');
hooks.deregister();

const ean = '7891129598607';
const productId = 'MLB75636839';
const connection = { id: crypto.randomUUID(), empresa_id: crypto.randomUUID() };
const product = (extra = {}) => ({ id: productId, name: 'Fogão de teste', domain_id: 'MLB-STOVES', status: 'active', pictures: [{ secure_url: 'https://http2.mlstatic.com/a.jpg' }], attributes: [], ...extra });

function mockCatalog() {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ short_description: { content: 'Produto localizado' } });
    throw new Error(`A consulta assistida não deve acessar a vitrine pública: ${path}`);
  };
}

function mockPriceProvider({ offers = [
  { title: 'Fogão de teste', seller: 'Loja A', price: 800, url: 'https://loja-a.example/fogao' },
  { title: 'Fogão de teste', seller: 'Loja B', price: 900, url: 'https://loja-b.example/fogao' },
] } = {}) {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.OPENAI_PRICE_SEARCH_MODEL = 'test-search-model';
  globalThis.fetch = async (url, init) => {
    if (String(url) === 'https://api.openai.com/v1/responses') {
      assert.equal(init?.method, 'POST');
      const payload = JSON.parse(String(init?.body));
      globalThis.__openAIPriceRequest = payload;
      return Response.json({ output: [{ content: [{ type: 'output_text', text: JSON.stringify({ offers }) }] }] });
    }
    throw new Error(`URL OpenAI inesperada: ${url}`);
  };
}

async function completeGoogleLookup(input, pendingTaskId) {
  let result = await consultGoogleShoppingPrices(input, pendingTaskId);
  for (let attempt = 0; result.status === 'pending' && attempt < 20; attempt++) {
    result = await consultGoogleShoppingPrices(input, result.taskId);
  }
  return result;
}

test('sugestões aplicam exatamente 50%, 70% e 90% sobre o preço informado', () => {
  assert.deepEqual(calculatePriceSuggestions([10000]), { market: 100, minimum: 50, medium: 70, ideal: 90 });
});

test('referência usa somente a média das cinco menores ofertas válidas', () => {
  assert.deepEqual(
    calculatePriceSuggestions([99900, 10000, 11000, 12000, 13000, 14000]),
    { market: 120, minimum: 60, medium: 84, ideal: 108 },
  );
});

test('consulta identifica o produto e calcula a média sem consultar a vitrine do Mercado Livre', async () => {
  mockCatalog();
  mockPriceProvider();
  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.equal(result.status, 'found');
  assert.equal(result.product?.name, 'Fogão de teste');
  assert.equal(globalThis.__openAIPriceRequest.model, 'test-search-model');
  assert.equal(globalThis.__openAIPriceRequest.tool_choice, 'required');
  assert.equal(globalThis.__openAIPriceRequest.tools[0].type, 'web_search');
  assert.match(globalThis.__openAIPriceRequest.input, /Fogão de teste/);
  assert.deepEqual(result.prices, { market: 850, minimum: 425, medium: 595, ideal: 765 });
  assert.equal(result.sample?.source, 'openai_web_search');
  assert.deepEqual(result.sample?.offers?.map(({ seller, price }) => ({ seller, price })), [{ seller: 'Loja A', price: 800 }, { seller: 'Loja B', price: 900 }]);
});


test('consulta inclui o menor Mercado Livre e o menor Amazon na base da média', async () => {
  mockCatalog();
  mockPriceProvider({ offers: [
    { title: 'Fogão de teste', seller: 'Loja 1', price: 100, url: 'https://um.example/fogao' },
    { title: 'Fogão de teste', seller: 'Loja 2', price: 110, url: 'https://dois.example/fogao' },
    { title: 'Fogão de teste', seller: 'Loja 3', price: 120, url: 'https://tres.example/fogao' },
    { title: 'Fogão de teste', seller: 'Mercado Livre - caro', price: 350, url: 'https://produto.mercadolivre.com.br/MLB-350' },
    { title: 'Fogão de teste', seller: 'Mercado Livre - menor', price: 300, url: 'https://produto.mercadolivre.com.br/MLB-300' },
    { title: 'Fogão de teste', seller: 'Amazon - caro', price: 450, url: 'https://www.amazon.com.br/dp/TEST450' },
    { title: 'Fogão de teste', seller: 'Amazon - menor', price: 400, url: 'https://www.amazon.com.br/dp/TEST400' },
  ] });
  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.match(globalThis.__openAIPriceRequest.input, /Mercado Livre/);
  assert.match(globalThis.__openAIPriceRequest.input, /Amazon Brasil/);
  assert.deepEqual(result.sample?.offers?.map(({ seller, price }) => ({ seller, price })), [
    { seller: 'Loja 1', price: 100 },
    { seller: 'Loja 2', price: 110 },
    { seller: 'Loja 3', price: 120 },
    { seller: 'Mercado Livre - menor', price: 300 },
    { seller: 'Amazon - menor', price: 400 },
  ]);
  assert.deepEqual(result.prices, { market: 206, minimum: 103, medium: 144.2, ideal: 185.4 });
});

test('consulta com IA usa somente as cinco menores ofertas comprovadas', async () => {
  mockCatalog();
  mockPriceProvider({ offers: [
    { title: 'Fogão de teste', seller: 'Loja cara', price: 5_000, url: 'https://cara.example/fogao' },
    { title: 'Fogão de teste', seller: 'Loja 5', price: 500, url: 'https://cinco.example/fogao' },
    { title: 'Fogão de teste', seller: 'Loja 1', price: 100, url: 'https://um.example/fogao' },
    { title: 'Fogão de teste', seller: 'Loja 4', price: 400, url: 'https://quatro.example/fogao' },
    { title: 'Fogão de teste', seller: 'Loja 2', price: 200, url: 'https://dois.example/fogao' },
    { title: 'Fogão de teste', seller: 'Loja 3', price: 300, url: 'https://tres.example/fogao' },
  ] });
  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.equal(result.status, 'found');
  assert.deepEqual(result.prices, { market: 300, minimum: 150, medium: 210, ideal: 270 });
  assert.deepEqual(result.sample?.offers?.map((offer) => offer.price), [100, 200, 300, 400, 500]);
});

test('tarefa Google concluída sem ofertas encerra a consulta em vez de permanecer pendente', async () => {
  process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED = 'true';
  process.env.DATAFORSEO_API_LOGIN = 'test-login';
  process.env.DATAFORSEO_API_PASSWORD = 'test-password';
  process.env.DATAFORSEO_API_BASE_URL = 'https://sandbox.dataforseo.com';
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/products/task_post')) {
      assert.equal(init?.method, 'POST');
      return Response.json({ tasks: [{ id: '33333333-3333-3333-3333-333333333333', status_code: 20100, result: null }] });
    }
    if (String(url).includes('/products/task_get/advanced/')) {
      return Response.json({ tasks: [{ status_code: 20000, result: [] }] });
    }
    throw new Error(`URL DataForSEO inesperada: ${url}`);
  };
  const result = await consultGoogleShoppingPrices({ ean, productName: 'Produto sem ofertas' });
  assert.deepEqual(result, { status: 'completed', sample: null });
});

test('consulta demorada continua na mesma tarefa até receber os preços', async () => {
  process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED = 'true';
  process.env.DATAFORSEO_API_LOGIN = 'test-login';
  process.env.DATAFORSEO_API_PASSWORD = 'test-password';
  process.env.DATAFORSEO_API_BASE_URL = 'https://sandbox.dataforseo.com';
  let productsPosts = 0;
  let infoPosts = 0;
  let productPolls = 0;
  let infoPolls = 0;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/products/task_post')) {
      productsPosts++;
      return Response.json({ tasks: [{ id: '55555555-5555-5555-5555-555555555555', status_code: 20100, result: null }] });
    }
    if (String(url).includes('/products/task_get/advanced/')) {
      productPolls++;
      if (productPolls <= 8) return Response.json({ tasks: [{ status_code: 40602, result: null }] });
      return Response.json({ tasks: [{ status_code: 20000, result: [{ items: [
        { title: 'Fogão de teste', price: 800, currency: 'BRL', product_id: '550011' },
      ] }] }] });
    }
    if (String(url).endsWith('/product_info/task_post')) {
      infoPosts++;
      return Response.json({ tasks: [{ id: '66666666-6666-6666-6666-666666666666', status_code: 20100, result: null }] });
    }
    if (String(url).includes('/product_info/task_get/advanced/')) {
      infoPolls++;
      if (infoPolls <= 8) return Response.json({ tasks: [{ status_code: 40602, result: null }] });
      return Response.json({ tasks: [{ status_code: 20000, result: [{ items: [{ sellers: [
        { product_availability: 'in_stock', price: { current: 790, currency: 'BRL' } },
        { product_availability: 'in_stock', price: { current: 810, currency: 'BRL' } },
      ] }] }] }] });
    }
    throw new Error(`URL DataForSEO inesperada: ${url}`);
  };
  const result = await completeGoogleLookup({ ean, productName: 'Fogão de teste' });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.sample, { pricesInCents: [79000, 80000, 81000], count: 3, minimum: 790, maximum: 810 });
  assert.equal(productsPosts, 1, 'a continuação não pode publicar outra pesquisa de produtos');
  assert.equal(infoPosts, 1, 'a continuação não pode publicar outra pesquisa de vendedores');
});

test('consulta conserva os preços da vitrine quando a ficha de vendedores termina vazia', async () => {
  process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED = 'true';
  process.env.DATAFORSEO_API_LOGIN = 'test-login';
  process.env.DATAFORSEO_API_PASSWORD = 'test-password';
  process.env.DATAFORSEO_API_BASE_URL = 'https://sandbox.dataforseo.com';
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/products/task_post')) return Response.json({ tasks: [{ id: '77777777-7777-7777-7777-777777777777', status_code: 20100, result: null }] });
    if (String(url).includes('/products/task_get/advanced/')) return Response.json({ tasks: [{ status_code: 20000, result: [{ items: [
      { title: 'Fogão de teste', price: 820, currency: 'BRL', product_id: '550011' },
      { title: 'Fogão de teste', price: 780, currency: 'BRL' },
    ] }] }] });
    if (String(url).endsWith('/product_info/task_post')) return Response.json({ tasks: [{ id: '88888888-8888-8888-8888-888888888888', status_code: 20100, result: null }] });
    if (String(url).includes('/product_info/task_get/advanced/')) return Response.json({ tasks: [{ status_code: 40102, result: null }] });
    throw new Error(`URL DataForSEO inesperada: ${url}`);
  };
  const result = await completeGoogleLookup({ ean, productName: 'Fogão de teste' });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.sample, { pricesInCents: [78000, 82000], count: 2, minimum: 780, maximum: 820 });
});

test('consulta combina vitrine e vendedores antes de calcular as cinco menores ofertas', async () => {
  process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED = 'true';
  process.env.DATAFORSEO_API_LOGIN = 'test-login';
  process.env.DATAFORSEO_API_PASSWORD = 'test-password';
  process.env.DATAFORSEO_API_BASE_URL = 'https://sandbox.dataforseo.com';
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/products/task_post')) {
      const payload = JSON.parse(String(init?.body)).at(0);
      assert.equal(payload?.keyword, 'Robô Aspirador Pó Kärcher RCV 2');
      assert.equal(payload?.search_param, '&udm=28');
      assert.equal(payload?.depth, 40);
      return Response.json({ tasks: [{ id: '99999999-9999-9999-9999-999999999999', status_code: 20100, result: null }] });
    }
    if (String(url).includes('/products/task_get/advanced/')) return Response.json({ tasks: [{ status_code: 20000, result: [{ items: [
      { title: 'Robô Aspirador Kärcher RCV 2 Bivolt', price: 579, currency: 'BRL', product_id: 'cheap-rcv2' },
      { title: 'Robô Aspirador Kärcher RCV 2 Bivolt', price: 729.9, currency: 'BRL' },
      { title: 'Robô Aspirador Kärcher RCV 2 Bivolt', price: 899.91, currency: 'BRL' },
      { title: 'Robô Aspirador Kärcher RCV 2 Bivolt', price: 951, currency: 'BRL' },
      { title: 'Robô Aspirador Kärcher RCV 2 Bivolt', price: 2_051.82, currency: 'BRL' },
      // O título completo tem mais palavras coincidentes, porém não deve fazer
      // o detalhamento abandonar a ficha equivalente e mais barata.
      { title: 'Robô Aspirador de Pó Kärcher RCV 2 com Navegação e Controle Remoto – Bivolt.', price: 3_060.05, currency: 'BRL', product_id: 'expensive-rcv2' },
    ] }] }] });
    if (String(url).endsWith('/product_info/task_post')) {
      const payload = JSON.parse(String(init?.body)).at(0);
      assert.equal(payload?.product_id, 'cheap-rcv2');
      return Response.json({ tasks: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', status_code: 20100, result: null }] });
    }
    if (String(url).includes('/product_info/task_get/advanced/')) return Response.json({ tasks: [{ status_code: 20000, result: [{ items: [{ sellers: [
      { product_availability: 'in_stock', price: { current: 3_060.05, currency: 'BRL' } },
      // A mesma oferta pode aparecer nas duas camadas e não deve pesar duas vezes.
      { product_availability: 'in_stock', price: { current: 951, currency: 'BRL' } },
    ] }] }] }] });
    throw new Error(`URL DataForSEO inesperada: ${url}`);
  };
  const result = await completeGoogleLookup({ ean: '7891374302240', productName: 'Robô Aspirador de Pó Kärcher RCV 2 com Navegação e Controle Remoto – Bivolt.' });
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.sample, { pricesInCents: [57900, 72990, 89991, 95100, 205182], count: 5, minimum: 579, maximum: 2051.82 });
  assert.equal(calculatePriceSuggestions(result.sample?.pricesInCents || []).market, 1042.33);
});

test('preço exibido pelo Google prevalece quando o campo numérico do provedor está inconsistente', () => {
  const sample = extractGoogleShoppingSellerPriceSample({ items: [{ sellers: [{
    product_availability: 'in_stock',
    price: { current: 3_060.10, displayed_price: 'R$ 2.631,64', currency: 'BRL' },
  }] }] });
  assert.deepEqual(sample, { pricesInCents: [263164], count: 1, minimum: 2631.64, maximum: 2631.64 });
});

test('resposta Google sem resultados encerra como consulta concluída, sem erro genérico', async () => {
  process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED = 'true';
  process.env.DATAFORSEO_API_LOGIN = 'test-login';
  process.env.DATAFORSEO_API_PASSWORD = 'test-password';
  process.env.DATAFORSEO_API_BASE_URL = 'https://sandbox.dataforseo.com';
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/products/task_post')) return Response.json({ tasks: [{ id: '44444444-4444-4444-4444-444444444444', status_code: 20100, result: null }] });
    if (String(url).includes('/products/task_get/advanced/')) return Response.json({ tasks: [{ status_code: 40102, result: null }] });
    throw new Error(`URL DataForSEO inesperada: ${url}`);
  };
  const result = await consultGoogleShoppingPrices({ ean, productName: 'Produto sem resultados' });
  assert.deepEqual(result, { status: 'completed', sample: null });
});

test('falha de execução do provedor explica a causa sem mascará-la como recusa genérica', async () => {
  process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED = 'true';
  process.env.DATAFORSEO_API_LOGIN = 'test-login';
  process.env.DATAFORSEO_API_PASSWORD = 'test-password';
  process.env.DATAFORSEO_API_BASE_URL = 'https://sandbox.dataforseo.com';
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/products/task_post')) return Response.json({ tasks: [{ status_code: 40103, result: null }] });
    throw new Error(`URL DataForSEO inesperada: ${url}`);
  };
  await assert.rejects(consultGoogleShoppingPrices({ ean, productName: 'Produto com falha transitória' }), (error) => error instanceof MarketplaceError && error.code === 'price_provider_task_failed' && /não conseguiu concluir/i.test(error.message));
});

test('EAN fora do catálogo público usa o cadastro do perfil para iniciar a consulta assistida', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  mockPriceProvider({ offers: [] });
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [] };
    throw new Error(`Não deve consultar vitrine nem ficha pública: ${path}`);
  };
  const profileProductId = crypto.randomUUID();
  const db = {
    from(table) {
      if (table === 'vendas_mobile_catalogos') return {
        select() { return this; },
        eq() { return this; },
        order() { return Promise.resolve({ data: [{ id: crypto.randomUUID(), padrao: true }], error: null }); },
      };
      if (table === 'vendas_mobile_catalogo_produtos') return {
        select() { return this; },
        in() { return this; },
        eq() { return Promise.resolve({ data: [{ id: profileProductId, nome: 'Bóra London Dry Gin 700 ml', marca: 'Bóra', codigo_barras: ean }], error: null }); },
      };
      throw new Error(`Tabela inesperada: ${table}`);
    },
  };
  const result = await consultMercadoLivrePrice(db, connection, { ean });
  assert.equal(result.status, 'found');
  assert.equal(result.product?.id, `PROFILE:${profileProductId}`);
  assert.equal(result.product?.name, 'Bóra London Dry Gin 700 ml');
  assert.equal(result.prices, undefined);
});

test('preço informado gera sugestões e identifica a fonte manual', async () => {
  mockCatalog();
  const result = await consultMercadoLivrePrice({}, connection, { ean, manualPrice: 319.9 });
  assert.deepEqual(result.prices, { market: 319.9, minimum: 159.95, medium: 223.93, ideal: 287.91 });
  assert.deepEqual(result.sample, { count: 1, minimum: 319.9, maximum: 319.9, source: 'manual_reference' });
});

test('preço manual inválido é recusado sem salvar referência', async () => {
  mockCatalog();
  await assert.rejects(consultMercadoLivrePrice({}, connection, { ean, manualPrice: 0 }), (error) => error instanceof MarketplaceError && error.code === 'invalid_manual_price');
});

test('amostra Google Shopping aceita somente valores em reais do produto correspondente', () => {
  const sample = extractGoogleShoppingPriceSample({ tasks: [{ result: [{ items: [
    { title: 'Gin Bóra London Dry 700 ml', price: 125, currency: 'BRL' },
    { title: 'Gin Bóra London Dry 700 ml', price: 150.5, currency: 'BRL' },
    { title: 'Gin sem relação', price: 1, currency: 'BRL' },
    { title: 'Gin Bóra London Dry 700 ml', price: 200, currency: 'USD' },
  ] }] }] }, 'Gin Bóra London Dry 700 ml', '7890000000000');
  assert.deepEqual(sample, { pricesInCents: [12500, 15050], count: 2, minimum: 125, maximum: 150.5 });
});

test('amostra Google Shopping descarta ofertas altas após selecionar as cinco menores', () => {
  const sample = extractGoogleShoppingPriceSample({ tasks: [{ result: [{ items: [
    { title: 'Gin Bóra London Dry 700 ml', price: 100, currency: 'BRL' },
    { title: 'Gin Bóra London Dry 700 ml', price: 110, currency: 'BRL' },
    { title: 'Gin Bóra London Dry 700 ml', price: 120, currency: 'BRL' },
    { title: 'Gin Bóra London Dry 700 ml', price: 130, currency: 'BRL' },
    { title: 'Gin Bóra London Dry 700 ml', price: 140, currency: 'BRL' },
    { title: 'Gin Bóra London Dry 700 ml', price: 999, currency: 'BRL' },
  ] }] }] }, 'Gin Bóra London Dry 700 ml', '7890000000000');
  assert.deepEqual(sample, { pricesInCents: [10000, 11000, 12000, 13000, 14000], count: 5, minimum: 100, maximum: 140 });
});

test('amostra Google Shopping usa preço atual dos vendedores e ignora preço regular, indisponível e acima da faixa', () => {
  const sample = extractGoogleShoppingPriceSample({ tasks: [{ result: [{ items: [{
    title: 'Robô Aspirador Kärcher RCV 2 Bivolt',
    sellers: [
      { title: 'Loja oficial', product_availability: 'in_stock', price: { current: 999.9, regular: 2_000, currency: 'BRL' } },
      { title: 'Loja A', product_availability: 'in_stock', price: { current: 1_100, regular: 1_820, currency: 'BRL' } },
      { title: 'Loja B', product_availability: 'limited_stock', price: { current: 1_142.1, currency: 'BRL' } },
      { title: 'Loja C', product_availability: 'in_stock', price: { current: 1_190.41, currency: 'BRL' } },
      { title: 'Loja D', product_availability: 'in_stock', price: { current: 1_200, currency: 'BRL' } },
      { title: 'Loja cara', product_availability: 'in_stock', price: { current: 1_820, currency: 'BRL' } },
      { title: 'Sem estoque', product_availability: 'out_of_stock', price: { current: 850, currency: 'BRL' } },
    ],
  }] }] }] }, 'Robô Aspirador Kärcher RCV 2 Bivolt');
  assert.deepEqual(sample, { pricesInCents: [99990, 110000, 114210, 119041, 120000], count: 5, minimum: 999.9, maximum: 1200 });
  assert.equal(calculatePriceSuggestions(sample?.pricesInCents || []).market, 1126.48);
});

test('amostra Google Shopping reconhece um modelo presente em título comercial mais curto', () => {
  const sample = extractGoogleShoppingPriceSample({ tasks: [{ result: [{ items: [
    { title: 'Micro-ondas Electrolux ME20B 20L Branco', price: 599.9, currency: 'BRL' },
  ] }] }] }, 'Micro-ondas Electrolux Efficient 20L Branco Função Descongelar e Receitas Pré-Programadas (ME20B)', '7909569511480');
  assert.deepEqual(sample, { pricesInCents: [59990], count: 1, minimum: 599.9, maximum: 599.9 });
});

test('amostra Google Shopping reconhece SKU com barra mesmo quando a vitrine remove a pontuação', () => {
  const sample = extractGoogleShoppingPriceSample({ tasks: [{ result: [{ items: [
    { title: 'Cafeteira Tramontina Breville Express 69065011 127V', price: 4_734.68, currency: 'BRL' },
  ] }] }] }, 'CAFETEIRA ELÉTRICA TRAMONTINA BY BREVILLE EXPRESS AÇO INOX 1,8L 127V 69065/011');
  assert.deepEqual(sample, { pricesInCents: [473468], count: 1, minimum: 4734.68, maximum: 4734.68 });
});

test('amostra de vendedores usa a ficha selecionada mesmo com título resumido', () => {
  const sample = extractGoogleShoppingSellerPriceSample({ tasks: [{ result: [{ items: [{
    title: 'Ficha Google Shopping',
    sellers: [
      { product_availability: 'in_stock', price: { current: 4_166.55, currency: 'BRL' } },
      { product_availability: 'in_stock', price: { current: 4_734.68, currency: 'BRL' } },
      { product_availability: 'out_of_stock', price: { current: 100, currency: 'BRL' } },
    ],
  }] }] }] });
  assert.deepEqual(sample, { pricesInCents: [416655, 473468], count: 2, minimum: 4166.55, maximum: 4734.68 });
});
