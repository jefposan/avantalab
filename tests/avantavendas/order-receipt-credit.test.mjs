import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
// Compatibilidade do retrato usado na persistência/edição. A leitura dos
// comprovantes não confia nele: é coberta em historico-comprovantes.test.mjs.
function trecho(inicio, fim) {
  const primeiro = fonte.indexOf(inicio);
  const ultimo = fonte.indexOf(fim, primeiro);
  assert.ok(primeiro >= 0 && ultimo > primeiro, inicio);
  return fonte.slice(primeiro, ultimo);
}
function fluxo(vendas = [], pagamentos = []) {
  const contexto = vm.createContext({
    Date, Intl, JSON, Math, Number, Object, Promise,
    state: { vendas, pagamentos, clientes: [{ id: 'cliente', nome: 'Marta' }], produtos: [] },
    moeda: (numero) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero),
    normalizar: (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
  });
  vm.runInContext(trecho('function pedidosDoCliente(', 'function listaPedidosClienteHtml('), contexto);
  vm.runInContext(trecho('function pedidoGeraDebito(', 'function enderecoPrincipalCliente('), contexto);
  vm.runInContext(trecho('function timestampPedido(', 'function resumoFinanceiroParaConfirmarPagamento('), contexto);
  return contexto;
}
function pedido(metadados, total = 56, outros = {}) {
  return { id: 'pedido', cliente_id: 'cliente', forma_pagamento: 'Venda', status: 'concluida', total, criado_em: '2026-10-10T12:00:00.000Z', ...(metadados ? { observacoes: JSON.stringify(metadados) } : {}), ...outros };
}

test('pedido antigo da imagem recupera crédito de 22 sem alterar retrato de débito e saldo final', () => {
  const venda = pedido({ saldo_anterior: 0, saldo_final: 34 });
  const original = JSON.stringify(venda);
  const ctx = fluxo([], [{ id: 'posterior', cliente_id: 'cliente', valor: 999, data_pagamento: '2026-10-11' }]);
  const resumo = ctx.retratoOriginalPedido(venda);
  assert.equal(resumo.creditoAnterior, 22);
  assert.equal(resumo.saldoAnterior, 0);
  assert.equal(resumo.saldoAtual, 34);
  assert.equal(JSON.stringify(venda), original);
  const html = ctx.saldoAnteriorPedidoHtml(resumo);
  assert.match(html, /CRÉDITO/);
  assert.ok(html.indexOf('CRÉDITO') < html.indexOf('22,00'));
});

test('crédito explícito é conservado mesmo quando cobre todo o pedido', () => {
  const ctx = fluxo();
  const resumo = ctx.retratoOriginalPedido(pedido({ saldo_anterior: 0, credito_anterior: 100, saldo_final: 0 }));
  assert.equal(resumo.creditoAnterior, 100);
  assert.equal(resumo.saldoAtual, 0);
});

test('crédito anterior explícito não é recalculado a partir do saldo atual', () => {
  const ctx = fluxo();
  assert.equal(ctx.retratoOriginalPedido(pedido({ saldo_anterior: 0, credito_anterior: 22, saldo_final: 34 })).creditoAnterior, 22);
  assert.equal(ctx.retratoOriginalPedido(pedido({ saldo_anterior: 0, credito_anterior: 0, saldo_final: 34 })).creditoAnterior, 0);
});

test('débito anterior continua igual e não recebe etiqueta de crédito', () => {
  const ctx = fluxo();
  const resumo = ctx.retratoOriginalPedido(pedido({ saldo_anterior: 15, saldo_final: 71 }));
  assert.equal(resumo.saldoAnterior, 15);
  assert.equal(resumo.creditoAnterior, 0);
  assert.doesNotMatch(ctx.saldoAnteriorPedidoHtml(resumo), /CRÉDITO/);
});

test('diferença monetária recuperada é arredondada em centavos', () => {
  assert.equal(fluxo().retratoOriginalPedido(pedido({ saldo_anterior: 0, saldo_final: 0.1 }, 0.3)).creditoAnterior, 0.2);
});

test('saldo zero antigo não inventa um crédito sem informação suficiente', () => {
  assert.equal(fluxo().retratoOriginalPedido(pedido({ saldo_anterior: 0, saldo_final: 0 })).creditoAnterior, 0);
});

test('consignado não oferece um resumo de dívida ou crédito', () => {
  assert.equal(fluxo().retratoOriginalPedido(pedido({ saldo_anterior: 0, saldo_final: 34 }, 56, { forma_pagamento: 'Consignado' })), null);
});

test('pedido sem retrato usa histórico anterior e ignora pagamentos posteriores ou de outro cliente', () => {
  const venda = pedido(null);
  const ctx = fluxo([venda, pedido(null, 56, { id: 'anterior', criado_em: '2026-10-01T12:00:00Z' })], [
    { id: 'antes', cliente_id: 'cliente', valor: 70, desconto: 8, data_pagamento: '2026-10-09' },
    { id: 'depois', cliente_id: 'cliente', valor: 1000, data_pagamento: '2026-10-11' },
    { id: 'outra-conta', cliente_id: 'outro', valor: 1000, data_pagamento: '2026-10-09' },
  ]);
  const resumo = ctx.retratoOriginalPedido(venda);
  assert.equal(resumo.creditoAnterior, 22);
  assert.equal(resumo.saldoAtual, 34);
});

for (const credito of [22, 56, 100]) {
  test(`finalização conserva crédito anterior de ${credito} nos metadados sem mudar totais`, async () => {
    const ctx = fluxo([], [{ id: 'credito', cliente_id: 'cliente', valor: credito }]);
    const avisos = [];
    Object.assign(ctx, {
      backendAtivo: false, navigator: { onLine: false }, document: { getElementById: () => null },
      valor: () => '2026-10-10', toast: (mensagem) => avisos.push(mensagem), traduzErro: (e) => e.message,
      totaisPedidoClienteRascunho: () => ({ subtotal: 56, desconto: 0, total: 56 }),
      uuidPersistenciaVendas: () => 'pedido',
      iniciarMutacaoDadosVendas() {}, aplicarEstoquesConfirmadosPedido() {}, finalizarMutacaoDadosVendas() {},
      restaurarPesquisaClientesDoLancamento() {}, render() {}, abrirPedidoCliente() {},
      mutacaoPendenteOfflineVendas: () => false,
      confirmarMutacaoDadosVendas: async () => {}, atualizarDashboardAposLancamento: async () => {},
    });
    vm.runInContext(`let pedidoClienteSalvando = false; let pedidoClienteRascunho = {
      clienteId: 'cliente', tipo: 'venda', data: '2026-10-10',
      itens: [{ produto_id: 'produto', quantidade: 1, preco: 56 }]
    };`, ctx);
    vm.runInContext(trecho('async function finalizarPedidoCliente()', 'function abrirEditarPedido('), ctx);
    await ctx.finalizarPedidoCliente();
    assert.equal(avisos.length, 0);
    assert.equal(ctx.state.vendas.length, 1);
    const salvo = ctx.state.vendas[0];
    const metadados = JSON.parse(salvo.observacoes);
    assert.equal(metadados.credito_anterior, credito);
    assert.equal(metadados.saldo_anterior, 0);
    assert.equal(metadados.saldo_final, Math.max(0, 56 - credito));
    assert.equal(salvo.total, 56);
    assert.equal(salvo.itens[0].total, 56);
    assert.equal(ctx.retratoOriginalPedido(salvo).creditoAnterior, credito);
  });
}

for (const modo of ['edicao', 'reenvio']) {
  for (const total of [500, 450]) {
    test(`${modo}: Duda preserva saldo anterior zero após outro pedido de 1110; total ${total}`, async () => {
      const primeiro = pedido({ saldo_anterior: 0, credito_anterior: 0, saldo_final: 500 }, 500);
      const segundo = pedido({ saldo_anterior: 500, saldo_final: 1610 }, 1110, { id: 'segundo' });
      const antigo = pedido(null, 1389.5, { id: 'antigo' });
      const pagamentos = [{ id: 'quitacao', cliente_id: 'cliente', valor: 1200, desconto: 189.5 }];
      const ctx = fluxo([primeiro, segundo, antigo], pagamentos);
      const outrosAntes = JSON.stringify([segundo, antigo, pagamentos]);
      const avisos = [];
      Object.assign(ctx, {
        backendAtivo: false, navigator: { onLine: false }, document: { getElementById: () => null },
        valor: () => '2026-11-19', toast: (s) => avisos.push(s), traduzErro: (e) => e.message,
        totaisPedidoClienteRascunho: () => ({ subtotal: total, desconto: 0, total }),
        iniciarMutacaoDadosVendas() {}, finalizarMutacaoDadosVendas() {}, aplicarEstoquesConfirmadosPedido() {},
        confirmarMutacaoDadosVendas: async () => {}, atualizarDashboardAposLancamento: async () => {},
        render() {}, abrirPedidoCliente() {}, restaurarPesquisaClientesDoLancamento() {}, mutacaoPendenteOfflineVendas: () => false,
      });
      vm.runInContext(`let pedidoClienteSalvando = false; let pedidoClienteRascunho = {
        clienteId:'cliente', tipo:'venda', ${modo === 'edicao' ? "editandoId:'pedido'" : "idPersistencia:'pedido'"},
        itens:[{quantidade:1,preco:${total}}]
      };`, ctx);
      vm.runInContext(trecho('async function finalizarPedidoCliente()', 'function abrirEditarPedido('), ctx);
      await ctx.finalizarPedidoCliente();
      assert.deepEqual(avisos, modo === 'edicao' ? ['Pedido atualizado.'] : []);
      assert.equal(ctx.state.vendas.length, 3, 'reenvio não duplica no estado');
      const resumo = ctx.retratoOriginalPedido(ctx.state.vendas.find((v) => v.id === 'pedido'));
      assert.equal(resumo.saldoAnterior, 0);
      assert.equal(resumo.saldoAtual, total);
      assert.equal(JSON.stringify([ctx.state.vendas[1], ctx.state.vendas[2], ctx.state.pagamentos]), outrosAntes);
      assert.equal(ctx.saldoFinanceiroCliente('cliente').debito, total + 1110);
    });
  }
}
