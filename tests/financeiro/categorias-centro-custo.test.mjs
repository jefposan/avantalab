import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const categorias = readFileSync('app/components/PorCategoria.tsx', 'utf8');

test('Categorias recebe os lançamentos consolidados e o centro global selecionado', () => {
  assert.match(gestao, /lancamentos=\{lancamentosConsolidadosRealizadosAno\}/);
  assert.match(gestao, /centroCustoId=\{centrosCustoAtivo \? centroCustoSelecionadoId : undefined\}/);
});

test('Categorias mantém o total anual sem um segundo seletor de centro de custo', () => {
  assert.doesNotMatch(categorias, /Selecionar centro de custo das categorias/);
  assert.match(categorias, /Total de despesas anual/);
  assert.match(categorias, /lg:grid-cols-3 lg:items-center/);
});

test('Categorias filtra tabela, totais e distribuição pelo centro global escolhido', () => {
  assert.match(categorias, /lancamento\.centroCustoId === centroCustoId/);
  assert.match(categorias, /const lancamentosDoCentro = useMemo/);
  assert.match(categorias, /lancamentosDoCentro\.forEach/);
  assert.match(categorias, /return lancamentosDoCentro/);
  assert.match(categorias, /acc\[mes\] = lancamentosDoCentro/);
});
