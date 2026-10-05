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
    if (url.pathname === '/sites/MLB/search') return { results: [
      { id: 'MLB5000000001', catalog_product_id: productId, currency_id: 'BRL', condition: 'new' },
      { id: 'MLB5000000002', catalog_product_id: productId, currency_id: 'BRL', condition: 'new' },
      { id: 'MLB5000000003', catalog_product_id: productId, currency_id: 'BRL', condition: 'new' },
      { id: 'MLB5000000004', catalog_product_id: 'MLB00000001', currency_id: 'BRL', condition: 'new', price: 1 },
    ] };
    if (url.pathname.endsWith('/MLB5000000001/sale_price')) return { amount: 90 };
    if (url.pathname.endsWith('/MLB5000000002/sale_price')) return { amount: 100 };
    if (url.pathname.endsWith('/MLB5000000003/sale_price')) return { amount: 110 };
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.equal(result.status, 'found');
  assert.deepEqual(result.prices, { market: 100, minimum: 50, medium: 70, ideal: 90 });
  assert.deepEqual(result.sample, { count: 3, minimum: 90, maximum: 110, source: 'active_offers' });
});

test('consulta usa sale_price do item vencedor mesmo quando a ficha possui faixa de preço', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const winnerItemId = 'MLB5000000099';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId, price: 100 }, buy_box_winner_price_range: { min: { price: 80 }, max: { price: 120 } } });
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    if (url.pathname === `/items/${winnerItemId}/sale_price`) {
      assert.equal(url.searchParams.get('context'), 'channel_marketplace');
      return { amount: 109.9 };
    }
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.deepEqual(result.prices, { market: 109.9, minimum: 54.95, medium: 76.93, ideal: 98.91 });
  assert.deepEqual(result.sample, { count: 1, minimum: 109.9, maximum: 109.9, source: 'catalog_reference' });
});

test('consulta usa sale_price do item vencedor quando a ficha não possui faixa de preço', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  const winnerItemId = 'MLB5000000100';
  globalThis.__mlPriceMock = async (path) => {
    const url = new URL(`https://api.mercadolibre.com${path}`);
    if (url.pathname === '/products/search') return { results: [product()] };
    if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId } });
    if (url.pathname === '/sites/MLB/search') return { results: [] };
    if (url.pathname === `/items/${winnerItemId}/sale_price`) {
      assert.equal(url.searchParams.get('context'), 'channel_marketplace');
      return { amount: 160 };
    }
    throw new Error(`Rota inesperada: ${path}`);
  };

  const result = await consultMercadoLivrePrice({}, connection, { ean });
  assert.deepEqual(result.prices, { market: 160, minimum: 80, medium: 112, ideal: 144 });
  assert.deepEqual(result.sample, { count: 1, minimum: 160, maximum: 160, source: 'catalog_reference' });
});

test('consulta não oculta negação de acesso ou limite do Mercado Livre', async () => {
  process.env.MARKETPLACE_SECRETS_KEY = 'configured-for-test';
  for (const [status, code] of [[403, 'provider_403'], [429, 'provider_429']]) {
    const winnerItemId = `MLB5000000${status}`;
    globalThis.__mlPriceMock = async (path) => {
      const url = new URL(`https://api.mercadolibre.com${path}`);
      if (url.pathname === '/products/search') return { results: [product()] };
      if (url.pathname === `/products/${productId}`) return product({ buy_box_winner: { item_id: winnerItemId } });
      if (url.pathname === '/sites/MLB/search') return { results: [] };
      if (url.pathname === `/items/${winnerItemId}/sale_price`) throw new MarketplaceError(status, code, `Erro ${status} visível`);
      throw new Error(`Rota inesperada: ${path}`);
    };

    await assert.rejects(consultMercadoLivrePrice({}, connection, { ean }), (error) => error?.status === status && error?.code === code);
  }
});
