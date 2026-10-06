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

test('sugestões aplicam exatamente 50%, 70% e 90% sobre a média', () => {
  assert.deepEqual(calculatePriceSuggestions([9000, 10000, 11000]), { market: 100, minimum: 50, medium: 70, ideal: 90 });
});

test('consulta por EAN reutiliza a ficha e calcula a média apenas com ofertas ativas equivalentes', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') {
      assert.equal(url.searchParams.get('product_identifier'), ean);
      return { results: [product()] };
    }
    if (url.pathname === `/products/${productId}`) return product({ short_description: { content: 'Produto localizado' } });
    if (url.pathname === '/sites/MLB/search' && url.searchParams.get('q') === 'Fogão de teste') return { results: [
      { id: 'MLB5000000001', catalog_product_id: 'MLB99999991', title: 'Fogão de teste 4 bocas', currency_id: 'BRL', condition: 'new', price: 90 },
      { id: 'MLB5000000002', catalog_product_id: 'MLB99999992', title: 'Fogão de teste com forno', currency_id: 'BRL', condition: 'new', price: 100 },
      { id: 'MLB5000000003', catalog_product_id: 'MLB99999993', title: 'Fogão de teste inox', currency_id: 'BRL', condition: 'new', price: 110 },
      { id: 'MLB5000000004', catalog_product_id: 'MLB00000001', title: 'Produto sem relação', currency_id: 'BRL', condition: 'new', price: 1 },
    ] };
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.equal(result.status, 'found');
  assert.deepEqual(result.prices, { market: 100, minimum: 50, medium: 70, ideal: 90 });
  assert.deepEqual(result.sample, { count: 3, minimum: 90, maximum: 110, source: 'active_offers' });
});

test('consulta por EAN inclui anúncio normal retornado pela vitrine pública', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const itemId = 'MLB5000000098';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product();
    if (url.pathname === '/sites/MLB/search' && url.searchParams.get('q') === 'Fogão de teste') return { results: [] };
    if (url.pathname === '/sites/MLB/search' && url.searchParams.get('q') === ean) return { results: [{ id: itemId, currency_id: 'BRL', condition: 'new', price: 319.9 }] };
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.deepEqual(result.prices, { market: 319.9, minimum: 159.95, medium: 223.93, ideal: 287.91 });
  assert.deepEqual(result.sample, { count: 1, minimum: 319.9, maximum: 319.9, source: 'active_offers' });
});

test('consulta usa o preço público do anúncio vencedor sem depender da faixa da ficha', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const winnerItemId = 'MLB5000000099';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId, price: 100 }, buy_box_winner_price_range: { min: { price: 80 }, max: { price: 120 } } });
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.deepEqual(result.prices, { market: 100, minimum: 50, medium: 70, ideal: 90 });
  assert.deepEqual(result.sample, { count: 1, minimum: 100, maximum: 100, source: 'catalog_reference' });
});

test('consulta busca o preço público do item vencedor quando a ficha não o traz', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const winnerItemId = 'MLB5000000100';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId } });
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    if (url.pathname === `/items/${winnerItemId}`) return { id: winnerItemId, price: 160, currency_id: 'BRL' };
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.deepEqual(result.prices, { market: 160, minimum: 80, medium: 112, ideal: 144 });
  assert.deepEqual(result.sample, { count: 1, minimum: 160, maximum: 160, source: 'catalog_reference' });
});

test('consulta nunca chama a cotação restrita quando o anúncio vencedor já expõe preço público', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const winnerItemId = 'MLB5000000403';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId, price: 110 }, buy_box_winner_price_range: { min: { price: 100 }, max: { price: 120 } } });
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    if (url.pathname.includes('sale_price')) throw new Error('sale_price não deve ser chamado');
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.deepEqual(result.prices, { market: 110, minimum: 55, medium: 77, ideal: 99 });
  assert.deepEqual(result.sample, { count: 1, minimum: 110, maximum: 110, source: 'catalog_reference' });
  assert.equal(result.notice, undefined);
});

test('restrição pontual do item retorna preço indisponível, não erro de permissão', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const winnerItemId = 'MLB5000000404';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId } });
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    if (url.pathname === `/items/${winnerItemId}`) throw new MarketplaceError(403, 'provider_403', 'Erro 403 visível');
    throw new Error(`Rota inesperada: ${path}`);
  };

  await assert.rejects(consultMercadoLivrePrice({}, connection, { ean }), (error) => error?.status === 409 && error?.code === 'price_unavailable');
});

test('consulta mantém limite 429 visível ao consultar o anúncio vencedor', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const winnerItemId = 'MLB5000000429';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId } });
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    if (url.pathname === `/items/${winnerItemId}`) throw new MarketplaceError(429, 'provider_429', 'Erro 429 visível');
    throw new Error(`Rota inesperada: ${path}`);
  };

  await assert.rejects(consultMercadoLivrePrice({}, connection, { ean }), (error) => error?.status === 429 && error?.code === 'provider_429');
});

test('consulta usa os preços retornados pela busca pública autenticada para o EAN', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product();
    if (url.pathname === '/sites/MLB/search' && url.searchParams.get('q') === ean) return { results: [
      { id: 'MLB5000000701', currency_id: 'BRL', condition: 'new', status: 'active', price: 180 },
      { id: 'MLB5000000702', currency_id: 'BRL', condition: 'new', status: 'active', price: 220 },
      { id: 'MLB5000000703', currency_id: 'BRL', condition: 'used', status: 'active', price: 10 },
    ] };
    throw new Error(`A busca auxiliar não deveria ser chamada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.deepEqual(result.prices, { market: 200, minimum: 100, medium: 140, ideal: 180 });
  assert.deepEqual(result.sample, { count: 2, minimum: 180, maximum: 220, source: 'active_offers' });
});
