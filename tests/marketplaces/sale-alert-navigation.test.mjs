import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('alerta de venda pertence somente ao Marketplace do perfil aberto e leva ao pedido interno', () => {
  const monitor = read('app/components/MarketplaceLiveMonitor.tsx');
  const client = read('app/marketplaces/MarketplacesClient.tsx');
  const sales = read('app/marketplaces/Vendas.tsx');

  assert.match(client, /<MarketplaceLiveMonitor key=\{companyId\} companyId=\{companyId\}[\s\S]*onOpenSale=\{openAlertSale\}/);
  assert.doesNotMatch(read('app/gestao/page.tsx'), /MarketplaceLiveMonitor/);
  assert.doesNotMatch(read('app/layout.tsx'), /MarketplaceLive(Monitor|Scope)/);
  assert.match(monitor, /textoConfirmar="Ver venda no AvantaLab"/);
  assert.doesNotMatch(monitor, /window\.open|resolve_link|alertLink|safeMarketplaceLink|location\.replace/);

  assert.match(client, /setSalesAccount\(alert\.connection_id\)/);
  assert.match(client, /setSalesExpanded\(true\)/);
  assert.match(client, /setSaleToOpen\(alert\.sale_id \|\| ''\)/);
  assert.match(sales, /saleToOpen: string; dark: boolean/);
  assert.match(sales, /useState\(\(\) => saleToOpen && sales\.some/);
  assert.match(sales, /sale\.id === saleToOpen && open === sale\.id/);
  assert.doesNotMatch(read('app/api/modulos/marketplaces/avisos/route.ts'), /resolve_link|seller\.magalu\.com|mlRequest/);
});
