import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { roteiroTemaConsignado } from './consignado-tema-harness.mjs';

function contexto() {
  const ctx = vm.createContext({});
  vm.runInContext(roteiroTemaConsignado, ctx);
  return ctx;
}

for (const editando of [false, true]) {
  test(`${editando ? 'editar' : 'criar'}: alternar Venda/Consignado aplica somente o tema e preserva o rascunho`, () => {
    const ctx = contexto();
    ctx.prepararPedidoQa('venda', editando);
    assert.ok(!ctx.ultimaTela.classes.includes('consignment-transaction-backdrop'));
    const original = JSON.parse(JSON.stringify(ctx.pedidoClienteRascunho));
    const totais = JSON.stringify(ctx.totaisPedidoClienteRascunho());
    ctx.selecionarTipoPedidoCliente('consignado');
    assert.ok(ctx.ultimaTela.classes.includes('consignment-transaction-backdrop'));
    assert.equal(ctx.ultimaTela.classes.includes('order-editing-backdrop'), editando);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.pedidoClienteRascunho)), { ...original, tipo: 'consignado' });
    assert.equal(JSON.stringify(ctx.totaisPedidoClienteRascunho()), totais);
    assert.ok(ctx.ultimaTela.html.includes('Bonificado'));
    ctx.selecionarTipoPedidoCliente('venda');
    assert.ok(!ctx.ultimaTela.classes.includes('consignment-transaction-backdrop'));
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.pedidoClienteRascunho)), original);
  });
}

test('consignado aberto diretamente já recebe o tema, inclusive vazio', () => {
  const ctx = contexto();
  ctx.prepararPedidoQa('consignado', false, 0);
  assert.ok(ctx.ultimaTela.classes.includes('consignment-transaction-backdrop'));
  assert.ok(ctx.ultimaTela.html.includes('Nenhum item inserido.'));
  ctx.visualizarConsignadoQa();
  assert.ok(ctx.ultimaTela.classes.includes('consignment-view-backdrop'));
  assert.ok(ctx.ultimaTela.html.includes('Comprovante de consignado'));
});

test('tema do formulário reutiliza as mesmas cores do comprovante, sem regra global sobre Venda/Pagamento', () => {
  const css = readFileSync(new URL('../../app/avantavendas/sistema/styles.css', import.meta.url), 'utf8');
  const receipt = readFileSync(new URL('../../app/avantavendas/sistema/order-receipt-v2.js', import.meta.url), 'utf8');
  assert.match(css, /\.consignment-view-backdrop, \.consignment-transaction-backdrop \{ --consignment-accent: #8550b5; --consignment-strong: #48206d;/);
  assert.match(receipt, /cabecalho: '#48206D'.*principal: '#8550B5'/);
  const scoped = css.slice(css.indexOf('/* Mesma paleta do comprovante e da visualização'));
  assert.ok(scoped.includes('.dark-theme .consignment-transaction-backdrop'));
  for (const bloco of scoped.split('}').filter(x => x.includes('{'))) {
    const seletores = bloco.slice(0, bloco.indexOf('{')).replace(/\/\*[\s\S]*?\*\//g, '').trim().split(',');
    for (const seletor of seletores) assert.ok(seletor.includes('.consignment-transaction-backdrop'), seletor);
  }
});
