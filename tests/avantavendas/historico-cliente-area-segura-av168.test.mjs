import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);
const estilos = await readFile(new URL('app/avantavendas/sistema/styles.css', raiz), 'utf8');

test('Histórico do cliente limita o card à área visível e respeita áreas seguras', () => {
  assert.match(estilos, /--vendas-modal-safe-top:\s*max\(24px, calc\(var\(--vendas-safe-top\) \+ 12px\)\)/);
  assert.match(estilos, /--vendas-modal-safe-bottom:\s*max\(24px, calc\(var\(--vendas-safe-bottom\) \+ 12px\)\)/);
  assert.match(estilos, /\.client-detail-backdrop \{ padding: var\(--vendas-modal-safe-top\) 12px var\(--vendas-modal-safe-bottom\); \}/);
  assert.match(estilos, /\.client-detail-backdrop \.sheet \{[^}]*max-height: calc\(var\(--vendas-viewport-height\) - var\(--vendas-modal-safe-top\) - var\(--vendas-modal-safe-bottom\)\);[^}]*box-sizing: border-box;[^}]*overflow: hidden;/);
  assert.match(estilos, /\.client-detail-content \{[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;/);
});
