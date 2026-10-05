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
const { mercadoLivreEditPolicy, stockModelFromResponse, titleAssociationFromResponse } = await import('../../app/modules/marketplaces/services/mercadolivre-edit-policy.ts');
hooks.deregister();

const item = { id: 'MLB123456789', title: 'Gin Bóra London Dry 700 ml', family_name: 'Gin Bóra London Dry', price: 160, available_quantity: 30, currency_id: 'BRL',
  category_id: 'MLB123', catalog_listing: false, user_product_id: 'MLBU123456', status: 'active', sold_quantity: 0,
  buying_mode: 'buy_it_now', condition: 'new', listing_type_id: 'gold_pro', shipping: { logistic_type: 'drop_off' } };
const category = { settings: { max_title_length: 60 } };
const user = { id: 123, tags: [] };
const policy = (patch = {}, userPatch = {}, stockModel = 'single', description = 'Descrição original', association = 'single') =>
  mercadoLivreEditPolicy({ ...item, ...patch }, category, { ...user, ...userPatch }, description, 'none', stockModel, association);

test('UP individual sem vendas edita nome base, descrição e estoque simples', () => {
  const fields = policy().fields;
  assert.equal(fields.title.editable, true);
  assert.equal(fields.title.label, 'Nome base do título');
  assert.equal(policy().values.title, item.family_name);
  assert.equal(fields.stock.editable, true);
  assert.match(fields.stock.notice, /compartilhado/);
  assert.equal(fields.description.editable, true);
});
test('vendas, vínculo compartilhado e consulta incerta bloqueiam nome base com motivo específico', () => {
  assert.match(policy({}, {}, 'single', 'Descrição', 'shared').fields.title.reason, /outros anúncios vinculados/);
  assert.match(policy({}, {}, 'single', 'Descrição', 'unknown').fields.title.reason, /Não foi possível confirmar/);
  assert.match(policy({ sold_quantity: 1 }).fields.title.reason, /já teve vendas/);
  assert.match(policy({ sold_quantity: 1 }, {}, 'single', 'Descrição', 'shared').fields.title.reason, /já teve vendas/);
  assert.equal(policy({ family_name: null }).fields.title.editable, false);
  assert.equal(policy({ catalog_listing: true }).fields.title.editable, false);
});
test('anúncio antigo sem UP mantém edição direta de title quando não houve venda', () => {
  const legacy = policy({ user_product_id: null, family_name: null, tags: [] });
  assert.equal(legacy.fields.title.editable, true);
  assert.equal(legacy.values.title, item.title);
});
test('associação só é individual quando a busca confirma exatamente o próprio anúncio', () => {
  const response = { seller_id: 123, paging: { total: 1 }, results: [item.id] };
  assert.equal(titleAssociationFromResponse(response, '123', item.id), 'single');
  assert.equal(titleAssociationFromResponse({ paging: { total: 1 }, results: [item.id] }, '123', item.id), 'single');
  assert.equal(titleAssociationFromResponse({ ...response, paging: { total: 2 }, results: [item.id, 'MLB456'] }, '123', item.id), 'shared');
  assert.equal(titleAssociationFromResponse({ ...response, seller_id: 999 }, '123', item.id), 'unknown');
  assert.equal(titleAssociationFromResponse({ ...response, results: ['MLB456'] }, '123', item.id), 'unknown');
  assert.equal(titleAssociationFromResponse({ ...response, paging: {} }, '123', item.id), 'unknown');
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
