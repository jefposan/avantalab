import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
function trecho(inicio, fim) {
  const primeiro = fonte.indexOf(inicio);
  const ultimo = fonte.indexOf(fim, primeiro);
  assert.ok(primeiro >= 0 && ultimo > primeiro);
  return fonte.slice(primeiro, ultimo);
}
function fluxo(vendas = [], clientes = []) {
  const ctx = vm.createContext({
    state: { vendas, clientes, produtos: [], filtroInicio: '2026-10-01', filtroFim: '2026-10-31' },
    normalizar: texto => String(texto || '').toLowerCase(),
    metadadosPedido: venda => JSON.parse(venda.observacoes || '{}'),
  });
  for (const [inicio, fim] of [
    ['function vendasValidasNoPeriodo(', 'function evolucaoVendasDashboard('],
    ['function rankingClientesDashboard(', 'function resumoConsignadosDashboard('],
    ['function pedidoEhConsignado(', 'function pedidoConsignadoAtivo('],
    ['function itemPedidoBonificado(', 'function textoPesquisaPedido('],
  ]) vm.runInContext(trecho(inicio, fim), ctx);
  return ctx;
}
function pedido(cliente, total, outros = {}) {
  return {
    cliente_id: cliente, total, status: 'concluida', forma_pagamento: 'Venda',
    criado_em: '2026-10-10T12:00:00',
    itens: [{ produto_id: 'produto', produto_nome: 'Produto', quantidade: 1, preco: total, total, preco_custo: 1 }],
    ...outros,
  };
}
const normal = valor => JSON.parse(JSON.stringify(valor));

test('Top clientes inclui todos os 25 compradores, do maior total para o menor', () => {
  const clientes = Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, nome: `Cliente ${i}` }));
  const vendas = clientes.map((c, i) => pedido(c.id, i + 1));
  const ctx = fluxo(vendas, clientes);
  const lista = ctx.rankingClientesDashboard(ctx.totaisPeriodo().vendasMes);
  assert.equal(lista.length, 25);
  assert.deepEqual(normal(lista.map(c => c.total)), Array.from({ length: 25 }, (_, i) => 25 - i));
  assert.equal(lista[24].nome, 'Cliente 0');
});

test('compras do mesmo cliente são somadas em uma única linha com contagem de pedidos', () => {
  const ctx = fluxo([pedido('a', 10), pedido('b', 25), pedido('a', 20)], [{ id: 'a', nome: 'Ana' }, { id: 'b', nome: 'Bia' }]);
  assert.deepEqual(normal(ctx.rankingClientesDashboard(ctx.totaisPeriodo().vendasMes)), [
    { nome: 'Ana', total: 30, pedidos: 2 }, { nome: 'Bia', total: 25, pedidos: 1 },
  ]);
});

test('período preserva limites de data e exclui cancelados, consignados e somente bonificados', () => {
  const ctx = fluxo([
    pedido('inicio', 10, { criado_em: '2026-10-01T00:00:00' }),
    pedido('fim', 20, { criado_em: '2026-10-31T23:59:59' }),
    pedido('antes', 900, { criado_em: '2026-09-30T23:59:59' }),
    pedido('depois', 900, { criado_em: '2026-11-01T00:00:00' }),
    pedido('cancelado', 900, { status: 'cancelada' }),
    pedido('consignado', 900, { forma_pagamento: 'Consignado' }),
    pedido('bonificado', 0, { itens: [{ quantidade: 1, bonificado: true, total: 0 }] }),
  ], [{ id: 'inicio', nome: 'Início' }, { id: 'fim', nome: 'Fim' }]);
  const t = ctx.totaisPeriodo();
  assert.deepEqual(normal(ctx.rankingClientesDashboard(t.vendasMes)), [
    { nome: 'Fim', total: 20, pedidos: 1 }, { nome: 'Início', total: 10, pedidos: 1 },
  ]);
  assert.equal(t.total, 30);
});

test('trocar o período recalcula o ranking sem acumular resultados anteriores', () => {
  const ctx = fluxo([pedido('out', 100), pedido('nov', 200, { criado_em: '2026-11-10T12:00:00' })], [{ id: 'out', nome: 'Outubro' }, { id: 'nov', nome: 'Novembro' }]);
  assert.equal(ctx.rankingClientesDashboard(ctx.totaisPeriodo().vendasMes)[0].nome, 'Outubro');
  ctx.state.filtroInicio = '2026-11-01';
  ctx.state.filtroFim = '2026-11-30';
  const ranking = ctx.rankingClientesDashboard(ctx.totaisPeriodo().vendasMes);
  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].nome, 'Novembro');
});

test('sem compras a lista fica vazia, e o ranking não altera os registros', () => {
  const clientes = [{ id: 'sem-compra', nome: 'Sem compra' }];
  const vendas = [pedido('antes', 100, { criado_em: '2026-09-01T12:00:00' })];
  const antes = JSON.stringify({ clientes, vendas });
  const ctx = fluxo(vendas, clientes);
  assert.equal(ctx.rankingClientesDashboard(ctx.totaisPeriodo().vendasMes).length, 0);
  assert.equal(JSON.stringify({ clientes, vendas }), antes);
});

test('Top 10 Produtos continua limitado a dez produtos', () => {
  const vendas = Array.from({ length: 25 }, (_, i) => pedido(`c${i}`, i + 1, {
    itens: [{ produto_id: `p${i}`, produto_nome: `Produto ${i}`, quantidade: i + 1, preco: 1, total: i + 1 }],
  }));
  const ctx = fluxo(vendas);
  assert.equal(ctx.rankingProdutosDashboard(vendas).length, 10);
});

test('card usa o título aprovado e os resultados filtrados sem limitar a renderização', () => {
  const dashboard = trecho('function renderDashboard()', 'function kpi(');
  assert.match(dashboard, /rankingClientesDashboard\(t\.vendasMes\)/);
  assert.match(dashboard, /dashboard-top-clients[\s\S]*?Top clientes<\/h3>/);
  assert.doesNotMatch(dashboard, /Top 10 Clientes/);
  assert.match(dashboard, /clientesTop\.map\(/);
  assert.match(dashboard, /Nenhuma venda no período/);
});
