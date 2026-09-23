import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const banco = readFileSync('app/lib/database.ts', 'utf8');
const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const tabela = readFileSync('app/components/TabelaLancamentosDespesa.tsx', 'utf8');

test('despesas fixas contínuas preservam uma janela idempotente de três meses futuros', () => {
  assert.match(banco, /garantirFixasDoMesAtual\(empresaId: string, mesesAdiante = 3\)/);
  assert.match(banco, /const horizonte = Math\.max\(1, Math\.min\(60, Math\.trunc\(mesesAdiante\) \|\| 3\)\)/);
  assert.match(banco, /Array\.from\(\{ length: horizonte \+ 1 \}/);
  assert.match(banco, /l\.recorrencia_id === rec\.id/);
});

test('Gestão Web expõe Sempre no editor e converte lançamentos fixos legados com segurança', () => {
  assert.match(tabela, /Despesa fixa · Sempre/);
  assert.match(tabela, /Manter sempre/);
  assert.match(gestao, /const definirDespesaFixaSempre = async/);
  assert.match(gestao, /recorrencia_id: recorrenciaId/);
  assert.match(gestao, /await garantirFixasDoMesAtual\(empresaId, 3\)/);
  assert.match(gestao, /onDefinirDespesaFixaSempre=\{definirDespesaFixaSempre\}/);
});
