import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const ler = nome => readFileSync(new URL('../../app/avantavendas/sistema/' + nome, import.meta.url), 'utf8');

test('os cabeçalhos compartilham o seletor de conta sem redução exclusiva na dashboard', () => {
  const js = ler('app.js');
  const css = ler('styles.css');
  assert.match(js, /class="mobile-menu-header[^\n]*\$\{acoesCabecalhoSistema\(/);
  assert.match(js, /class="system-header"[^\n]*\$\{acoesCabecalhoSistema\(/);
  assert.match(css, /\.sales-profile-header-button \{[^}]*width: 88px; height: 52px;/);
  assert.match(css, /\.sales-profile-header-button \{ width: 72px; flex-basis: 72px; \}/);
  assert.doesNotMatch(css, /\.(?:mobile-menu-header|system-header)\s+\.sales-profile-header-button\b/);
});
