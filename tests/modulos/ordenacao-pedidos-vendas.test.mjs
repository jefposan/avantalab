import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8');

const inicio = app.indexOf('function pedidosFiltrados()');
const fim = app.indexOf('\nfunction opcoesOrdemPedidos()', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'A ordenação de pedidos deve existir no aplicativo.');

function criarOrdenador(criterioOrdemPedidos, ordemPedidos) {
  const state = {
    vendas: [
      { id: '2', cliente_id: 'cliente-b', criado_em: '2026-10-02T12:00:00Z' },
      { id: '1', cliente_id: 'cliente-a', criado_em: '2026-10-01T12:00:00Z' },
    ],
    clientes: [
      { id: 'cliente-a', nome: 'Ana' },
      { id: 'cliente-b', nome: 'Bruno' },
    ],
  };
  const fabrica = new Function(
    'state',
    'normalizar',
    'buscaAplicada',
    'pedidoEhConsignado',
    'pedidoConsignadoAtivo',
    'filtroPedidos',
    'tipoPedido',
    'textoPesquisaPedido',
    'criterioOrdemPedidos',
    'ordemPedidos',
    `${app.slice(inicio, fim)}; return pedidosFiltrados;`,
  );
  return fabrica(
    state,
    (valor) => String(valor || '').toLowerCase(),
    '',
    () => false,
    () => false,
    'todos',
    () => 'pedidos',
    () => '',
    criterioOrdemPedidos,
    ordemPedidos,
  );
}

test('ordena pedidos por cliente em A/Z e Z/A', () => {
  assert.deepEqual(criarOrdenador('cliente', 'asc')().map(({ id }) => id), ['1', '2']);
  assert.deepEqual(criarOrdenador('cliente', 'desc')().map(({ id }) => id), ['2', '1']);
});

test('ordena pedidos por data recente ou antiga', () => {
  assert.deepEqual(criarOrdenador('data', 'desc')().map(({ id }) => id), ['2', '1']);
  assert.deepEqual(criarOrdenador('data', 'asc')().map(({ id }) => id), ['1', '2']);
});

test('exibe a ordenação permanentemente ao lado da contagem de Pedidos', () => {
  assert.match(app, /class="module-title pedidos-title"/);
  assert.match(app, /class="payment-order-button order-sort-control"/);
  assert.match(app, /<select aria-label="Ordenar pedidos" onchange="selecionarOrdemPedidos\(this\.value\)"/);
  assert.match(app, /\['data_desc', 'Mais recentes'\]/);
  assert.match(app, /\['data_asc', 'Mais antigos'\]/);
  assert.match(app, /function renderBarraBuscaPedidos\(\)/);
  assert.match(app, /\$\{renderBarraBuscaPedidos\(\)\}/);
  assert.match(app, /window\.selecionarOrdemPedidos = selecionarOrdemPedidos/);
  assert.match(styles, /\.orders-title-actions \{[^}]*display: inline-flex/);
  assert.match(styles, /\.order-results-summary \{[^}]*justify-content: space-between/);
  assert.match(styles, /\.order-results-summary \.order-sort-control \{[^}]*width: 122px/);
  assert.match(styles, /\.order-sort-control:focus-within/);
});

test('posiciona a contagem no cabeçalho como em Pagamentos', () => {
  assert.match(app, /class="module-stats payment-results-stats order-results-summary"><span aria-live="polite"/);
  const inicioPedidos = app.indexOf('function renderVendas()');
  const trechoPedidos = app.slice(inicioPedidos, app.indexOf('\nfunction tipoPedido', inicioPedidos));
  assert.match(trechoPedidos, /<\/nav>\s*<div class="module-stats payment-results-stats order-results-summary"/);
  assert.match(trechoPedidos, /pedidos<\/span><label class="payment-order-button order-sort-control"/);
  assert.doesNotMatch(trechoPedidos, /pedidos-title[^\n]*order-sort-control/);
  assert.doesNotMatch(styles, /\.order-results-stats/);
});

test('a ordem de Pedidos é independente dos demais módulos', () => {
  assert.match(app, /let criterioOrdemPedidos = 'cliente';/);
  assert.match(app, /let ordemPedidos = 'asc';/);
  assert.match(app, /criterioOrdemPedidos === 'data'/);
  assert.doesNotMatch(app.slice(inicio, fim), /ordemAlfabetica/);
});
