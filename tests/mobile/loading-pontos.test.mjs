import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
const exports = {};
vm.runInNewContext(ts.transpileModule(read('app/components/LoadingPontos.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require });
const html = renderToStaticMarkup(React.createElement(exports.default));
const app = read('public/mobile-app.js');
const code = app.slice(app.indexOf('function renderLoadingPreparacaoMobile()'), app.indexOf('function telaPreparacaoAcessoMobileVisivel()'));

for (const nativo of [false, true]) test(`loading oficial preserva progresso e recuperação no ${nativo ? 'nativo' : 'PWA'}`, () => {
  const ctx = vm.createContext({
    document: { getElementById: id => id === 'gestaoAccessLoadingTemplate' ? { innerHTML: html } : null },
    window: { location: { search: '?entrar=1' }, __AVANTALAB_MOBILE_PROGRESSO__: { valor: 34, rotulo: 'Validando sua sessão' } },
    URLSearchParams, state: { autenticado: false }, loginSocialMobileEmAndamento: () => true,
    ehLojaNativaMobile: () => nativo, cenaAcessoGestaoMobile: s => s, escapeHtml: s => s,
  });
  vm.runInContext(code, ctx);
  assert.equal(ctx.renderLoadingPreparacaoMobile(), html);
  // DOM real após hidratação React: content vazio e filho no próprio template.
  ctx.document.getElementById = () => ({ innerHTML: '', firstElementChild: { outerHTML: html } });
  assert.equal(ctx.renderLoadingPreparacaoMobile(), html);
  const result = ctx.telaCarregandoMobile();
  assert.ok(result.includes(html));
  assert.equal((result.match(/<i style="--av-ponto-atraso:/g) || []).length, 10);
  assert.match(result, />34%<\/b>/);
  assert.match(result, /aria-live="polite" aria-busy="true"/);
  assert.match(result, /cancelar-login-social-mobile/);
  assert.equal(result.includes('mobileAccessContinueButton'), !nativo);
  ctx.loginSocialMobileEmAndamento = () => false;
  assert.match(ctx.telaCarregandoMobile(), /Abrindo acesso/);
  ctx.document.getElementById = () => null;
  assert.match(ctx.renderLoadingPreparacaoMobile(), /gestao-access-loader/);
});
