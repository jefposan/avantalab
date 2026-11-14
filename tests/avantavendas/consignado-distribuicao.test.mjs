import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = ['resumoConsignadosDashboard', 'clientesDoProdutoConsignadoDashboard', 'conteudoDistribuicaoConsignadoDashboard', 'abrirDistribuicaoConsignadoDashboard', 'ordenarDistribuicaoConsignadoDashboard', 'abrirClienteDashboard', 'sheet', 'fecharSheet', 'escapeHtml', 'escapeAttr'];
function ambiente() {
  class Elemento {
    constructor(classes = '') { this.classList = { contains: c => classes.split(' ').includes(c), add() {}, remove() {} }; this.style = {}; this.isConnected = false; this.attrs = {}; this.scrollTop = 0; this.handlers = {}; }
    setAttribute(k,v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; }
    focus() { document.activeElement = this; }
    blur() {}
    contains(x) { return x === this.close; }
    querySelector(s) { if (s === '.sheet') return this.card; if (s === '.consignment-distribution-list') return this.list; if (s === '.close') return this.close; return null; }
    querySelectorAll() { return []; }
    addEventListener(k, fn) { this.handlers[k] = fn; }
    remove() { this.isConnected = false; }
  }
  const nodes = [];
  const document = {
    body: new Elemento(), documentElement: new Elemento(), activeElement: new Elemento(),
    getElementById: id => nodes.find(n => n.id === id && n.isConnected),
    querySelector: () => document.getElementById('sheetBackdrop')?.card,
    createElement: () => {
      const node = new Elemento(); node.card = new Elemento(); node.card.close = new Elemento(); node.list = new Elemento();
      Object.defineProperty(node, 'className', { set(c) { node.classList = { contains: x => c.split(' ').includes(x) }; } });
      nodes.push(node); return node;
    },
  };
  document.body.appendChild = n => { n.isConnected = true; };
  const venda = (cliente, quantidade, extra = {}) => ({ cliente_id: cliente, ativo: true, total: quantidade * 10, itens: [{produto_id:'p1', produto_nome:'Cronograma', quantidade}], ...extra });
  const state = { clientes: [{id:'c1',nome:'Zélia'},{id:'c2',nome:'Ana'}], vendas: [venda('c1',3),venda('c1',4),venda('c2',2),venda('c2',50,{ativo:false}),venda('c2',100,{itens:[{produto_id:'p2',quantidade:100}]}),venda('c1',80,{itens:[{produto_id:'p1',quantidade:80,bonificado:true}]})] };
  const ctx = vm.createContext({ state, document, HTMLElement: Elemento, cancelAnimationFrame() {}, window: { scrollTo() {} },
    pedidoConsignadoAtivo: v => v.ativo, itemPedidoBonificado: i => i.bonificado,
    renderCliente: c => '<article data-ficha-real="' + c.id + '"></article>', svgIcon: () => '<svg></svg>',
    elementoRolagemAnteriorSheet:null, rolagemAnteriorSheet:0, sincronizacaoRetomadaAguardandoTela:false,
    elementoRolagemPrincipalVendas: () => document.body, posicaoRolagemPrincipalVendas: () => 0, prepararSheetTransacaoParaTeclado() {}, atualizarAlturaEstruturalSheetTransacao() {},
  });
  vm.runInContext('let distribuicaoConsignadoDashboard = null;\n' + ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text)).map(n => n.getText(ast)).join('\n'), ctx);
  return {ctx, document, nodes};
}
test('agrupa o saldo ativo por cliente e produto, com ordenação quantidade asc/desc e nome', () => {
  const {ctx} = ambiente(), antes = JSON.stringify(ctx.state);
  const ids = ordem => Array.from(ctx.clientesDoProdutoConsignadoDashboard('p1',ordem), x=>x.id);
  assert.deepEqual(ids('quantidade-desc'), ['c1','c2']);
  assert.deepEqual(ids('quantidade-asc'), ['c2','c1']);
  assert.deepEqual(ids('nome'), ['c2','c1']);
  assert.equal(ctx.clientesDoProdutoConsignadoDashboard('p1')[0].quantidade,7);
  assert.equal(ctx.resumoConsignadosDashboard().produtos.find(p=>p.chave==='p1').quantidade,9);
  assert.equal(JSON.stringify(ctx.state),antes);
});
test('mesma ficha do cliente fica sobre a lista e fechar restaura nó, posição e ordenação', () => {
  const {ctx,document} = ambiente();
  ctx.abrirDistribuicaoConsignadoDashboard('p1');
  ctx.ordenarDistribuicaoConsignadoDashboard('nome');
  const lista = document.getElementById('sheetBackdrop');
  lista.list.scrollTop = 213;
  const linha = document.activeElement;
  ctx.abrirClienteDashboard('c2');
  const ficha = document.getElementById('sheetBackdrop');
  assert.notEqual(ficha,lista);
  assert.equal(ficha.__consignadoAnterior,lista);
  assert.match(ficha.innerHTML,/data-ficha-real="c2"/);
  assert.equal(lista.inert,true);
  ctx.fecharSheet();
  assert.equal(document.getElementById('sheetBackdrop'),lista);
  assert.equal(lista.list.scrollTop,213);
  assert.equal(lista.inert,false);
  assert.equal(document.activeElement,linha);
  assert.match(ctx.conteudoDistribuicaoConsignadoDashboard(),/class="active" aria-pressed="true" onclick="ordenarDistribuicaoConsignadoDashboard\('nome'\)"/);
  // Repetição pelo clique fora da ficha usa o mesmo fechamento.
  ctx.abrirClienteDashboard('c1');
  const segunda = document.getElementById('sheetBackdrop');
  segunda.handlers.click({target:segunda});
  assert.equal(document.getElementById('sheetBackdrop'),lista);
});
test('navegar da ficha a outra operação não deixa popup oculto nem IDs duplicados', () => {
  const {ctx,document,nodes} = ambiente();
  ctx.abrirDistribuicaoConsignadoDashboard('p1');
  ctx.abrirClienteDashboard('c1');
  ctx.sheet('<div>Outro formulário</div>', 'sheet-backdrop-centered');
  assert.equal(nodes.filter(n=>n.isConnected).length,1);
  assert.equal(document.getElementById('distribuicaoConsignadoSuspensa'),undefined);
});
