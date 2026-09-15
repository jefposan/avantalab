import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const relatorio = readFileSync('app/components/Relatorio.tsx', 'utf8');

test('Relatório acompanha o centro escolhido no cabeçalho global', () => {
  assert.match(gestao, /const relatorioConsolidado = !centrosCustoAtivo \|\| !centroCustoSelecionadoId;/);
  assert.match(gestao, /const lancamentosRelatorio = relatorioConsolidado/);
  assert.match(gestao, /faturamentosEntradasConsolidados\.filter\(\(entrada\) => entrada\.centroCustoId === centroCustoSelecionadoId\)/);
});

test('Relatório não repete o seletor de centro de custo na página', () => {
  assert.doesNotMatch(relatorio, /Selecionar centro de custo do relatório/);
  assert.doesNotMatch(relatorio, /<option value="todos">Todos<\/option>/);
});

test('Análise multianual usa as receitas por entrada e respeita o centro selecionado', () => {
  assert.match(relatorio, /\.from\('faturamentos_entradas'\)/);
  assert.match(relatorio, /\.eq\('centro_custo_id', centroCustoId\)/);
  assert.match(relatorio, /\[empresaId, centroCustoId\]/);
  assert.match(relatorio, /\.filter\(\(f\) => f\.status !== 'prevista'\)/);
});
