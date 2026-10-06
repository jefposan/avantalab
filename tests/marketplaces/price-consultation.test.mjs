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
const { extractGoogleShoppingPriceSample } = await import('../../app/modules/marketplaces/services/dataforseo-google-shopping.ts');
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

function mockPriceProvider() {
  process.env.DATAFORSEO_PRICE_LOOKUP_ENABLED = 'true';
  process.env.DATAFORSEO_API_LOGIN = 'test-login';
  process.env.DATAFORSEO_API_PASSWORD = 'test-password';
  process.env.DATAFORSEO_API_BASE_URL = 'https://sandbox.dataforseo.com';
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/task_post')) {
      assert.equal(init?.method, 'POST');
      return Response.json({ tasks: [{ id: '11111111-1111-1111-1111-111111111111', status_code: 20100, result: null }] });
    }
    if (String(url).includes('/task_get/advanced/')) return Response.json({ tasks: [{ status_code: 20000, result: [{ items: [
      { title: 'Fogão de teste', price: 800, currency: 'BRL' },
      { title: 'Fogão de teste 4 bocas', price: 900, currency: 'BRL' },
      { title: 'Produto não relacionado', price: 1, currency: 'BRL' },
    ] }] }] });
    throw new Error(`URL DataForSEO inesperada: ${url}`);
  };
}

test('sugestões aplicam exatamente 50%, 70% e 90% sobre o preço informado', () => {
  assert.deepEqual(calculatePriceSuggestions([10000]), { market: 100, minimum: 50, medium: 70, ideal: 90 });
});

test('consulta identifica o produto e calcula a média sem consultar a vitrine do Mercado Livre', async () => {
  mockCatalog();
  mockPriceProvider();
  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.equal(result.status, 'found');
  assert.equal(result.product?.name, 'Fogão de teste');
  assert.deepEqual(result.prices, { market: 850, minimum: 425, medium: 595, ideal: 765 });
  assert.deepEqual(result.sample, { count: 2, minimum: 800, maximum: 900, source: 'google_shopping' });
});

test('EAN fora do catálogo público usa o cadastro do perfil para iniciar a consulta assistida', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  mockPriceProvider();
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
