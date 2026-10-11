import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '../..');
const state = { db: null };
globalThis.__listingDateOrderTest = state;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'next/server') return { url: 'data:text/javascript,export const NextResponse={json:(data,options)=>Response.json(data,options)}', shortCircuit: true };
    if (specifier.endsWith('/management-access')) return { url: `data:text/javascript,${encodeURIComponent('export async function authorizeMarketplace(request,empresaId){return {db:globalThis.__listingDateOrderTest.db,empresaId};} export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;}} export function managementFailure(error){return Response.json({message:error.message},{status:error.status||500});}')}`, shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: pathToFileURL(resolve(root, `${specifier.slice(2)}.ts`)).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith(pathToFileURL(root).href) && url.endsWith('.ts')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText };
    return next(url, context);
  },
});
const { GET } = await import('../../app/api/modulos/marketplaces/anunciados/route.ts');
hooks.deregister();

const company = '11111111-1111-4111-8111-111111111111';
const account = '22222222-2222-4222-8222-222222222222';
function database() {
  const rows = Array.from({ length: 57 }, (_, i) => ({ empresa_id: company, connection_id: account, provider_listing_id: `MLB${100000 + i}`, status: 'active', search_text: 'produto', snapshot: { createdAt: new Date(Date.UTC(2026, 8, i + 1)).toISOString() } }));
  rows.push({ ...rows[0], empresa_id: 'outra-empresa', provider_listing_id: 'MLB999999', snapshot: { createdAt: '2099-01-01T00:00:00Z' } });
  rows.push({ ...rows[0], connection_id: 'outra-conta', provider_listing_id: 'MLB999998', snapshot: { createdAt: '2099-01-01T00:00:00Z' } });
  const calls = [];
  return { calls, from(table) {
    assert.equal(table, 'marketplace_listings');
    const filters = [], orders = [];
    let range;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      ilike(key, value) { filters.push((row) => row[key].includes(value.slice(1, -1))); return query; },
      order(key, options = { ascending: true }) { orders.push({ key, ...options }); calls.push(['order', key, options]); return query; },
      range(start, end) { range = [start, end]; calls.push(['range', start, end]); return query; },
      then(callback) {
        const matched = rows.filter((row) => filters.every((filter) => filter(row))).sort((a, b) => {
          for (const { key, ascending } of orders) {
            const left = key === 'snapshot->>createdAt' ? a.snapshot.createdAt : a[key];
            const right = key === 'snapshot->>createdAt' ? b.snapshot.createdAt : b[key];
            if (left !== right) return left.localeCompare(right) * (ascending ? 1 : -1);
          }
          return 0;
        });
        return Promise.resolve(callback({ data: matched.slice(range[0], range[1] + 1).map(({ snapshot, status }) => ({ snapshot, status })), count: matched.length, error: null }));
      },
    };
    return query;
  } };
}

test('API ordena todos os anúncios antes da paginação, nos dois sentidos e sem cruzar empresa/conta', async () => {
  for (const order of ['asc', 'desc']) {
    const db = database(); state.db = db;
    const request = (page) => new Request(`https://example.test/api/modulos/marketplaces/anunciados?empresaId=${company}&connectionId=${account}&order=${order}&page=${page}&q=produto&status=active`);
    const pages = [];
    for (const page of [1, 2, 3]) {
      const response = await GET(request(page));
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.total, 57); assert.equal(payload.page, page);
      pages.push(...payload.listings.map((row) => row.snapshot.createdAt));
    }
    assert.equal(new Set(pages).size, 57);
    assert.deepEqual(pages, [...pages].sort((a, b) => a.localeCompare(b) * (order === 'asc' ? 1 : -1)));
    assert.deepEqual(db.calls[0], ['order', 'snapshot->>createdAt', { ascending: order === 'asc', nullsFirst: false }]);
    assert.equal(db.calls[2][0], 'range');
  }
});

test('API rejeita conta inválida antes de consultar e usa ordem recente para parâmetro desconhecido', async () => {
  state.db = database();
  const invalid = await GET(new Request(`https://example.test/api?empresaId=${company}&connectionId=invalid`));
  assert.equal(invalid.status, 400); assert.equal(state.db.calls.length, 0);
  const response = await GET(new Request(`https://example.test/api?empresaId=${company}&connectionId=${account}&order=title`));
  assert.equal(response.status, 200);
  assert.equal(state.db.calls[0][2].ascending, false);
});
