import assert from 'node:assert/strict';
import test from 'node:test';
import { SALES_MARKETPLACES, saleMarketplace, salesByMarketplaces } from '../../app/modules/marketplaces/sales-marketplace-filter.ts';

const sales = [
  { id: 'ml-legacy' },
  { id: 'ml', provider: 'mercado_livre' },
  { id: 'magalu', provider: 'magalu' },
];

test('lista apenas marketplaces com suporte a vendas e preserva pedidos ML antigos sem provider', () => {
  assert.deepEqual(SALES_MARKETPLACES.map(item => item.value), ['mercado_livre', 'magalu']);
  assert.equal(saleMarketplace(sales[0]), 'mercado_livre');
});

test('filtro vazio exibe todas as vendas; uma ou várias seleções restringem corretamente', () => {
  assert.deepEqual(salesByMarketplaces(sales, []).map(sale => sale.id), ['ml-legacy', 'ml', 'magalu']);
  assert.deepEqual(salesByMarketplaces(sales, ['mercado_livre']).map(sale => sale.id), ['ml-legacy', 'ml']);
  assert.deepEqual(salesByMarketplaces(sales, ['magalu']).map(sale => sale.id), ['magalu']);
  assert.deepEqual(salesByMarketplaces(sales, ['magalu', 'mercado_livre']).map(sale => sale.id), ['ml-legacy', 'ml', 'magalu']);
});
