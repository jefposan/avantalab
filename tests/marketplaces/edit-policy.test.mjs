import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  let candidate;
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const { mercadoLivreEditPolicy, stockModelFromResponse } = await import('../../app/modules/marketplaces/services/mercadolivre-edit-policy.ts');
hooks.deregister();

const item = { id: 'MLB123456789', title: 'Gin Bóra', price: 160, available_quantity: 30, currency_id: 'BRL',
  category_id: 'MLB123', catalog_listing: false, user_product_id: 'MLBU123456', status: 'active', sold_quantity: 0,
  buying_mode: 'buy_it_now', condition: 'new', listing_type_id: 'gold_pro', shipping: { logistic_type: 'drop_off' } };
const category = { settings: { max_title_length: 60 } };
const user = { id: 123, tags: [] };
const policy = (patch = {}, userPatch = {}, stockModel = 'single', description = 'Descrição original') =>
  mercadoLivreEditPolicy({ ...item, ...patch }, category, { ...user, ...userPatch }, description, 'none', stockModel);

test('User Products não bloqueia descrição nem estoque simples; título gerado continua protegido', () => {
  const fields = policy().fields;
  assert.equal(fields.title.editable, false);
  assert.match(fields.title.reason, /nome da família/);
  assert.equal(fields.stock.editable, true);
  assert.match(fields.stock.notice, /compartilhado/);
  assert.equal(fields.description.editable, true);
});
test('multi-origem, Full, kit virtual e localização incerta não liberam estoque', () => {
  assert.equal(policy({}, { tags: ['warehouse_management'] }).fields.stock.editable, false);
  assert.equal(policy({}, {}, 'multi').fields.stock.editable, false);
  assert.equal(policy({}, {}, 'unknown').fields.stock.editable, false);
  assert.equal(policy({ shipping: { logistic_type: 'fulfillment' } }).fields.stock.editable, false);
  assert.match(policy({ tags: ['bundle'] }).fields.stock.reason, /kit virtual/);
  assert.equal(policy({ bundle: { type: 'kit' } }).fields.stock.editable, false);
});
test('catálogo e falha ao consultar descrição mantêm proteção', () => {
  assert.equal(policy({ catalog_listing: true }).fields.description.editable, false);
  assert.equal(policy({}, {}, 'single', null).fields.description.editable, false);
  assert.equal(policy({}, { id: undefined }).fields.stock.editable, false);
});
test('modelo de estoque só é simples para endereço único confirmado do vendedor', () => {
  assert.equal(stockModelFromResponse({ user_id: 123, locations: [{ type: 'selling_address', quantity: 30 }] }, '123'), 'single');
  assert.equal(stockModelFromResponse({ user_id: 123, locations: [{ type: 'seller_warehouse', quantity: 30 }] }, '123'), 'multi');
  assert.equal(stockModelFromResponse({ user_id: 123, locations: [{ type: 'selling_address' }, { type: 'meli_facility' }] }, '123'), 'multi');
  assert.equal(stockModelFromResponse({ user_id: 999, locations: [{ type: 'selling_address' }] }, '123'), 'unknown');
  assert.equal(stockModelFromResponse({ locations: [{ type: 'selling_address' }] }, '123'), 'unknown');
  assert.equal(stockModelFromResponse({ user_id: 123, locations: [] }, '123'), 'unknown');
});
