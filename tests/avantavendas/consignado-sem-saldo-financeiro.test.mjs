import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
function trecho(inicio, fim) {
  const de = fonte.indexOf(inicio);
  const ate = fonte.indexOf(fim, de);
  assert.ok(de >= 0 && ate > de, inicio);
  return fonte.slice(de, ate);
}
const clone = (dado) => JSON.parse(JSON.stringify(dado));
const chavesSaldo = ['saldo_anterior', 'credito_anterior', 'saldo_final'];
function semSaldo(metadados) {
  for (const chave of chavesSaldo) assert.equal(Object.hasOwn(metadados, chave), false, chave);
}
function consignado() {
  return {
    id: 'consignado', cliente_id: 'cliente', forma_pagamento: 'Consignado', status: 'concluida',
    criado_em: '2025-12-26T15:00:00.000Z', total: 787.5, subtotal: 787.5, desconto: 0,
    observacoes: JSON.stringify({ avantalab_pedido: true, tipo: 'consignado', descricao: 'Pedido consignado', custo_total: 120, saldo_anterior: 182, saldo_final: 182, convertido_parcialmente: true }),
    itens: [{ produto_id: 'produto', produto_nome: 'Produto', quantidade: 3, preco: 262.5, total: 787.5 }],
  };
}
function fluxo(vendas, pagamentos = []) {
  const avisos = [];
  const ctx = vm.createContext({
    Date, JSON, Math, Number, Object,
    state: { vendas: clone(vendas), pagamentos: clone(pagamentos), produtos: [], clientes: [{ id: 'cliente' }] },
    backendAtivo: false, navigator: { onLine: false }, window: {},
    normalizar: (s) => String(s || '').toLowerCase(),
    document: { getElementById: () => null }, valor: () => '2026-10-21',
    dataEhFutura: () => false, uuidPersistenciaVendas: () => 'venda-nova',
    iniciarMutacaoDadosVendas() {}, finalizarMutacaoDadosVendas() {}, aplicarEstoquesConfirmadosPedido() {},
    confirmarMutacaoDadosVendas: async () => {}, atualizarDashboardAposLancamento: async () => {},
    restaurarPesquisaClientesDoLancamento() {}, render() {}, abrirPedidoCliente() {},
    mutacaoPendenteOfflineVendas: () => false, moeda: (n) => String(n),
    toast: (s) => avisos.push(s), traduzErro: (e) => e.message,
  });
  vm.runInContext(trecho('function pedidosDoCliente(', 'function listaPedidosClienteHtml('), ctx);
  vm.runInContext(trecho('function pedidoGeraDebito(', 'function enderecoPrincipalCliente('), ctx);
  vm.runInContext(trecho('function timestampPedido(', 'function resumoFinanceiroParaConfirmarPagamento('), ctx);
  return { ctx, avisos };
}

test('caso reportado: retrato legado 182 não cria dívida com consignação de 787,50 e vendas já quitadas', () => {
  const cons = consignado();
  const { ctx } = fluxo([
    cons,
    { id: 'venda-paga', cliente_id: 'cliente', forma_pagamento: 'Venda', total: 2426, status: 'concluida' },
  ], [{ id: 'pagamento', cliente_id: 'cliente', valor: 2426 }]);
  const antes = JSON.stringify(ctx.state);
  assert.equal(ctx.saldoFinanceiroCliente('cliente').debito, 0);
  assert.equal(ctx.saldoFinanceiroCliente('cliente').consignado, 787.5);
  assert.equal(ctx.resumoComprovantePedido(cons), null);
  assert.equal(JSON.stringify(ctx.state), antes, 'leitura não apaga nem reescreve lançamentos');
});

for (const editando of [false, true]) {
  for (const saldoReal of [0, 182, -100]) {
    test(`${editando ? 'editar' : 'criar'} consignado com saldo real ${saldoReal} não captura saldo nem modifica o financeiro`, async () => {
      const vendas = [{ id: 'venda', cliente_id: 'cliente', forma_pagamento: 'Venda', total: Math.max(0, saldoReal), status: 'concluida' }];
      if (editando) vendas.push(consignado());
      const pagamentos = [{ id: 'pagamento', cliente_id: 'cliente', valor: Math.max(0, -saldoReal) }];
      const { ctx, avisos } = fluxo(vendas, pagamentos);
      const financeiroAntes = clone(ctx.saldoFinanceiroCliente('cliente'));
      const pagamentosAntes = JSON.stringify(ctx.state.pagamentos);
      const vendaAntes = JSON.stringify(ctx.state.vendas[0]);
      ctx.totaisPedidoClienteRascunho = () => ({ subtotal: 787.5, desconto: 0, total: 787.5 });
      vm.runInContext(`let pedidoClienteSalvando = false; let pedidoClienteRascunho = {
        clienteId: 'cliente', tipo: 'consignado', data: '2026-10-21',
        editandoId: ${editando ? "'consignado'" : "''"},
        itens: [{ produto_id: 'produto', quantidade: 3, preco: 262.5 }]
      };`, ctx);
      vm.runInContext(trecho('async function finalizarPedidoCliente()', 'function abrirEditarPedido('), ctx);
      await ctx.finalizarPedidoCliente();
      assert.deepEqual(avisos, editando ? ['Pedido atualizado.'] : []);
      const salvo = ctx.state.vendas.find((item) => item.id === (editando ? 'consignado' : 'venda-nova'));
      assert.ok(salvo);
      semSaldo(JSON.parse(salvo.observacoes));
      assert.equal(salvo.total, 787.5);
      assert.equal(salvo.itens[0].quantidade, 3);
      assert.equal(ctx.resumoComprovantePedido(salvo), null);
      const depois = ctx.saldoFinanceiroCliente('cliente');
      assert.equal(depois.debito, financeiroAntes.debito);
      assert.equal(depois.credito, financeiroAntes.credito);
      assert.equal(depois.consignado, 787.5);
      assert.equal(JSON.stringify(ctx.state.pagamentos), pagamentosAntes);
      assert.equal(JSON.stringify(ctx.state.vendas.find((item) => item.id === 'venda')), vendaAntes);
    });
  }
}

for (const editando of [false, true]) {
  test(`${editando ? 'edição' : 'criação'} online envia consignado sem saldos mesmo após conferência financeira do servidor`, async () => {
    const { ctx, avisos } = fluxo(editando ? [consignado()] : []);
    const enviados = [];
    ctx.backendAtivo = true;
    ctx.navigator.onLine = true;
    ctx.saldoFinanceiroConfirmadoCliente = async () => ({ debito: 182, credito: 0 });
    ctx.totaisPedidoClienteRascunho = () => ({ subtotal: 787.5, desconto: 0, total: 787.5 });
    ctx.executarMutacaoGarantidaVendas = async (_tipo, _id, _dados, gravar) => gravar();
    ctx.reconciliarFinanceiroCliente = async () => {};
    ctx.valoresMonetariosConferem = (a, b) => a === b;
    const gravar = async (venda) => { enviados.push(clone(venda)); return venda; };
    ctx.window.VendasDb = { saveOrder: gravar, updateOrder: gravar };
    vm.runInContext(`let pedidoClienteSalvando = false; let pedidoClienteRascunho = {
      clienteId: 'cliente', tipo: 'consignado', data: '2026-10-21',
      editandoId: ${editando ? "'consignado'" : "''"},
      itens: [{ produto_id: 'produto', quantidade: 3, preco: 262.5 }]
    };`, ctx);
    vm.runInContext(trecho('async function finalizarPedidoCliente()', 'function abrirEditarPedido('), ctx);
    await ctx.finalizarPedidoCliente();
    assert.deepEqual(avisos, editando ? ['Pedido atualizado.'] : []);
    assert.equal(enviados.length, 1);
    semSaldo(JSON.parse(enviados[0].observacoes));
    assert.equal(enviados[0].forma_pagamento, 'Consignado');
    assert.equal(enviados[0].total, 787.5);
  });
}

for (const quantidade of [1, 3]) {
  for (const online of [false, true]) {
    test(`conversão ${quantidade === 3 ? 'total' : 'parcial'} ${online ? 'no servidor simulado' : 'local'} limpa somente saldos do consignado`, async () => {
      const { ctx, avisos } = fluxo([consignado()]);
      const original = JSON.stringify(ctx.state.vendas[0]);
      const gravacoes = [];
      ctx.backendAtivo = online;
      ctx.window.VendasDb = {
        saveOrder: async (dado) => { gravacoes.push(['venda', clone(dado)]); return dado; },
        updateOrder: async (dado) => { gravacoes.push(['consignado', clone(dado)]); return dado; },
      };
      vm.runInContext(`let conversaoConsignadoRascunho = { pedidoId: 'consignado', dataPedido: '2026-10-21', quantidades: { 0: ${quantidade} } };`, ctx);
      vm.runInContext(trecho('async function gerarPedidoDoConsignado(', 'function dataComprovante('), ctx);
      await ctx.gerarPedidoDoConsignado('consignado');
      assert.deepEqual(avisos, ['Pedido gerado e consignado atualizado.']);
      assert.equal(ctx.state.vendas.length, 2);
      const restante = ctx.state.vendas.find((item) => item.id === 'consignado');
      const venda = ctx.state.vendas.find((item) => item.id === 'venda-nova');
      const meta = JSON.parse(restante.observacoes);
      semSaldo(meta);
      assert.equal(meta.custo_total, 120, 'metadado operacional preservado');
      assert.equal(meta.convertido_parcialmente, true);
      assert.equal(restante.status, quantidade === 3 ? 'convertida' : 'concluida');
      assert.equal(restante.total, (3 - quantidade) * 262.5);
      assert.equal(venda.forma_pagamento, 'Venda');
      assert.equal(venda.total, quantidade * 262.5);
      assert.equal(JSON.parse(venda.observacoes).consignado_origem_id, 'consignado');
      assert.equal(ctx.saldoFinanceiroCliente('cliente').debito, venda.total, 'só o que virou venda gera débito');
      assert.equal(ctx.state.pagamentos.length, 0);
      if (online) {
        assert.equal(gravacoes.length, 2);
        semSaldo(JSON.parse(gravacoes[1][1].observacoes));
      }
      assert.ok(original.includes('182'), 'fixture contém o retrato legado reportado');
    });
  }
}

test('falha ao atualizar consignado mantém rollback da venda e os dados originais', async () => {
  const { ctx, avisos } = fluxo([consignado()]);
  const antes = JSON.stringify(ctx.state);
  const excluidos = [];
  ctx.backendAtivo = true;
  ctx.window.VendasDb = {
    saveOrder: async (dado) => dado,
    updateOrder: async () => { throw new Error('falha simulada'); },
    deleteOrder: async (id) => { excluidos.push(id); },
  };
  vm.runInContext("let conversaoConsignadoRascunho = { pedidoId: 'consignado', dataPedido: '2026-10-21', quantidades: { 0: 1 } };", ctx);
  vm.runInContext(trecho('async function gerarPedidoDoConsignado(', 'function dataComprovante('), ctx);
  await ctx.gerarPedidoDoConsignado('consignado');
  assert.deepEqual(avisos, ['falha simulada']);
  assert.deepEqual(excluidos, ['venda-nova']);
  assert.equal(JSON.stringify(ctx.state), antes);
});
