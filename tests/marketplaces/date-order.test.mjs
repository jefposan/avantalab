import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dateOrder, sortSalesByDate } from '../../app/modules/marketplaces/date-order.ts';

test('datas crescentes/decrescentes usam o instante da venda, não título ou sincronização', () => {
  const sales = [
    { id: 'b', soldAt: '2026-10-11T08:00:00-03:00', updatedAt: '2026-10-12', title: 'Z' },
    { id: 'a', soldAt: '2026-10-11T10:00:00Z', updatedAt: '2026-10-13', title: 'A' },
    { id: 'c', soldAt: '2026-10-10T23:00:00-03:00', updatedAt: '2026-10-14', title: 'M' },
  ];
  const original = structuredClone(sales);
  assert.deepEqual(sortSalesByDate(sales, 'desc').map((sale) => sale.id), ['b', 'a', 'c']);
  assert.deepEqual(sortSalesByDate(sales, 'asc').map((sale) => sale.id), ['c', 'a', 'b']);
  assert.deepEqual(sales, original);
});

test('datas ausentes/inválidas ficam ao fim em ambas as ordens, com desempate estável', () => {
  const sales = [{ id: 'd', soldAt: '' }, { id: 'b', soldAt: '2026-10-11T10:00:00Z' }, { id: 'a', soldAt: '2026-10-11T10:00:00Z' }, { id: 'c', soldAt: 'inválida' }];
  for (const order of ['asc', 'desc']) assert.deepEqual(sortSalesByDate(sales, order).map((sale) => sale.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(sortSalesByDate([], 'asc'), []);
});

test('parâmetro de ordenação aceita apenas asc e desc e tem padrão recente', () => {
  assert.equal(dateOrder('asc'), 'asc');
  for (const value of ['desc', null, undefined, '', 'title', 'asc.nullsfirst', 'snapshot']) assert.equal(dateOrder(value), 'desc');
});

test('ordens independentes no topo, anúncios reiniciam paginação e preservam edição', () => {
  const read = (file) => readFileSync(new URL(`../../app/marketplaces/${file}`, import.meta.url), 'utf8');
  const sales = read('Vendas.tsx'), listings = read('Anunciados.tsx');
  for (const [source, context] of [[sales, 'Vendas'], [listings, 'Anunciados']]) {
    assert.match(source, /useState<DateOrder>\('desc'\)/);
    assert.ok(source.includes(`<DateOrderButton context="${context}"`));
    assert.ok(source.indexOf('<DateOrderButton') < source.indexOf(`id="${context === 'Vendas' ? 'sales' : 'announced'}-content"`));
  }
  assert.match(sales, /orderedSales\.map/);
  assert.match(listings, /status, order, page: String\(page\)/);
  assert.match(listings, /disabled=\{loading \|\| syncing \|\| acting \|\| !!expanded \|\| !!copyingListing\}/);
  assert.match(listings, /onChange=\{\(value\) => \{ setOrder\(value\); setPage\(1\); \}\}/);
  const route = readFileSync(new URL('../../app/api/modulos/marketplaces/anunciados/route.ts', import.meta.url), 'utf8');
  assert.match(route, /eq\('empresa_id', empresaId\)\.eq\('connection_id', connectionId\)/);
  assert.match(route, /order\('snapshot->>createdAt', \{ ascending: order === 'asc', nullsFirst: false \}\)\.order\('provider_listing_id'\)\.range/);
});

test('classificação reutiliza SVG de filtro e largura fixa; altura é compartilhada só nos cabeçalhos', () => {
  const button = readFileSync(new URL('../../app/marketplaces/DateOrderButton.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../../app/marketplaces/marketplaces.module.css', import.meta.url), 'utf8');
  assert.match(button, /import \{ Icon \} from '@\/app\/projetos\/components\/Icon'/);
  assert.match(button, /<Icon name="filter" size=\{16\} \/>/);
  assert.match(css, /\.panelHeadingActions \.dateOrderButton \{[^}]*width: 150px;[^}]*flex: 0 0 150px;[^}]*white-space: nowrap;/);
  assert.match(css, /\.panelHeadingActions :is\(\.refreshSales, button\[aria-controls="sales-content"\], button\[aria-controls="announced-content"\]\) \{[^}]*min-height: var\(--heading-control-height\); height: var\(--heading-control-height\);/);
  assert.match(css, /\.panelHeadingActions \{ --heading-control-height: 40px;/);
  assert.match(css, /@media \(max-width: 760px\) \{\s*\.panelHeadingActions \{ --heading-control-height: 48px; \}/);
  assert.match(css, /inset: calc\(\(var\(--heading-control-height\) - 48px\) \/ 2\) 0;/);
});

test('os três controles compartilham hover sem afetar toque, desabilitados ou outros módulos', () => {
  const css = readFileSync(new URL('../../app/marketplaces/marketplaces.module.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.panelHeadingActions :is\(\.refreshSales, button\[aria-controls="sales-content"\], button\[aria-controls="announced-content"\]\):hover:not\(:disabled\) \{ border-color: var\(--brand\) !important; background-color: var\(--heading-control-hover-background\) !important; \}/);
  assert.match(css, /\.dark \.panelHeadingActions \{ --heading-control-hover-background: color-mix\(in srgb, var\(--brand\) 22%, #182235\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.panelHeadingActions :is\([^)]+\) \{ transition: none; \}/);
  assert.doesNotMatch(css, /\.dateOrderButton:hover/);
});
