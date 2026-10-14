import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../..');
const company = '11111111-1111-4111-8111-111111111111';
const connectionId = '22222222-2222-4222-8222-222222222222';
const categoryId = '33333333-3333-4333-8333-333333333333';
const productId = '44444444-4444-4444-8444-444444444444';
const requestKey = '55555555-5555-4555-8555-555555555555';
const channel = '9fe0d853-732b-4e4a-a0b0-cff988ed043d';
const requests = [];
let visibleSku = false, visiblePrice = false, visibleStock = false, skuStatus = 'DRAFT';
globalThis.__magaluTest = {
  product: { id: productId, revision: 1, sku: 'SKU-TESTE', ean: '7891234567895', stock_quantity: 5, pictures: ['https://example.com/foto.jpg'] },
  async request(_db, _connection, method, path, body) {
    requests.push({ method, path, body });
    if (path.includes('/category?')) return { status: 200, data: { id: categoryId, name: 'Camisetas', path: 'Moda/Camisetas' } };
    if (path.includes('/category/hierarchy?')) return { status: 200, data: { results: [] } };
    if (path.includes('/category/') && (path.includes('/attributes') || path.includes('/datasheet'))) return { status: 200, data: { results: [] } };
    if (method === 'GET' && path.includes('/skus/')) return visibleSku
      ? { status: 200, data: { sku: 'SKU-TESTE', channels: [{ id: channel }], status: skuStatus } } : { status: 404, data: null };
    if (method === 'GET' && path.includes('/prices/')) return visiblePrice
      ? { status: 200, data: { results: [{ channel: { id: channel }, price: 1990, currency: 'BRL' }] } } : { status: 404, data: null };
    if (method === 'GET' && path.includes('/stocks/')) return visibleStock
      ? { status: 200, data: { results: [{ channel: { id: channel }, type: 'AVAILABLE', quantity: 2 }] } } : { status: 404, data: null };
    if (method === 'POST') return { status: 202, data: { trace_id: requestKey } };
    throw new Error(`Unexpected ${method} ${path}`);
  },
};
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message,fields){super(message);this.status=status;this.code=code;this.fields=fields}}', shortCircuit: true };
  if (specifier === './local-products') return { url: 'data:text/javascript,export async function getLocalProduct(){return globalThis.__magaluTest.product}', shortCircuit: true };
  if (specifier === './magalu-request') return { url: 'data:text/javascript,export async function loadMagaluCatalogConnection(){return {id:"22222222-2222-4222-8222-222222222222"}}; export async function magaluCatalogRequest(...args){return globalThis.__magaluTest.request(...args)}', shortCircuit: true };
  if (specifier === './listing-model') return { url: 'data:text/javascript,export const objectValue=value=>value&&typeof value==="object"&&!Array.isArray(value)?value:{}; export const uuidIsValid=value=>typeof value==="string"&&/^[a-f0-9-]{36}$/i.test(value)', shortCircuit: true };
  let path;
  if (specifier.startsWith('@/')) path = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) path = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (path && existsSync(`${path}.ts`)) return next(pathToFileURL(`${path}.ts`).href, context);
  return next(specifier, context);
} });
const { createMagaluPublication, continueMagaluPublication } = await import('../../app/modules/marketplaces/services/magalu-publication.ts');
hooks.deregister();

class Query {
  constructor(db) { this.db = db; this.predicates = []; }
  select() { return this; }
  eq(key, value) { this.predicates.push(row => row[key] === value); return this; }
  filter(key, operation, value) { assert.equal(operation, 'eq'); this.predicates.push(row => JSON.stringify(row[key]) === value); return this; }
  order() { return this; }
  limit() { return this; }
  insert(value) { this.add = value; return this; }
  update(value) { this.change = value; return this; }
  maybeSingle() { return this.execute(true); }
  execute(single) {
    if (this.add) { const row = { id: requestKey, ...structuredClone(this.add) }; this.db.rows.push(row); return Promise.resolve({ data: row, error: null }); }
    const selected = this.db.rows.filter(row => this.predicates.every(predicate => predicate(row)));
    if (this.change) selected.forEach(row => Object.assign(row, structuredClone(this.change)));
    return Promise.resolve({ data: single ? structuredClone(selected[0] || null) : structuredClone(selected), error: null });
  }
  then(ok, fail) { return this.execute(false).then(ok, fail); }
}
const db = { rows: [], from(table) { assert.equal(table, 'marketplace_publications'); return new Query(this); } };
const form = { productId, revision: 1, categoryId, sku: 'SKU-TESTE', title: 'Camiseta teste', brand: 'Avanta', description: 'Descrição de teste',
  ean: '7891234567895', imageUrl: 'https://example.com/foto.jpg', condition: 'NEW', priceCents: 1990, stock: 2,
  productHeight: 10, productWidth: 10, productLength: 10, productWeight: 100,
  packageHeight: 12, packageWidth: 12, packageLength: 12, packageWeight: 120, attributes: {}, datasheet: {} };

test('202 do Magalu não publica: SKU, preço e estoque avançam somente após GET confirmar', async () => {
  let progress = await createMagaluPublication(db, company, connectionId, productId, requestKey, form);
  assert.equal(progress.status, 'publishing');
  assert.equal(progress.stage, 'sku_accepted');
  assert.deepEqual(requests.filter(row => row.method === 'POST').map(row => row.path), ['/seller/v1/portfolios/skus']);
  progress = await continueMagaluPublication(db, company, connectionId, requestKey);
  assert.equal(progress.stage, 'sku_accepted');
  visibleSku = true;
  progress = await continueMagaluPublication(db, company, connectionId, requestKey);
  assert.equal(progress.stage, 'price_accepted');
  progress = await continueMagaluPublication(db, company, connectionId, requestKey);
  assert.equal(progress.stage, 'price_accepted');
  visiblePrice = true;
  progress = await continueMagaluPublication(db, company, connectionId, requestKey);
  assert.equal(progress.stage, 'stock_accepted');
  visibleStock = true;
  progress = await continueMagaluPublication(db, company, connectionId, requestKey);
  assert.equal(progress.status, 'publishing');
  skuStatus = 'PUBLISHED';
  progress = await continueMagaluPublication(db, company, connectionId, requestKey);
  assert.equal(progress.status, 'published');
  assert.deepEqual(requests.filter(row => row.method === 'POST').map(row => row.path),
    ['/seller/v1/portfolios/skus', '/seller/v1/portfolios/prices/SKU-TESTE', '/seller/v1/portfolios/stocks/SKU-TESTE']);
});
