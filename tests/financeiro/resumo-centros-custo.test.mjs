import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');

test('resumo de centros reapura todos os centros após a recarga financeira', () => {
  assert.match(gestao, /buscarLancamentos\(empresaId, Number\(anoSelecionado\)\)/);
  assert.match(gestao, /buscarFaturamentosEntradas\(empresaId, Number\(anoSelecionado\)\)/);
  assert.match(gestao, /faturamentosConsolidados, lancamentosConsolidados, mesCentrosCustoDashboard/);
});
