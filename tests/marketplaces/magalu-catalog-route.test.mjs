import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../..');
const moduleUrl = source => `data:text/javascript,${encodeURIComponent(source)}`;
const management = moduleUrl(`
  export class MarketplaceError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
  export const authorizeMarketplace = (...args) => globalThis.catalogAuthorize(...args);
  export const managementFailure = error => Response.json({ code: error.code || 'integration_unavailable', message: error.message }, { status: error.status || 503, headers: { 'Cache-Control': 'no-store' } });
`);
const requestService = moduleUrl(`
  export const loadMagaluConnection = (...args) => globalThis.catalogLoadConnection(...args);
  export const magaluRequest = (...args) => globalThis.catalogRequest(...args);
`);
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'next/server') return { url: moduleUrl('export class NextResponse extends Response { static json(value, options) { return new NextResponse(JSON.stringify(value), options); } }'), shortCircuit: true };
  if (specifier.endsWith('/services/management-access')) return { url: management, shortCircuit: true };
  if (specifier.endsWith('/services/magalu-request')) return { url: requestService, shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { GET } = await import('../../app/api/modulos/marketplaces/conexoes/magalu/anuncios/route.ts');
const { MarketplaceError } = await import(management);
hooks.deregister();

const company = '11111111-1111-4111-8111-111111111111';
const connection = '22222222-2222-4222-8222-222222222222';
const url = `https://avantalab.com.br/api/modulos/marketplaces/conexoes/magalu/anuncios?empresaId=${company}&connectionId=${connection}`;
const page = results => ({ results, meta: { page: { count: results.length, limit: 1, offset: 0 }, links: { next: null } } });
const db = {};

test.beforeEach(() => {
  globalThis.catalogAuthorize = async (_request, id) => { assert.equal(id, company); return { db, empresaId: company }; };
  globalThis.catalogLoadConnection = async (receivedDb, id, accountId) => {
    assert.equal(receivedDb, db); assert.equal(id, company); assert.equal(accountId, connection);
    return { id: connection, empresa_id: company, provider: 'magalu' };
  };
  globalThis.catalogRequest = async (_db, account, path) => {
    assert.equal(account.id, connection);
    assert.equal(path, '/seller/v1/portfolios/skus?_limit=1&_offset=0');
    return page([]);
  };
});
test.afterEach(() => {
  delete globalThis.catalogAuthorize;
  delete globalThis.catalogLoadConnection;
  delete globalThis.catalogRequest;
});

test('a API autenticada confirma vazio somente após consulta válida da conta selecionada', async () => {
  const response = await GET(new Request(url));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const body = await response.json();
  assert.equal(body.status, 'empty');
  assert.ok(Date.parse(body.checkedAt));
  globalThis.catalogRequest = async () => ({ results: null, meta: { page: { count: 0, limit: 1, offset: 0 }, links: { next: null } } });
  assert.equal((await (await GET(new Request(url))).json()).status, 'empty');
  globalThis.catalogRequest = async () => page([{ sku: 'SKU-1' }]);
  assert.equal((await (await GET(new Request(url))).json()).status, 'has_skus');
});

test('403, conta fora da empresa e resposta incompleta nunca viram catálogo vazio', async () => {
  globalThis.catalogRequest = async () => { throw new MarketplaceError(403, 'magalu_403', 'Consulta negada.'); };
  let response = await GET(new Request(url));
  assert.equal(response.status, 403); assert.equal((await response.json()).code, 'magalu_403');
  globalThis.catalogLoadConnection = async () => { throw new MarketplaceError(404, 'account_not_found', 'Conta não encontrada.'); };
  response = await GET(new Request(url));
  assert.equal(response.status, 404); assert.equal((await response.json()).code, 'account_not_found');
  globalThis.catalogLoadConnection = async () => ({ id: connection });
  globalThis.catalogRequest = async () => ({ results: null });
  response = await GET(new Request(url));
  assert.equal(response.status, 503); assert.equal((await response.json()).code, 'magalu_catalog_response');
});
