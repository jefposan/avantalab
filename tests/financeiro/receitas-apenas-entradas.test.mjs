import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const dashboard = readFileSync('app/components/Dashboard.tsx', 'utf8');
const balanco = readFileSync('app/components/BalancoGeral.tsx', 'utf8');
const mobile = readFileSync('public/mobile-app.js', 'utf8');
const banco = readFileSync('app/lib/database.ts', 'utf8');
const migracao = readFileSync(
  'supabase/migrations/20260812090000_receitas_somente_por_entradas.sql',
  'utf8',
);

test('Gestão Web oferece somente o lançamento individual de receitas', () => {
  assert.doesNotMatch(dashboard, /Definir total do mês|Excluir total do mês/);
  assert.doesNotMatch(gestao, /Receitas avulsas existentes|Apagar avulsas/);
  assert.doesNotMatch(gestao, /solicitarFaturamentoDashboard|excluirTotalMes/);
  assert.doesNotMatch(balanco, /handleFaturamentoChange|salvarFaturamentoMes/);
  assert.match(dashboard, /Lançar receita/);
});

test('Gestão Mobile não mantém seletor nem confirmação de total mensal', () => {
  assert.doesNotMatch(mobile, /modo-receita-total|salvar-total-receita/);
  assert.doesNotMatch(mobile, /confirmacaoTotalReceita|salvarTotalReceita/);
  assert.doesNotMatch(mobile, /apagar todos os lançamentos de receita do mês/);
  assert.match(mobile, /id="salvar-entrada"/);
});

test('valores manuais antigos viram entradas comuns sem apagar receitas', () => {
  assert.match(migracao, /insert into public\.faturamentos_entradas/);
  assert.match(migracao, /Receita registrada anteriormente/);
  assert.match(migracao, /f\.valor - coalesce\(entradas\.total, 0\)/);
  assert.match(migracao, /set referencia_total_mensal = false/);
  assert.doesNotMatch(migracao, /delete from public\.faturamentos_entradas/);
  assert.match(banco, /referencia_total_mensal: false/);
});
