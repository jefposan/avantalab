import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Meus módulos preserva marca oficial fora do painel e proporção original', () => {
  const tela = readFileSync('app/components/SelecaoModulos.tsx', 'utf8');
  const css = readFileSync('app/modulos/modulos.module.css', 'utf8');
  assert.match(tela, /src="\/images\/avantalab-positivo-com-slogan-20261110\.webp" alt="AvantaLab" width=\{1200\} height=\{274\}/);
  assert.ok(tela.indexOf('styles.avantaBrand') < tela.indexOf('<section className={styles.panel}'));
  assert.match(css, /\.avantaBrand\{position:absolute;top:/);
  assert.match(css, /width:128px;height:auto/);
});
