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

test('sugestões aplicam exatamente 50%, 70% e 90% sobre o preço informado', () => {
  assert.deepEqual(calculatePriceSuggestions([10000]), { market: 100, minimum: 50, medium: 70, ideal: 90 });
});

test('consulta identifica o produto sem automatizar leitura da vitrine', async () => {
  mockCatalog();
  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.equal(result.status, 'found');
  assert.equal(result.product?.name, 'Fogão de teste');
  assert.equal(result.prices, undefined);
  assert.match(result.notice || '', /busca pública/i);
});

test('EAN fora do catálogo público usa o cadastro do perfil para iniciar a consulta assistida', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
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
