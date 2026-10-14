import assert from 'node:assert/strict';
import test from 'node:test';
import { magaluCategoryFields, magaluPublicationBodies, magaluPublicationErrors, isMagaluPublicationForm, MAGALU_CHANNEL_ID } from '../../app/modules/marketplaces/magalu-publication-model.ts';

const id = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const product = { sku: 'SKU-TESTE', ean: '7891234567895', stock_quantity: 5, pictures: ['https://example.com/foto.jpg'] };
const attributes = [{ name: 'cor', label: 'Cor', required: true, choices: ['Azul'], variation: true }];
const datasheet = [{ name: 'Material', label: 'Material', required: true, choices: [], variation: false }];
const form = { productId: id, revision: 1, categoryId, sku: product.sku, title: 'Camiseta teste', brand: 'Avanta', description: 'Descrição de teste',
  ean: product.ean, imageUrl: product.pictures[0], condition: 'NEW', priceCents: 1990, stock: 2,
  productHeight: 10, productWidth: 10, productLength: 10, productWeight: 100,
  packageHeight: 12, packageWidth: 12, packageLength: 12, packageWeight: 120,
  attributes: { cor: 'Azul' }, datasheet: { Material: 'Algodão' } };

test('Magalu exige estrutura e ficha confirmada antes de montar qualquer escrita', () => {
  assert.equal(isMagaluPublicationForm(form), true);
  assert.deepEqual(magaluPublicationErrors(form, product, attributes, datasheet), {});
  for (const invalid of [null, {}, { ...form, priceCents: '1990' }, { ...form, attributes: null }, { ...form, datasheet: { Material: 2 } }]) {
    assert.equal(isMagaluPublicationForm(invalid), false);
  }
});

test('Magalu bloqueia estoque maior que físico, imagem fora da ficha e campos obrigatórios ausentes', () => {
  const errors = magaluPublicationErrors({ ...form, stock: 6, imageUrl: 'https://other.example/foto.jpg', datasheet: {} }, product, attributes, datasheet);
  assert.ok(errors.stock);
  assert.ok(errors.imageUrl);
  assert.ok(errors['datasheet:Material']);
});

test('Magalu recebe SKU, preço em centavos e estoque no canal oficial', () => {
  const bodies = magaluPublicationBodies(form, attributes, datasheet);
  assert.deepEqual(bodies.sku.channels, [{ id: MAGALU_CHANNEL_ID }]);
  assert.deepEqual(bodies.sku.attributes, [{ name: 'cor', value: 'Azul' }]);
  assert.equal(bodies.price.price, 1990);
  assert.equal(bodies.price.normalizer, 100);
  assert.deepEqual(bodies.stock, { channel: { id: MAGALU_CHANNEL_ID }, quantity: 2, type: 'AVAILABLE' });
});

test('atributos variáveis e ficha técnica usam a classificação da categoria', () => {
  const rows = { results: [{ name: 'cor', display_name: 'Cor', required: 'required', variation: true, choices: ['Azul'] },
    { name: 'Material', display_name: 'Material', required: 'recommended', variation: false }] };
  assert.equal(magaluCategoryFields(rows, true).length, 1);
  assert.equal(magaluCategoryFields(rows, false).length, 1);
});
