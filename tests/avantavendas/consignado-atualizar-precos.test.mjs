import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const trecho = fonte.slice(fonte.indexOf('function podeAtualizarPrecosConsignado('), fonte.indexOf('function selecionarTipoPedidoCliente('));
function ambiente(produtos = []) {
  const item = { produto_id: 'p', produto_nome: 'Produto', quantidade: 2, preco: 10, bonificado: false };
  const rascunho = { editandoId: 'c', clienteId: 'cliente', tipo: 'consignado', data: '2025-12-31', itens: [item] };
  const sheet = { isConnected: true, querySelector: () => ({ scrollTop: 70 }) };
  const ctx = vm.createContext({
    pedidoClienteRascunho: rascunho, pedidoClienteSalvando: false,
    state: { vendas: [{ id: 'c', cliente_id: 'cliente', ativo: true }] },
    pedidoConsignadoAtivo: (pedido) => pedido.ativo,
    normalizar: (texto) => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    backendAtivo: true, navigator: { onLine: true }, revisaoContaVendasAtiva: 1,
    contaVendasDoContextoAtual: () => 'conta', contextoContaVendasPermaneceAtual: () => true,
    window: { VendasDb: { listarCatalogoVendas: async () => ({ produtos }) } },
    document: { getElementById: (id) => id === 'sheetBackdrop' ? sheet : null, querySelector: () => null },
    comLimiteDeTempo: (p) => p, traduzErro: (e) => e.message,
    abrirAvisoSobreSheetVendas: (...args) => { ctx.aviso = args; },
    valor: () => '2025-12-31', mostrarCardPedidoCliente: () => { ctx.renderizado = true; },
  });
  vm.runInContext(trecho, ctx);
  return { ctx, rascunho, sheet };
}
const produto = (extras = {}) => ({ id: 'p', conta_id: 'conta', nome: 'Produto', preco: 20, ...extras });

test('confere tabela fresca, pede confirmação, muda só preço no rascunho e recalcula na tela sem gravar', async () => {
  const { ctx, rascunho } = ambiente([produto()]);
  const original = JSON.stringify(rascunho);
  await ctx.atualizarPrecosConsignado();
  assert.equal(rascunho.itens[0].preco, 10);
  assert.match(ctx.aviso[0], /Confirma/);
  ctx.aviso[3].confirmar();
  assert.equal(rascunho.itens[0].preco, 20);
  assert.equal(rascunho.itens[0].quantidade, 2);
  assert.equal(rascunho.data, '2025-12-31');
  assert.ok(ctx.renderizado);
  assert.notEqual(JSON.stringify(rascunho), original);
  assert.doesNotMatch(trecho, /saveOrder|updateOrder|salvarEstado|state\.vendas\s*=/);
});
test('preços iguais retornam Sem preços para atualizar; cancelar não muda itens', async () => {
  const { ctx, rascunho } = ambiente([produto({ preco: 10 })]);
  await ctx.atualizarPrecosConsignado();
  assert.equal(ctx.aviso[0], 'Sem preços para atualizar');
  assert.equal(ctx.aviso[3].confirmar, undefined);
  assert.equal(rascunho.itens[0].preco, 10);
});
test('bonificados e preços inválidos não mudam; preço zero válido é aceito', () => {
  const { ctx } = ambiente();
  const base = { produto_id: 'p', produto_nome: 'Produto', preco: 10 };
  for (const preco of [null, '', -1, 'inválido', Infinity]) {
    const plano = ctx.compararPrecosConsignado([base], [produto({ preco })], 'conta');
    assert.equal(plano.alteracoes.length, 0);
    assert.equal(plano.pendentes.length, 1);
  }
  assert.equal(ctx.compararPrecosConsignado([{ ...base, bonificado: true }], [produto()], 'conta').alteracoes.length, 0);
  assert.equal(ctx.compararPrecosConsignado([base], [produto({ preco: 0 })], 'conta').alteracoes[0].preco, 0);
});
test('correspondência por ID, SKU único ou nome único, sem cruzar contas nem adivinhar duplicados', () => {
  const { ctx } = ambiente();
  const item = { produto_id: 'excluido', produto_nome: 'Próduto', produto_sku: 'sku', preco: 10 };
  assert.equal(ctx.compararPrecosConsignado([item], [produto({ sku: 'SKU' })], 'conta').alteracoes.length, 1);
  assert.equal(ctx.compararPrecosConsignado([item], [produto({ sku: 'SKU' }), produto({ id: 'p2', sku: 'sku' })], 'conta').pendentes.length, 1);
  assert.equal(ctx.compararPrecosConsignado([item], [produto({ sku: 'outro' })], 'conta').pendentes.length, 1);
  assert.equal(ctx.compararPrecosConsignado([{ ...item, produto_sku: '' }], [produto()], 'conta').alteracoes.length, 1);
  assert.equal(ctx.compararPrecosConsignado([{ ...item, produto_id: 'p' }], [produto({ conta_id: 'outra' })], 'conta').pendentes.length, 1);
});
test('somente consignado ativo em edição; venda, novo, convertido e conta trocada não aplicam', async () => {
  for (const mudanca of [{ tipo: 'venda' }, { editandoId: '' }]) {
    const { ctx, rascunho } = ambiente([produto()]); Object.assign(rascunho, mudanca);
    await ctx.atualizarPrecosConsignado(); assert.equal(ctx.aviso, undefined);
  }
  const { ctx, rascunho } = ambiente([produto()]);
  ctx.state.vendas[0].ativo = false;
  await ctx.atualizarPrecosConsignado(); assert.equal(ctx.aviso, undefined);
  ctx.state.vendas[0].ativo = true;
  await ctx.atualizarPrecosConsignado();
  ctx.contextoContaVendasPermaneceAtual = () => false;
  ctx.aviso[3].confirmar(); assert.equal(rascunho.itens[0].preco, 10);
});
test('duplo clique, tela fechada, rascunho alterado e resposta tardia não atualizam', async () => {
  const { ctx, rascunho, sheet } = ambiente();
  let responder, chamadas = 0;
  ctx.window.VendasDb.listarCatalogoVendas = () => { chamadas++; return new Promise((r) => { responder = r; }); };
  const carga = ctx.atualizarPrecosConsignado();
  await ctx.atualizarPrecosConsignado();
  assert.equal(chamadas, 1);
  sheet.isConnected = false;
  responder({ produtos: [produto()] }); await carga;
  assert.equal(ctx.aviso, undefined);
  assert.equal(rascunho.itens[0].preco, 10);
});
test('offline/falha não usa cache como tabela atual nem altera os preços', async () => {
  const { ctx, rascunho } = ambiente([produto()]); ctx.navigator.onLine = false;
  await ctx.atualizarPrecosConsignado();
  assert.match(ctx.aviso[0], /Não foi possível/);
  assert.equal(rascunho.itens[0].preco, 10);
  assert.equal(rascunho.atualizandoPrecos, false);
});
test('botão pertence somente ao cabeçalho e atualização não salva automaticamente', () => {
  assert.match(fonte, /podeAtualizarPrecosConsignado\(rascunho\) \? `<button id="atualizarPrecosConsignadoBotao"/);
  assert.match(fonte, /if \(rascunho.atualizandoPrecos\) return/);
  assert.match(fonte, /if \(wrap.__sheetOrigem\) wrap.__sheetOrigem.inert = true/);
});
