import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const app = await readFile(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8');

const inicio = app.indexOf('function pedidosFiltrados()');
const fim = app.indexOf('\nfunction alternarOrdemPedidos()', inicio);
assert.ok(inicio >= 0 && fim > inicio, 'A ordenação de pedidos deve existir no aplicativo.');

function criarOrdenador(ordemPedidos) {
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
    ordemPedidos,
  );
}

test('ordena pedidos por cliente em A/Z e Z/A', () => {
  assert.deepEqual(criarOrdenador('asc')().map(({ id }) => id), ['1', '2']);
  assert.deepEqual(criarOrdenador('desc')().map(({ id }) => id), ['2', '1']);
});

test('exibe a ordenação permanentemente no cabeçalho de Pedidos', () => {
  assert.match(app, /class="module-title pedidos-title"/);
  assert.match(app, /class="payment-order-button" onclick="alternarOrdemPedidos\(\)"/);
  assert.match(app, /function renderBarraBuscaPedidos\(\)/);
  assert.match(app, /\$\{renderBarraBuscaPedidos\(\)\}/);
  assert.match(app, /window\.alternarOrdemPedidos = alternarOrdemPedidos/);
  assert.match(styles, /\.orders-title-actions \{[^}]*display: inline-flex/);
});

test('a ordem de Pedidos é independente dos demais módulos', () => {
  assert.match(app, /let ordemPedidos = 'asc';/);
  assert.match(app, /return ordemPedidos === 'asc' \? comparacao : -comparacao;/);
  assert.doesNotMatch(app.slice(inicio, fim), /ordemAlfabetica/);
});
