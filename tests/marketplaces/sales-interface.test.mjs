import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const client = read('app/marketplaces/MarketplacesClient.tsx');
const sales = read('app/marketplaces/Vendas.tsx');
const webhook = read('app/api/webhooks/mercado-livre/route.ts');
const route = read('app/api/modulos/marketplaces/vendas/route.ts');
const label = read('app/api/modulos/marketplaces/vendas/etiqueta/route.ts');
const service = read('app/modules/marketplaces/services/mercadolivre-sales.ts');

test('vendas chegam por webhook validado, são enfileiradas e relidas no provedor', () => {
  assert.match(webhook, /parseSaleNotification/);
  assert.match(webhook, /queueSaleNotification/);
  assert.match(webhook, /status: 503/);
  assert.match(service, /\['orders_v2', 'orders', 'shipments'\]/);
  assert.match(service, /await mlRequest\(db, connection, `\/orders\/\$\{id\}`\)/);
  assert.match(service, /processSaleNotifications/);
  assert.match(route, /authorizeMarketplace\(request, params\.get\('empresaId'\)\)/);
});

test('contadores e etiquetas são isolados por conta e a impressão fica no AvantaLab', () => {
  assert.match(client, /pendingSales\[account\.id\]/);
  assert.match(client, /<Vendas companyId=\{companyId\} accountId=\{selectedAccount\}/);
  assert.match(sales, /\/api\/modulos\/marketplaces\/vendas\/etiqueta/);
  assert.match(sales, /URL\.createObjectURL/);
  assert.match(sales, /Imprimir etiqueta/);
  assert.match(label, /authorizeMarketplace\(request, body\.empresaId, 'manage'\)/);
  assert.match(label, /Content-Type': 'application\/pdf'/);
  assert.match(service, /label_status !== 'ready'/);
  assert.match(service, /'O envio Full é operado pelo Mercado Livre/);
});
