import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { roteiroVisualizadorMateriais } from './materiais-visualizacao-harness.mjs';

function contexto(expandido = false) {
  const classes = new Set(['material-preview-backdrop', ...(expandido ? ['material-expanded'] : [])]);
  const painel = { innerHTML: '' };
  const pdf = { __paginaPdfAtiva: 3 };
  const atributos = {};
  const botao = { setAttribute: (k,v) => atributos[k]=v, focus() {} };
  const backdrop = {
    classList: { contains: x => classes.has(x), toggle(x, force) { const adicionar = force ?? !classes.has(x); if (adicionar) classes.add(x); else classes.delete(x); return adicionar; } },
    querySelector: s => s === '.sheet' ? painel : s === '.material-preview-pdf' ? pdf : botao,
  };
  const ctx = vm.createContext({ document: { querySelector: () => backdrop, getElementById: () => backdrop }, requestAnimationFrame: f => f() });
  vm.runInContext(roteiroVisualizadorMateriais, ctx);
  return { ctx, classes, painel, pdf, atributos };
}

test('anterior e próximo usam SVGs estáveis, sem depender de glifos da fonte', () => {
  const { ctx } = contexto();
  const html = ctx.conteudoVisualizadorMaterialDivulgacao('imagem-2');
  assert.match(html, /aria-label="Visualizar material anterior"><svg[^>]*viewBox="0 0 24 24"/);
  assert.match(html, /aria-label="Visualizar próximo material"><svg[^>]*viewBox="0 0 24 24"/);
  assert.ok(html.includes('m15 6-6 6 6 6'));
  assert.ok(html.includes('m9 6 6 6-6 6'));
  assert.ok(!html.includes('>‹</button>') && !html.includes('>›</button>'));
});

for (const expandido of [false, true]) {
  test(`navegação imagem/vídeo/PDF preserva ${expandido ? 'ampliação' : 'prévia'}, ordem e preparo do compartilhamento`, () => {
    const { ctx, classes, painel } = contexto(expandido);
    ctx.navegarMaterialDivulgacao(1);
    assert.equal(ctx.divulgacaoMaterialAtualId, 'video');
    assert.equal(classes.has('material-expanded'), expandido);
    assert.match(painel.innerHTML, /<video[^>]*controls playsinline/);
    ctx.navegarMaterialDivulgacao(1);
    assert.equal(ctx.divulgacaoMaterialAtualId, 'pdf');
    assert.equal(classes.has('material-expanded'), false);
    assert.equal(classes.has('material-pdf-fullscreen'), expandido);
    assert.ok(painel.innerHTML.includes('Catálogo de teste'));
    ctx.navegarMaterialDivulgacao(1);
    assert.equal(ctx.divulgacaoMaterialAtualId, 'imagem-3');
    assert.equal(classes.has('material-expanded'), expandido);
    assert.equal(classes.has('material-pdf-fullscreen'), false);
    assert.ok(ctx.chamadasQa.includes('preparar:video') && ctx.chamadasQa.includes('preparar:pdf') && ctx.chamadasQa.includes('preparar:imagem-3'));
    const antes = painel.innerHTML;
    ctx.navegarMaterialDivulgacao(1);
    assert.equal(painel.innerHTML, antes, 'fim da lista não troca arquivo');
  });
}

test('sair/entrar do PDF conserva a página atual e o botão Voltar', () => {
  const { ctx, classes, atributos } = contexto();
  ctx.alternarPdfTelaCheia(true);
  assert.equal(classes.has('material-pdf-fullscreen'), true);
  assert.equal(atributos['aria-label'], 'Voltar à pré-visualização do PDF');
  ctx.alternarPdfTelaCheia(false);
  assert.equal(classes.has('material-pdf-fullscreen'), false);
  assert.ok(ctx.chamadasQa.includes('pagina:3'));
});

test('imagem amplia/recolhe e clique imediatamente após gesto não troca o modo', () => {
  const { ctx, classes } = contexto();
  ctx.alternarMaterialExpandido();
  assert.equal(classes.has('material-expanded'), true);
  ctx.alternarMaterialExpandido();
  assert.equal(classes.has('material-expanded'), false);
  ctx.ignorarCliqueMaterialDivulgacaoAte = Date.now() + 10000;
  let cancelado = false;
  ctx.alternarMaterialExpandido({ preventDefault() { cancelado = true; } });
  assert.equal(cancelado, true);
  assert.equal(classes.has('material-expanded'), false);
});
