import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const service = read('app/modules/marketplaces/services/mercadolivre-sales.ts');
const fiscal = read('app/modules/marketplaces/services/mercadolivre-fiscal.ts');
const route = read('app/api/modulos/marketplaces/vendas/dce/route.ts');
const sales = read('app/marketplaces/Vendas.tsx');

test('emissão de DC-e revalida o pedido e somente alcança o envio fiscal pendente', () => {
  assert.match(service, /export async function issueDceForSale/);
  assert.match(fiscal, /`\/orders\/\$\{sale\.provider_order_id\}`/);
  assert.match(fiscal, /shipment\.status !== 'ready_to_ship'/);
  assert.match(fiscal, /\['invoice_pending'\]/);
  assert.match(service, /`\/mlb\/order\/\$\{sale\.provider_order_id\}\/dce\/emission`/);
  assert.match(fiscal, /`\/mlb\/order\/\$\{orderId\}\/dce\/info`/);
});

test('rota de DC-e exige gestão no perfil e não permite cache da confirmação', () => {
  assert.match(route, /authorizeMarketplace\(request, body\.empresaId, body\.action === 'refresh' \? 'view' : 'manage'\)/);
  assert.match(route, /issueDceForSale\(db, empresaId/);
  assert.match(route, /Cache-Control': 'no-store'/);
});

test('a venda pede confirmação explícita e atualiza a etiqueta após solicitar a DC-e', () => {
  assert.match(sales, /canManage && \(canIssueDce\(sale\)/);
  assert.match(sales, /Solicitar DC-e/);
  assert.match(sales, /ModalConfirmacao aberto=\{dceConfirmation\?\.id === sale\.id\}/);
  assert.match(sales, /marketplaceClientRequest\('vendas\/dce'/);
  assert.match(sales, /action: 'refresh'/);
  assert.match(sales, /onSaleUpdated\(result\.sale\)/);
});
