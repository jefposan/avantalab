import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogAttributes, catalogCandidate, catalogPictures, publicationErrors, validEan } from '../../app/modules/marketplaces/services/catalog-publication.ts';

const ean = '7899882306941';
const product = { id: 'MLB40220538', name: 'Produto teste', domainId: 'MLB-GINS', picture: null, attributes: [], pictures: [], description: '' };
const preparation = { status: 'found', ean, product, categories: [{ id: 'MLB32130', name: 'Gin' }], categoryId: 'MLB32130', listingTypes: [{ id: 'gold_special', name: 'Clássico' }], shippingModes: [{ id: 'me2', name: 'Mercado Envios' }], conditions: [{ id: 'new', name: 'Novo' }], requiredAttributes: [{ id: 'BRAND', name: 'Marca', values: [{ id: '123', name: 'Marca A' }] }] };
const form = { ean, productId: product.id, categoryId: 'MLB32130', price: 160, stock: 30, listingType: 'gold_special', shippingMode: 'me2', condition: 'new', warrantyType: 'none', attributes: { BRAND: '123' } };

test('EAN exige dígito verificador; ficha e fotos só aceitam formato confirmado', () => {
  assert.equal(validEan(ean), ean);
  assert.equal(validEan('7899882306942'), null);
  assert.deepEqual(catalogCandidate({ id: product.id, name: product.name, domain_id: product.domainId, status: 'active', pictures: [{ secure_url: 'https://http2.mlstatic.com/a.jpg' }] }), { id: product.id, name: product.name, domainId: product.domainId, picture: 'https://http2.mlstatic.com/a.jpg' });
  assert.equal(catalogCandidate({ id: product.id, name: product.name, domain_id: product.domainId, status: 'inactive' }), null);
  assert.deepEqual(catalogPictures([{ url: 'https://http2.mlstatic.com/a.jpg' }, { url: 'https://example.com/b.jpg' }]), ['https://http2.mlstatic.com/a.jpg']);
  assert.deepEqual(catalogAttributes([{ id: 'BRAND', name: 'Marca', value_name: 'Marca A' }]), [{ id: 'BRAND', name: 'Marca', value: 'Marca A' }]);
});

test('publicação só libera preço, estoque, categoria, opções e atributos permitidos', () => {
  assert.deepEqual(publicationErrors(form, preparation), {});
  const invalid = publicationErrors({ ...form, price: 0, stock: -1, shippingMode: 'custom', condition: 'used', attributes: { BRAND: 'inventado' } }, preparation);
  assert.ok(invalid.price && invalid.stock && invalid.shippingMode && invalid.condition && invalid['attribute:BRAND']);
});

test('limites da categoria e pendências da preparação bloqueiam a publicação', () => {
  const constrained = { ...preparation, constraints: { minimumPrice: 100, maximumPrice: 200, maxDescriptionLength: 10 } };
  assert.ok(publicationErrors({ ...form, price: 99, description: '12345678901' }, constrained).price);
  assert.ok(publicationErrors({ ...form, price: 201 }, constrained).price);
  assert.ok(publicationErrors({ ...form, stock: 0 }, constrained).stock);
  assert.ok(publicationErrors(form, { ...preparation, blockingIssues: [{ code: 'permission', message: 'Permissão pendente' }] }).preparation);
});

test('produto recondicionado exige garantia mínima de noventa dias', () => {
  const refurbished = { ...preparation, conditions: [...preparation.conditions, { id: 'refurbished', name: 'Recondicionado' }] };
  assert.ok(publicationErrors({ ...form, condition: 'refurbished', warrantyType: 'none' }, refurbished).warrantyType);
  assert.ok(publicationErrors({ ...form, condition: 'refurbished', warrantyType: 'seller', warrantyTime: '2 meses' }, refurbished).warrantyTime);
  assert.equal(publicationErrors({ ...form, condition: 'refurbished', warrantyType: 'seller', warrantyTime: '3 meses' }, refurbished).warrantyTime, undefined);
});
