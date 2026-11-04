import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { magaluCatalogPresence } = await import('../../app/modules/marketplaces/magalu-catalog-presence.ts');
const { MAGALU_CATALOG_MESSAGES } = await import('../../app/marketplaces/magalu-catalog-state.ts');
hooks.deregister();

const page = (results, count = results?.length ?? 0, next = null, offset = 0) => ({
  results, meta: { page: { offset, count, limit: 1 }, links: { next } },
});

test('Magalu vazio só é afirmado após primeira página íntegra e sem próxima página', () => {
  assert.equal(magaluCatalogPresence(page([])), 'empty');
  assert.equal(magaluCatalogPresence(page(null, 0)), 'empty');
  assert.equal(magaluCatalogPresence(page([{ sku: 'SKU-1' }])), 'has_skus');
  assert.equal(magaluCatalogPresence({ results: [] }), 'empty');
  assert.equal(magaluCatalogPresence({ results: [], meta: { page: { offset: 0, count: 0 } } }), 'empty');
  assert.equal(magaluCatalogPresence({ results: null, meta: { page: { offset: 0, total: 0 } } }), 'empty');
  for (const result of [page([], 1), page([], 0, '/seller/v1/portfolios/skus?_offset=1'), page([], 0, null, 1), page(null, 1),
    { results: [], meta: { page: { total: 1 } } }, { results: null }, { meta: { page: { offset: 0, count: 0 }, links: { next: null } } }, null]) {
    assert.throws(() => magaluCatalogPresence(result));
  }
});

test('vazio, permissão negada e erro exibem avisos distintos', () => {
  assert.match(MAGALU_CATALOG_MESSAGES.empty.account, /Sem anúncios para exibir/);
  assert.match(MAGALU_CATALOG_MESSAGES.empty.panel, /não encontrou itens/);
  assert.match(MAGALU_CATALOG_MESSAGES.denied.account, /não autorizada/);
  assert.match(MAGALU_CATALOG_MESSAGES.failed.account, /Não foi possível confirmar/);
  assert.doesNotMatch(MAGALU_CATALOG_MESSAGES.denied.panel, /Sem anúncios para exibir/);
  assert.doesNotMatch(MAGALU_CATALOG_MESSAGES.failed.panel, /Sem anúncios para exibir/);
});
