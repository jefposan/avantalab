import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('card inteiro amplia o botão nativo sem criar outro acionador ou duplicar eventos', () => {
  const css = readFileSync('app/modulos/modulos.module.css', 'utf8');
  const tela = readFileSync('app/components/SelecaoModulos.tsx', 'utf8');
  assert.match(css, /\.module\{position:relative;cursor:pointer\}/);
  assert.match(css, /\.module button::after\{content:"";position:absolute;inset:0;/);
  assert.match(css, /\.module:has\(button:focus-visible\)/);
  assert.match(css, /\.module:has\(button:disabled\)\{cursor:wait\}/);
  assert.doesNotMatch(tela, /<article[^>]*onClick/);
  assert.match(tela, /<button disabled=\{Boolean\(opening\)\} onClick=\{\(\) => onAbrir\(m.id\)\}/);
  assert.match(tela, /styles.actionFace/);
});
