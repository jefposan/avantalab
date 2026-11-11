import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const require = createRequire(import.meta.url);

test('marca aprovada é recortada sem slogan, preservando pixels do desenho e A/V', async () => {
  const source = new URL('app/avantavendas/sistema/assets/logo-avantavendas-aprovado-20261025-v2.jpg', root);
  assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'), '222e26de8bbaabbe5a0a8845f3a78a90eef3f3d8dd5ecfd94500a83c685277be');
  const original = await sharp(source.pathname).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const output = await sharp(new URL('app/avantavendas/sistema/assets/logo-avantavendas-positivo.png', root).pathname).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(output.info.width, 1258); assert.equal(output.info.height, 184);
  let checked = 0;
  for (let y = 0; y < 184; y++) for (let x = 0; x < 1258; x++) {
    const i = ((y + 76) * original.info.width + x + 11) * 3, o = (y * 1258 + x) * 4;
    const rgb = [...original.data.subarray(i, i + 3)];
    if (Math.min(...rgb) > 20) continue;
    assert.deepEqual([...output.data.subarray(o, o + 3)], rgb);
    assert.equal(output.data[o + 3], 255); checked++;
  }
  assert.ok(checked > 20000);
  assert.equal(output.data[3], 0);
});

test('mobile utiliza exatamente a marcação do LoadingPontos oficial sem duplicar animação', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read('app/components/LoadingPontos.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require });
  const html = renderToStaticMarkup(React.createElement(exports.default));
  const app = read('app/avantavendas/sistema/app.js');
  const code = app.slice(app.indexOf('function renderMarcaAcesso()'), app.indexOf('function atualizarProgressoPreparacao('));
  const context = vm.createContext({ document: { getElementById: id => id === 'vendasAccessLoadingTemplate' ? { innerHTML: html } : null }, window: { __AVANTALAB_VENDAS_PROGRESSO__: { valor: 34, rotulo: 'Validando sua sessão' } }, escapeHtml: s => s });
  vm.runInContext(code, context);
  assert.equal(context.renderLoadingPreparacaoVendas(), html);
  const preparing = context.renderPreparandoAcesso();
  assert.equal((preparing.match(/<i style="--av-ponto-atraso:/g) || []).length, 10);
  assert.ok(preparing.includes(html));
  assert.match(preparing, /aria-live="polite" aria-busy="true"/);
  assert.match(preparing, />34%<\/b>/);
  assert.doesNotMatch(preparing, /class="loader"|<button|Cancelar/);
  assert.doesNotMatch(read('app/avantavendas/sistema/styles.css'), /@keyframes avanta-pontos-onda/);
  assert.match(read('app/layout.tsx'), /import "\.\/globals.css"/);
  assert.match(read('app/avantavendas/page.tsx'), /<template id="vendasAccessLoadingTemplate"><LoadingPontos \/><\/template>/);
});

test('cabeçalho possui variantes por tema e novos recursos não reutilizam o cache antigo', () => {
  for (const p of ['app/avantavendas/page.tsx', 'app/avantavendas/sistema/app.js', 'app/avantavendas/sw.js/route.ts']) {
    assert.match(read(p), /logo-avantavendas-positivo-20261110\.png/);
  }
  const css = read('app/avantavendas/sistema/styles.css');
  assert.match(css, /\.dark-theme \.vendas-logo-claro \{ display: none !important; \}/);
  assert.match(css, /\.dark-theme \.vendas-logo-escuro \{ display: block !important; \}/);
  assert.match(css, /aspect-ratio: 1316 \/ 167/);
});

for (const platform of ['ios', 'android']) {
  const path = platform === 'ios' ? 'ios/App/App/capacitor.config.json' : 'android/app/src/main/assets/capacitor.config.json';
  const file = new URL('native/avantavendas/' + path, root);
  test(`${platform}: configuração existente usa a interface remota HTTPS`, { skip: !existsSync(file) && 'Projeto nativo não enviado no pacote Web' }, () => {
    const config = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(config.server.url, 'https://vendas.avantalab.com.br');
    assert.equal(config.server.cleartext, false);
  });
}
