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
const migracaoNormalizacao = readFileSync(
  'supabase/migrations/20260812170000_normalizar_receitas_por_entradas.sql',
  'utf8',
);

test('Gestão Web oferece somente o lançamento individual de receitas', () => {
  assert.doesNotMatch(dashboard, /Definir total do mês|Excluir total do mês/);
  assert.doesNotMatch(gestao, /Receitas avulsas existentes|Apagar avulsas/);
  assert.doesNotMatch(gestao, /solicitarFaturamentoDashboard|excluirTotalMes/);
  assert.doesNotMatch(balanco, /handleFaturamentoChange|salvarFaturamentoMes/);
  assert.match(dashboard, /Lançar receita/);
});

test('receita do Dashboard permite direcionar ao centro de custo sem trocar o contexto da página', () => {
  assert.match(dashboard, /centro-custo-entrada-dashboard/);
  assert.match(dashboard, /centrosCustoAtivos\.length > 1/);
  assert.match(gestao, /centroCustoEntradaDashboardId/);
  assert.match(gestao, /adicionarEntradaFaturamento\(mesSelecionado, centroCustoEntradaDashboardId\)/);
});

test('campo de dia da receita é somente digitável e não exibe controles numéricos', () => {
  assert.match(dashboard, /inputMode="numeric"/);
  assert.match(dashboard, /aria-label="Dia da receita"/);
  assert.match(dashboard, /text-center text-sm font-bold/);
  assert.doesNotMatch(dashboard, /type="number" min="1" max="31" value=\{entradaFaturamentoDia\}/);
});

test('campo de dia é limpo ao voltar a receber foco para uma nova digitação', () => {
  assert.match(dashboard, /onFocus=\{\(\) => setEntradaFaturamentoDia\(''\)\}/);
  assert.doesNotMatch(gestao, /contextoRascunhoReceitaRef/);
});

test('campo de dia da receita aceita somente dias de 1 a 31', () => {
  assert.match(dashboard, /const dia = Number\(valor\)/);
  assert.match(dashboard, /dia >= 1 && dia <= 31/);
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

test('resumos históricos divergentes são normalizados pela soma das entradas', () => {
  assert.match(migracaoNormalizacao, /insert into public\.faturamentos_entradas/);
  assert.match(migracaoNormalizacao, /f\.valor - coalesce\(entradas\.total, 0\) > 0\.009/);
  assert.match(migracaoNormalizacao, /update public\.faturamentos f/);
  assert.match(migracaoNormalizacao, /valor = coalesce\(\(\s*select sum\(e\.valor\)/);
  assert.match(migracaoNormalizacao, /coalesce\(e\.status, ''\) <> 'prevista'/);
  assert.match(migracaoNormalizacao, /referencia_total_mensal = false/);
});
