import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const despesas = readFileSync('app/components/TabelaLancamentosDespesa.tsx', 'utf8');
const receitas = readFileSync('app/components/TabelaEntradasFaturamento.tsx', 'utf8');
const database = readFileSync('app/lib/database.ts', 'utf8');
const mobile = readFileSync('public/mobile-app.js', 'utf8');

test('previsões da Gestão Web podem ser aceitas com a data de hoje', () => {
  assert.match(gestao, /const dataFinanceiraDeHoje = \(\) =>/);
  assert.match(gestao, /const aceitarDespesaPrevistaHoje = async/);
  assert.match(gestao, /const aceitarReceitaPrevistaHoje = async/);
  assert.match(gestao, /ano: hoje\.ano,[\s\S]*mes: hoje\.mes,[\s\S]*dia: hoje\.dia,[\s\S]*status: 'confirmada'/);
  assert.match(gestao, /anoDestino: hoje\.ano,[\s\S]*mesDestino: hoje\.mes/);
  assert.match(gestao, /if \(lancamento\) await aceitarDespesaPrevistaHoje\(lancamento\)/);
  assert.match(gestao, /if \(entrada\) await aceitarReceitaPrevistaHoje\(entrada\)/);
});

test('linhas da Gestão Web abrem para edição e mostram aceitar hoje somente em previsões', () => {
  assert.match(despesas, /onAceitarPrevistaHoje: \(lancamento: LancamentoDespesa\)/);
  assert.match(despesas, /Aceitar hoje/);
  assert.match(despesas, /onClick=\{\(event\) => \{[\s\S]*?iniciarEdicaoLancamento\(lanc\)/);
  assert.match(receitas, /onAceitarPrevistaHoje: \(entrada: EntradaFaturamento\)/);
  assert.match(receitas, /Aceitar hoje/);
  assert.match(receitas, /onClick=\{\(event\) => \{[\s\S]*?onIniciarEdicaoEntrada\(entrada\)/);
});

test('atualização de receita permite mover a previsão para o mês e ano efetivos', () => {
  assert.match(database, /anoDestino\?: number;/);
  assert.match(database, /mesDestino\?: string;/);
  assert.match(database, /ano: anoDestino \?\? ano,[\s\S]*mes: mesDestino \?\? mes/);
});

test('Gestão Mobile oferece aceitar hoje para previsão e abre confirmados em edição', () => {
  assert.match(mobile, /function periodoFinanceiroHojeMobile\(\)/);
  assert.match(mobile, /async function aceitarPrevistaHojeMobile\(tipo, id\)/);
  assert.match(mobile, /ano: hoje\.ano,[\s\S]*mes: hoje\.mes,[\s\S]*dia: hoje\.dia,[\s\S]*status: 'confirmada'/);
  assert.match(mobile, /modo: !caixinha && item\.status !== 'prevista' \? 'editar' : 'opcoes'/);
  assert.match(mobile, /id="aceitar-prevista-hoje"/);
  assert.match(mobile, /bind\('aceitar-prevista-hoje'/);
});
