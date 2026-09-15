import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const dashboard = readFileSync('app/components/Dashboard.tsx', 'utf8');

test('Resumo Financeiro recebe receitas e despesas consolidadas do perfil', () => {
  assert.match(gestao, /const totalDespesasResumoFinanceiro = lancamentosConsolidadosRealizadosDoMes/);
  assert.match(gestao, /const receitasResumoFinanceiro = Number\(faturamentosConsolidados\[mesResumoDash\] \|\| 0\)/);
  assert.match(gestao, /lancamentosResumoFinanceiro=\{lancamentosConsolidadosRealizadosAno\}/);
  assert.match(gestao, /faturamentosResumoFinanceiro=\{faturamentosConsolidados\}/);
});

test('comparativo mensal e valores do card usam a fonte consolidada', () => {
  assert.match(dashboard, /lancamentosResumoFinanceiro\.filter/);
  assert.match(dashboard, /Total Receitas/);
  assert.match(dashboard, /formatarMoeda\(receitasResumoFinanceiro\)/);
});
