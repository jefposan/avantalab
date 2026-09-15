import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { consolidarReceitasRealizadasPorMes } from '../../app/lib/financeiro-consolidado.ts';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');

test('receitas consolidadas somam os centros do perfil e excluem somente previsões', () => {
  const receitas = consolidarReceitasRealizadasPorMes([
    { mes: 'JANEIRO', valor: 100, status: null },
    { mes: 'JANEIRO', valor: 250, status: null },
    { mes: 'JANEIRO', valor: 80, status: 'prevista' },
    { mes: 'FEVEREIRO', valor: 90, status: null },
  ]);

  assert.deepEqual(receitas, { JANEIRO: 350, FEVEREIRO: 90 });
});

test('balanço e gráficos usam o consolidado; relatório pode derivar um centro sem perder Todos', () => {
  assert.match(gestao, /const \[lancamentosConsolidados, setLancamentosConsolidados\]/);
  assert.match(gestao, /buscarLancamentos\(empresaId, ano\)/);
  assert.match(gestao, /buscarFaturamentosEntradas\(empresaId, ano\)/);
  assert.equal((gestao.match(/lancamentos=\{lancamentosConsolidados\}/g) || []).length, 2);
  assert.equal((gestao.match(/faturamentos=\{faturamentosConsolidados\}/g) || []).length, 2);
  assert.match(gestao, /const lancamentosRelatorio = relatorioConsolidado/);
  assert.match(gestao, /lancamentos=\{lancamentosRelatorio\}/);
  assert.match(gestao, /faturamentos=\{faturamentosRelatorio\}/);
});
