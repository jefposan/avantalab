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
const { MARKETPLACE_CATALOG_FEEDBACK, marketplaceListingEmptyOutcome, marketplaceListingEmptyMessage } = await import('../../app/marketplaces/catalog-feedback.ts');
const { MAGALU_CATALOG_MESSAGES, magaluCatalogOutcome } = await import('../../app/marketplaces/magalu-catalog-state.ts');
hooks.deregister();

test('Magalu traduz códigos próprios para os estados compartilhados sem chamar erro de conta vazia', () => {
  assert.equal(magaluCatalogOutcome('empty'), 'empty');
  assert.equal(magaluCatalogOutcome('has_skus'), 'found');
  assert.equal(magaluCatalogOutcome('unexpected'), 'failed');
  assert.equal(MAGALU_CATALOG_MESSAGES.empty.account, MARKETPLACE_CATALOG_FEEDBACK.empty.account);
  assert.equal(MAGALU_CATALOG_MESSAGES.denied.account, MARKETPLACE_CATALOG_FEEDBACK.denied.account);
  assert.equal(MAGALU_CATALOG_MESSAGES.failed.account, MARKETPLACE_CATALOG_FEEDBACK.failed.account);
  assert.match(MAGALU_CATALOG_MESSAGES.found.panel, /listagem do Magalu ainda não está integrada/);
});

test('ML só apresenta vazio após sincronização concluída, sem filtros nem falha', () => {
  const base = { loading: false, syncing: false, failed: false, filtered: false, connectedAccounts: [{ last_synced_at: '2026-10-16T00:00:00Z' }] };
  assert.equal(marketplaceListingEmptyOutcome(base), 'empty');
  assert.equal(marketplaceListingEmptyOutcome({ ...base, connectedAccounts: [{ last_synced_at: null }] }), 'unverified');
  assert.equal(marketplaceListingEmptyOutcome({ ...base, connectedAccounts: [] }), 'unverified');
  assert.equal(marketplaceListingEmptyOutcome({ ...base, filtered: true }), 'filtered_empty');
  assert.equal(marketplaceListingEmptyOutcome({ ...base, failed: true }), 'failed');
  assert.equal(marketplaceListingEmptyOutcome({ ...base, loading: true }), 'checking');
  assert.match(marketplaceListingEmptyMessage('empty'), /Sem anúncios para exibir/);
  assert.doesNotMatch(marketplaceListingEmptyMessage('failed'), /Sem anúncios para exibir/);
});
