import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);

async function ler(caminho) {
  return readFile(new URL(caminho, raiz), 'utf8');
}

test('Configurações usa o Kanban estável e persiste a ordem por perfil', async () => {
  const app = await ler('app/avantavendas/sistema/app.js');
  const css = await ler('app/avantavendas/sistema/styles.css');
  const trecho = app.slice(
    app.indexOf('function prepararKanbanCardsConfiguracoes'),
    app.indexOf('function renderConfiguracoes'),
  );

  assert.match(app, /const PREFERENCIAS_VENDAS_VERSAO = 3/);
  assert.match(app, /ordemCardsConfiguracoes: \[\]/);
  assert.match(app, /ordemCardsConfiguracoes = Array\.isArray/);
  assert.match(app, /ordemCardsConfiguracoes: state\.ordemCardsConfiguracoes/);
  assert.match(trecho, /settings-cards-kanban/);
  assert.match(trecho, /settings-card-drag-handle/);
  assert.match(trecho, /Segure e arraste para reorganizar/);
  assert.match(trecho, /handle\?\.closest\('\[data-settings-card\]'\)/);
  assert.doesNotMatch(trecho, /settings-organize-toolbar/);
  assert.doesNotMatch(trecho, /alternarOrganizacaoCardsConfiguracoes/);
  assert.doesNotMatch(trecho, /state\.organizandoCardsConfiguracoes/);
  assert.match(trecho, /ArrowLeft ArrowRight ArrowUp ArrowDown/);
  assert.match(trecho, /indiceMaisProximoSalaBotoes/);
  assert.match(trecho, /170ms cubic-bezier\(\.2,\.8,\.2,1\)/);
  assert.match(trecho, /document\.createElement\('div'\)/);
  assert.match(trecho, /settings-kanban-overlay-card/);
  assert.match(trecho, /flutuante\.appendChild\(copia\)/);
  assert.doesNotMatch(trecho, /elementFromPoint/);
  assert.match(css, /\.settings-kanban-overlay[^}]*background: transparent/);
  assert.match(css, /\.settings-kanban-overlay[^}]*filter: drop-shadow/);
  assert.match(css, /\.settings-kanban-overlay-card/);
  assert.match(css, /\.settings-card\.is-organizable/);
  assert.match(css, /\.settings-card-drag-handle[^}]*touch-action: none/);
  assert.doesNotMatch(css, /\.settings-card\.is-organizable[^}]*touch-action: none/);
  assert.doesNotMatch(css, /\.settings-card\.is-organizable > \* \{ pointer-events: none/);
  assert.match(css, /prefers-reduced-motion/);
});

test('Dashboard padroniza consignados e permite ordenar clientes pela última compra', async () => {
  const app = await ler('app/avantavendas/sistema/app.js');
  const css = await ler('app/avantavendas/sistema/styles.css');
  const dashboard = app.slice(app.indexOf('function renderDashboard'), app.indexOf('function kpi'));

  assert.match(app, /dashboardClientesInativosOrdem: 'mais-antiga'/);
  assert.match(app, /function alternarOrdemClientesInativosDashboard/);
  assert.match(app, /maisRecentesPrimeiro \? 1 : -1/);
  assert.match(dashboard, /dashboard-panel dashboard-consignment-card/);
  assert.ok(
    dashboard.indexOf('dashboard-panel dashboard-consignment-card') < dashboard.indexOf('<section class="dashboard-tables">'),
    'Estoque consignado deve preservar a largura integral anterior à grade',
  );
  assert.match(dashboard, /dashboard-consignment-heading/);
  assert.match(dashboard, /consignados ativos.*unidades.*moeda\(consignados\.total\)/s);
  assert.match(dashboard, /Expandir estoque consignado/);
  assert.match(dashboard, /Recolher estoque consignado/);
  assert.match(dashboard, /dashboard-inactive-sort/);
  assert.match(dashboard, /Antigas primeiro/);
  assert.match(dashboard, /Recentes primeiro/);
  assert.match(css, /\.dashboard-consignment-toggle/);
  assert.match(css, /grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.dashboard-consignment-products \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.dashboard-inactive-sort/);
});

test('revisão av87 documenta os três ajustes', async () => {
  const [changelog, manual] = await Promise.all([
    ler('CHANGELOG.md'),
    ler('docs/ava/vendas.md'),
  ]);

  assert.match(changelog, /1\.11\.0-av87/);
  assert.match(changelog, /Kanban estável/);
  assert.match(manual, /Revisão 1\.11\.0-av87/);
});
