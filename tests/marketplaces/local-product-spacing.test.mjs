import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('ficha local separa seções, ações, campos e confirmação sem alterar estilos globais', () => {
  const css = readFileSync(new URL('../../app/marketplaces/marketplaces.module.css', import.meta.url), 'utf8');
  assert.match(css, /\.localProductDetail > \.localSection \{ margin-bottom: 24px; \}/);
  assert.match(css, /\.localSection > \.catalogFields \{ margin-top: 16px; \}/);
  assert.match(css, /\.localSection > \.catalogMatch \{ margin: 20px 0; \}/);
  assert.match(css, /\.localSection > \.catalogMatch \+ button \{ margin-top: 0; \}/);
  assert.match(css, /\.localProductDetail > \.help \{ margin: 0 0 16px; \}/);
});
