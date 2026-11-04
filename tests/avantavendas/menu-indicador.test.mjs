import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const ler = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const fonte = ler('app/avantavendas/sistema/app.js');
const ast = ts.createSourceFile('app.js', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nomes = ['atalhosInferioresVendasDisponiveis', 'atalhoInferiorVendasValido', 'dadosAtalhoInferiorVendas',
  'itemNavegacaoInferior', 'renderNavegacaoInferior', 'assinaturaNavegacaoInferior',
  'removerNavegacaoInferior', 'indiceIndicadorNavegacaoInferior', 'atualizarIndicadorNavegacaoInferior', 'sincronizarNavegacaoInferior'];
const codigo = ast.statements.filter(s => ts.isFunctionDeclaration(s) && nomes.includes(s.name?.text)
  || ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(ast) === 'ATALHOS_INFERIORES_VENDAS'))
  .map(s => s.getText(ast)).join('\n');

function ambiente() {
  const indicador = { style: {}, getBoundingClientRect() { return { width: 60 }; } };
  let nav = null; let insercoes = 0;
  const criarArea = () => ({ appendChild(n) { nav = n; n.parentElement = this; },
    insertAdjacentHTML() { insercoes++; nav = { dataset: {}, parentElement: this,
      setAttribute(k, v) { if (k === 'data-assinatura') this.dataset.assinatura = v; },
      querySelector: () => indicador,
      remove() { if (nav === this) nav = null; } }; } });
  let area = criarArea();
  const ctx = vm.createContext({
    state: { menuAberto: true, aba: 'dashboard', atalhoInferiorEsquerdo: 'tema', atalhoInferiorDireito: 'agenda' },
    acaoNavegacaoInferiorEmCurso: '', navegacaoInferiorPersistida: null,
    app: { querySelector: () => area }, iconeNavegacaoInferior: () => '<svg></svg>',
    document: { getElementById: () => nav, querySelector: () => nav ? indicador : null },
  });
  vm.runInContext(codigo, ctx);
  return { ctx, indicador, get nav() { return nav; }, get insercoes() { return insercoes; },
    renderizar() { nav = null; area = criarArea(); ctx.sincronizarNavegacaoInferior(); },
    semArea() { area = null; ctx.sincronizarNavegacaoInferior(); } };
}

test('linha acompanha sala, configurações, atalhos personalizados e ação clicada', () => {
  const { ctx } = ambiente();
  assert.equal(ctx.indiceIndicadorNavegacaoInferior(), 4);
  ctx.state.menuAberto = false; ctx.state.aba = 'configuracoes';
  assert.equal(ctx.indiceIndicadorNavegacaoInferior(), 0);
  ctx.state.aba = 'agenda'; assert.equal(ctx.indiceIndicadorNavegacaoInferior(), 3);
  ctx.state.atalhoInferiorEsquerdo = 'clientes'; ctx.state.aba = 'clientes';
  assert.equal(ctx.indiceIndicadorNavegacaoInferior(), 1);
  ctx.acaoNavegacaoInferiorEmCurso = 'novo'; assert.equal(ctx.indiceIndicadorNavegacaoInferior(), 2);
  ctx.acaoNavegacaoInferiorEmCurso = 'tema'; ctx.state.atalhoInferiorEsquerdo = 'tema';
  assert.equal(ctx.indiceIndicadorNavegacaoInferior(), 1);
  ctx.acaoNavegacaoInferiorEmCurso = ''; ctx.state.aba = 'produtos';
  assert.equal(ctx.indiceIndicadorNavegacaoInferior(), 4);
});
test('renderização preserva o nó e a linha; atualização usa somente transform', () => {
  const a = ambiente(); a.ctx.sincronizarNavegacaoInferior(); const original = a.nav;
  a.ctx.state.menuAberto = false; a.ctx.state.aba = 'configuracoes'; a.renderizar();
  assert.equal(a.nav, original); assert.equal(a.insercoes, 1);
  assert.equal(a.indicador.style.transform, 'translateX(0%)');
  a.ctx.acaoNavegacaoInferiorEmCurso = 'inicio'; a.ctx.atualizarIndicadorNavegacaoInferior();
  assert.equal(a.indicador.style.transform, 'translateX(400%)');
  a.ctx.state.atalhoInferiorDireito = 'produtos'; a.renderizar();
  assert.notEqual(a.nav, original); assert.equal(a.insercoes, 2);
});
test('saída, preparação e ausência de shell descartam referência antiga', () => {
  const a = ambiente(); a.ctx.sincronizarNavegacaoInferior();
  a.ctx.acaoNavegacaoInferiorEmCurso = 'novo'; a.ctx.removerNavegacaoInferior();
  assert.equal(a.ctx.navegacaoInferiorPersistida, null); assert.equal(a.nav, null);
  assert.equal(a.ctx.acaoNavegacaoInferiorEmCurso, '');
  a.ctx.sincronizarNavegacaoInferior(); a.semArea();
  assert.equal(a.ctx.navegacaoInferiorPersistida, null); assert.equal(a.nav, null);
});
test('linha decorativa não intercepta toque, mantém dimensões da referência e movimento reduzido', () => {
  const { ctx } = ambiente();
  assert.match(ctx.renderNavegacaoInferior(), /vendas-nav-indicador-trilho" aria-hidden="true"/);
  const css = ler('app/avantavendas/sistema/styles.css');
  assert.match(css, /\.vendas-nav-indicador-trilho\s*\{[^}]*pointer-events: none/);
  assert.match(css, /\.vendas-nav-indicador\s*\{[^}]*width: 20%; height: 2px;[^}]*transition: transform 300ms ease-out/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.vendas-nav-indicador \{ transition: none; \}/);
  assert.doesNotMatch(codigo, /setTimeout|setInterval|requestAnimationFrame|localStorage|VendasDb/);
});
