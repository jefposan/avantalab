import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const ler = (arquivo) => readFileSync(resolve(raiz, arquivo), 'utf8');
const aplicacao = ler('app/avantavendas/sistema/app.js');
const estilos = ler('app/avantavendas/sistema/styles.css');

test('dashboard lista somente produtos ativos com controle de estoque', () => {
  assert.match(aplicacao, /produto\.ativo !== false && produto\.estoque_controlado/);
  assert.match(aplicacao, /<th>Produto<\/th><th>Estoque atual<\/th>/);
  assert.match(aplicacao, /produto\.estoque \|\| 0/);
  assert.match(aplicacao, /produto\.unidade \|\| 'un'/);
});

test('card de estoque expande, recolhe e abre a pesquisa pela lupa', () => {
  assert.match(aplicacao, /function alternarEstoqueDashboard\(\)/);
  assert.match(aplicacao, /function alternarBuscaEstoqueDashboard\(\)/);
  assert.match(aplicacao, /placeholder="Buscar produto"/);
  assert.match(aplicacao, /oninput="atualizarBuscaEstoqueDashboard\(this\.value\)"/);
  assert.match(aplicacao, /Expandir estoque/);
  assert.match(aplicacao, />Recolher<\/button>/);
});

test('card de estoque segue o cabeçalho, busca e tema do dashboard', () => {
  assert.match(estilos, /\.dashboard-stock-actions/);
  assert.match(estilos, /\.dashboard-stock-search/);
  assert.match(estilos, /\.dark-theme \.dashboard-stock-search/);
  assert.match(estilos, /\.dashboard-stock-panel td:last-child b/);
});
