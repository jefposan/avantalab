import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const [aplicacao, estilos] = await Promise.all([
  readFile(resolve(raiz, 'app/avantavendas/sistema/app.js'), 'utf8'),
  readFile(resolve(raiz, 'app/avantavendas/sistema/styles.css'), 'utf8'),
]);

const inicioCompartilhamento = aplicacao.indexOf('async function compartilharMateriaisSelecionadosDivulgacao()');
const fimCompartilhamento = aplicacao.indexOf('\nasync function compartilharMaterialDivulgacao(', inicioCompartilhamento);
const compartilhamentoMultiplo = aplicacao.slice(inicioCompartilhamento, fimCompartilhamento);

test('Divulgação permite selecionar até dez arquivos da pasta atual', () => {
  assert.match(aplicacao, /const LIMITE_SELECAO_MATERIAIS_DIVULGACAO = 10;/);
  assert.match(aplicacao, /const divulgacaoMateriaisSelecionados = new Set\(\);/);
  assert.match(aplicacao, /aria-pressed="\$\{selecionado\}"/);
  assert.match(aplicacao, /Selecionar mais/);
  assert.match(estilos, /\.material-thumb\.is-selected/);
  assert.match(estilos, /\.material-selection-bar \{ position: fixed;/);
});

test('arquivos são preparados em sequência e compartilhados sem texto automático', () => {
  assert.ok(inicioCompartilhamento >= 0 && fimCompartilhamento > inicioCompartilhamento);
  assert.match(compartilhamentoMultiplo, /for \(let indice = 0; indice < materiais\.length; indice \+= 1\)/);
  assert.match(compartilhamentoMultiplo, /navigator\.share\(\{ files: arquivos \}\)/);
  assert.doesNotMatch(compartilhamentoMultiplo, /navigator\.share\(\{[^}]*\b(?:text|title|url)\s*:/);
  assert.match(compartilhamentoMultiplo, /zip\.generateAsync\(\{ type: 'blob', compression: 'STORE' \}\)/);
  assert.match(compartilhamentoMultiplo, /materiais-avantalab\.zip/);
});
