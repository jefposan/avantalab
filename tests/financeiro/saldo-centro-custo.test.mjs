import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const dashboard = readFileSync('app/components/Dashboard.tsx', 'utf8');

test('Saldo do Mês inicia em Todos e alterna entre consolidado e centro individual', () => {
  assert.match(gestao, /useState\('todos'\)/);
  assert.match(gestao, /const saldoDoPerfilInteiro = !centrosCustoAtivo \|\| centroCustoSaldoId === 'todos';/);
  assert.match(gestao, /const lancamentosSaldoCard = saldoDoPerfilInteiro \? lancamentosConsolidados : lancamentos;/);
  assert.match(gestao, /const faturamentosSaldoCard = saldoDoPerfilInteiro \? faturamentosConsolidados : faturamentos;/);
  assert.match(gestao, /const faturamentosEntradasSaldoCard = saldoDoPerfilInteiro/);
});

test('lista do Saldo do Mês oferece Todos e os centros ativos', () => {
  assert.match(dashboard, /aria-label="Selecionar centro de custo do saldo"/);
  assert.match(dashboard, /<option value="todos">Todos<\/option>/);
  assert.match(dashboard, /centrosCustoAtivos\.map\(\(centro\)/);
});
