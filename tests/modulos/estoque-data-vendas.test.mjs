import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const ler = (arquivo) => readFileSync(resolve(raiz, arquivo), 'utf8');
const aplicacao = ler('app/avantavendas/sistema/app.js');
const cliente = ler('app/avantavendas/sistema/supabase-client.js');
const estilos = ler('app/avantavendas/sistema/styles.css');
const migracao = ler('supabase/migrations/20260824120000_data_movimentacao_estoque_vendas.sql');

test('quantidade e data compartilham a linha da movimentação de estoque', () => {
  assert.match(aplicacao, /class="stock-movement-fields"/);
  assert.match(aplicacao, /id="estoqueQuantidade"/);
  assert.match(aplicacao, /id="estoqueData" type="date"/);
  assert.match(aplicacao, /Data de entrada/);
  assert.match(aplicacao, /Data do ajuste/);
  assert.match(estilos, /\.stock-movement-fields \{ display: grid; grid-template-columns: minmax\(0,\.72fr\) minmax\(0,1\.28fr\);/);
});

test('data informada é validada, enviada e usada no histórico', () => {
  assert.match(aplicacao, /dataMovimentacao > dataAtualEstoqueISO\(\)/);
  assert.match(aplicacao, /dataMovimentacaoEstoqueBR\(movimento\)/);
  assert.match(cliente, /p_data: dataMovimentacao/);
  assert.match(cliente, /data_movimentacao,criado_em/);
  assert.match(cliente, /order\('data_movimentacao', \{ ascending: false \}\)/);
});

test('banco preserva auditoria e grava uma data própria da movimentação', () => {
  assert.match(migracao, /add column if not exists data_movimentacao date/);
  assert.match(migracao, /criado_em at time zone 'America\/Sao_Paulo'/);
  assert.match(migracao, /p_data date/);
  assert.match(migracao, /if p_data > v_hoje then/);
  assert.match(migracao, /observacao, data_movimentacao/);
  assert.match(migracao, /notify pgrst, 'reload schema'/);
});
