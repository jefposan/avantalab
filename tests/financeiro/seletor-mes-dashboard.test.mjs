import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dashboard = readFileSync('app/components/Dashboard.tsx', 'utf8');

test('todos os seletores de mês dos cards usam rótulo visível e campo associado', () => {
  assert.match(dashboard, /htmlFor=\{id\}/);
  assert.match(dashboard, /Selecione o mês/);
  assert.match(dashboard, /id="mes-saldo-dashboard"/);
  assert.match(dashboard, /id="mes-perfis-dashboard"/);
  assert.match(dashboard, /id="mes-centros-custo-dashboard"/);
  assert.match(dashboard, /id="mes-resumo-financeiro-dashboard"/);
});
