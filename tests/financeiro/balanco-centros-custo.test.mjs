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

test('balanço, gráficos e relatório usam a consulta consolidada do perfil', () => {
  assert.match(gestao, /const \[lancamentosConsolidados, setLancamentosConsolidados\]/);
  assert.match(gestao, /buscarLancamentos\(empresaId, ano\)/);
  assert.match(gestao, /buscarFaturamentosEntradas\(empresaId, ano\)/);
  assert.equal(
    (gestao.match(/lancamentos=\{lancamentosConsolidados\}/g) || []).length,
    3,
    'Balanço, Gráficos e Relatório devem receber as despesas consolidadas',
  );
  assert.equal(
    (gestao.match(/faturamentos=\{faturamentosConsolidados\}/g) || []).length,
    3,
    'Balanço, Gráficos e Relatório devem receber as receitas consolidadas',
  );
});
