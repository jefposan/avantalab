import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogAttributes, catalogCandidate, catalogGtins, catalogPictures, publicationErrors, validEan, warrantyDuration, WARRANTY_TIME_HELP } from '../../app/modules/marketplaces/services/catalog-publication.ts';

const ean = '7899882306941';
const product = { id: 'MLB40220538', name: 'Produto teste', domainId: 'MLB-GINS', picture: null, attributes: [], pictures: [], description: '' };
const preparation = { status: 'found', ean, product, categories: [{ id: 'MLB32130', name: 'Gin' }], categoryId: 'MLB32130', listingTypes: [{ id: 'gold_special', name: 'Clássico' }], shippingModes: [{ id: 'me2', name: 'Mercado Envios' }], conditions: [{ id: 'new', name: 'Novo' }], requiredAttributes: [{ id: 'BRAND', name: 'Marca', values: [{ id: '123', name: 'Marca A' }] }] };
const form = { ean, productId: product.id, categoryId: 'MLB32130', price: 160, stock: 30, listingType: 'gold_special', shippingMode: 'me2', condition: 'new', warrantyType: 'none', attributes: { BRAND: '123' } };

test('nome de 67 caracteres é recusado antes do envio quando a categoria retorna limite 60, sem truncar o cadastro',()=>{
 const name='Mini Processador De Alimentos Pratic Red Lenoxx Pmp435 Cor Vermelho';
 const prepared={...preparation,product:{...product,name},constraints:{maxTitleLength:60,maxDescriptionLength:50000}};
 assert.match(publicationErrors(form,prepared).title,/67 caracteres.*até 60/);assert.equal(prepared.product.name,name);
 assert.equal(publicationErrors(form,{...prepared,product:{...product,name:'Mini Processador Lenoxx PMP435 Vermelho'}}).title,undefined);
 assert.equal(publicationErrors(form,{...prepared,constraints:{...prepared.constraints,maxTitleLength:70}}).title,undefined);
});

test('nome oficial de catálogo não é recusado pelo limite de título comum; cadastro local continua validado',()=>{
 const name='Cafeteira Elétrica Electrolux 600ml Capacidade 15 xicaras Jarra Inox filtro permanente removivel corta pingos função manter aquecido ECM12 - INOX';
 const prepared={...preparation,product:{...product,id:'MLB41147138',name,source:'mercadolivre_catalog'},constraints:{maxTitleLength:60,maxDescriptionLength:50000}};
 assert.equal(publicationErrors({...form,productId:'MLB41147138'},prepared).title,undefined);
 assert.equal(prepared.product.name,name);
 for(const source of ['local_product','profile_catalog','marketplace_listing'])assert.match(publicationErrors(form,{...prepared,product:{...product,name,source}}).title,/até 60/);
});

test('campos complementares aceitam vazio, validam opção/unidade/comprimento e não viram obrigatórios',()=>{
 const prepared={...preparation,optionalAttributes:[{id:'LINE',name:'Linha',values:[{id:'A',name:'Linha A'}]},{id:'CAPACITY',name:'Capacidade',values:[],units:['L'],maxLength:20}]};
 assert.deepEqual(publicationErrors(form,prepared),{});
 assert.deepEqual(publicationErrors({...form,attributes:{...form.attributes,LINE:'A',CAPACITY:'20 L'}},prepared),{});
 const errors=publicationErrors({...form,attributes:{...form.attributes,LINE:'inventada',CAPACITY:'20'}},prepared);assert.ok(errors['attribute:LINE']);assert.ok(errors['attribute:CAPACITY']);
 assert.ok(publicationErrors({...form,attributes:{...form.attributes,CAPACITY:'x'.repeat(21)}},prepared)['attribute:CAPACITY']);
});

test('prazo exige quantidade positiva e unidade explícita, sem presumir meses', () => {
  for (const value of ['', '3', '0 dias', '-3 meses', '1.5 anos', '3 semanas', '999999999999999999999 anos']) {
    assert.equal(warrantyDuration(value), null);
    assert.equal(publicationErrors({...form,warrantyType:'factory',warrantyTime:value},preparation).warrantyTime,WARRANTY_TIME_HELP);
  }
  for (const [value,text,days] of [['3 meses','3 meses',90],[' 1 ANO ','1 anos',365],['10dias','10 dias',10],['1 mês','1 meses',30]]) {
    assert.deepEqual(warrantyDuration(value),{text,days});
    assert.equal(publicationErrors({...form,warrantyType:'factory',warrantyTime:value},preparation).warrantyTime,undefined);
  }
});

test('EAN vazio só é permitido quando a origem da cópia coincide com a preparação', () => {
  const copySource = { connectionId: 'origem', listingId: 'MLB123' };
  const preparedCopy = { ...preparation, ean: '', copySource };
  assert.deepEqual(publicationErrors({ ...form, ean: '', copySource }, preparedCopy), {});
  assert.ok(publicationErrors({ ...form, ean: '' }, preparedCopy).ean);
  assert.ok(publicationErrors({ ...form, ean: '', copySource: { ...copySource, listingId: 'outro' } }, preparedCopy).ean);
  assert.ok(publicationErrors({ ...form, ean: '' }, { ...preparation, ean: '' }).ean);
});

test('GTINs da ficha aceitam apenas códigos válidos, sem inventar EAN de outros atributos', () => {
  assert.deepEqual(catalogGtins([
    { id: 'GTIN', value_name: `${ean}, 7891129598607`, values: [{ name: ean }, { name: '7899882306942' }, { name: `EAN ${ean}` }] },
    { id: 'BRAND', value_name: '12345670' },
    { id: 'GTIN', value_name: '7899-8823-0694-1' },
    null,
  ]), [ean, '7891129598607']);
  assert.deepEqual(catalogGtins(null), []);
});

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
