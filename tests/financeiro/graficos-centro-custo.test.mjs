import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const graficos = readFileSync('app/components/Graficos.tsx', 'utf8');

test('Gráficos recebe entradas consolidadas e o contexto global de centro de custo', () => {
  assert.match(gestao, /faturamentosEntradas=\{faturamentosEntradasConsolidados\}/);
  assert.match(gestao, /centroCustoId=\{centrosCustoAtivo \? centroCustoSelecionadoId : undefined\}/);
});

test('filtros dos Gráficos ficam no cabeçalho e distinguem anual e mensal', () => {
  assert.doesNotMatch(graficos, /Selecionar centro de custo dos gráficos/);
  assert.match(graficos, /Visualização/);
  assert.match(graficos, /<option value="anual">Anual<\/option>/);
  assert.match(graficos, /<option value="mensal">Mensal<\/option>/);
  assert.match(graficos, /periodoGrafico === 'mensal'/);
  assert.match(graficos, /Selecione o mês/);
  assert.match(graficos, /sm:col-start-2 sm:row-start-1/);
  assert.match(graficos, /h-8 w-full rounded-lg border px-2 text-\[10px\] font-black uppercase tracking-wide/);
});

test('modo mensal e centro global selecionado filtram as fontes de todos os gráficos', () => {
  assert.match(graficos, /lancamento\.centroCustoId === centroCustoId/);
  assert.match(graficos, /faturamentosEntradas\.filter\(\(entrada\) => entrada\.centroCustoId === centroCustoId\)/);
  assert.match(graficos, /const mesesDoGrafico = useMemo/);
  assert.match(graficos, /const lancamentosNoPeriodo = useMemo/);
  assert.match(graficos, /periodoGrafico === 'mensal' \? \[mesGrafico\] : meses/);
});
