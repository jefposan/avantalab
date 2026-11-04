import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const app = read('app/avantavendas/sistema/app.js');
const css = read('app/avantavendas/sistema/styles.css');
const gestao = read('app/mobile/page.tsx');
const render = app.slice(app.indexOf('function renderMarcaAcesso()'), app.indexOf('function atualizarProgressoPreparacao('));

test('verificador exige recuperação OAuth e bloqueia reintrodução do botão visual', () => {
  const validator = read('scripts/verificar-acesso-mobile.mjs');
  const start = validator.indexOf("exigir(\n  vendas.includes('function cancelarLoginSocialVendas()')");
  assert.ok(start >= 0);
  const check = validator.slice(start, validator.indexOf('\n);', start) + 3);
  const approved = vendas => {
    let result;
    vm.runInNewContext(check, { vendas, exigir: condition => { result = condition; } });
    return result;
  };
  assert.equal(approved(app), true);
  for (const required of ['function cancelarLoginSocialVendas()', "Browser.addListener('browserFinished'", 'cancelarLoginSocialVendas();', 'if (processandoRetornoOAuthNativoVendas) return;', 'limparLoginSocialPendenteVendas();', 'Promise.resolve(Browser.close()).catch']) {
    assert.equal(approved(app.replaceAll(required, 'REMOVIDO_PARA_TESTE')), false, required);
  }
  assert.equal(approved(app + 'onclick="cancelarLoginSocialVendas()"'), false);
  assert.equal(approved(app.replace('<h1>Preparando acesso</h1>', '<h1>Preparando acesso</h1><button>Cancelar e voltar ao login</button>')), false);
});

test('preparação conserva progresso real e não oferece cancelamento visual em nenhum estado social', () => {
  for (const pendente of [false, true]) for (const retorno of [false, true]) {
    const context = { window: { __AVANTALAB_VENDAS_PROGRESSO__: { valor: 34, rotulo: 'Identificando seu acesso' } }, loginSocialPendente: pendente, processandoRetornoOAuthNativoVendas: retorno, escapeHtml: s => s };
    vm.createContext(context);
    vm.runInContext(render, context);
    const html = context.renderPreparandoAcesso();
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /Identificando seu acesso/);
    assert.match(html, /width:34%/);
    assert.match(html, />34%<\/b>/);
    assert.doesNotMatch(html, /<button|Cancelar|onclick/);
    assert.equal(context.loginSocialPendente, pendente);
    assert.equal(context.processandoRetornoOAuthNativoVendas, retorno);
  }
  assert.match(app, /function cancelarLoginSocialVendas\(\)/);
});

test('card de preparação segue as medidas da Gestão sem alterar a escala do logo no login', () => {
  const rule = (text, selector) => text.slice(text.indexOf(selector)).match(/\{([^}]+)\}/)[1].replace(/\s+/g, '');
  const a = rule(css, '.preparing-access-card {');
  const b = rule(gestao, '.gestao-access-card {');
  for (const declaration of ['width:min(100%,320px);', 'gap:12px;', 'border-radius:24px;', 'padding:24px20px;', 'background:rgba(255,255,255,.38);', 'backdrop-filter:blur(18px);']) {
    assert.ok(a.includes(declaration), declaration);
    assert.ok(b.includes(declaration), declaration);
  }
  const logo = rule(css, '.preparing-access-screen .access-brand-zone img {');
  assert.ok(logo.includes('width:clamp(178.7px,60.98vw,325.92px);'));
  assert.ok(logo.includes('height:auto;'));
  assert.ok(logo.includes('max-width:90%;'));
  assert.match(rule(css, '.access-brand-zone img {'), /width:clamp\(136px,46.4vw,248px\);/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
