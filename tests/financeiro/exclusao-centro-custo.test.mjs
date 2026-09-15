import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const modal = readFileSync('app/components/CentrosCustoModal.tsx', 'utf8');
const database = readFileSync('app/lib/database.ts', 'utf8');
const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const migration = readFileSync('supabase/migrations/20260915110000_excluir_centros_custo_com_lancamentos.sql', 'utf8');

test('editar um centro adicional oferece exclusão confirmada e mantém a pausa', () => {
  assert.match(modal, /import ModalConfirmacao from '.\/ModalConfirmacao';/);
  assert.match(modal, /setCentroParaExcluir\(centro\)/);
  assert.match(modal, /textoConfirmar="Excluir tudo"/);
  assert.match(modal, /todo o conteúdo lançado nele serão apagados: receitas, despesas e despesas fixas de qualquer período/);
  assert.match(modal, /centro\.ativo \? 'Pausar' : 'Ativar'/);
  assert.match(modal, /centro\.is_principal \? null/);
});

test('exclusão usa uma operação atômica do banco e recarrega o financeiro atual', () => {
  assert.match(database, /excluirCentroCustoComLancamentos/);
  assert.match(database, /supabase\.rpc\('excluir_centro_custo_com_lancamentos_rpc'/);
  assert.match(gestao, /const excluirCentroCusto = async/);
  assert.match(gestao, /setRevisaoDadosFinanceiros\(\(revisao\) => revisao \+ 1\)/);
  assert.match(gestao, /onExcluir=\{excluirCentroCusto\}/);
});

test('RPC protege o Principal e remove o contexto financeiro completo', () => {
  assert.match(migration, /v_centro\.is_principal/);
  assert.match(migration, /ue\.perfil in \('gestor_master', 'administrador'\)/);
  assert.match(migration, /delete from public\.caixinhas_movimentos/);
  assert.match(migration, /delete from public\.lancamentos/);
  assert.match(migration, /delete from public\.recorrencias/);
  assert.match(migration, /delete from public\.faturamentos_entradas/);
  assert.match(migration, /delete from public\.centros_custo/);
  assert.match(migration, /security definer/);
});

test('centro pausado preserva o histórico, mas bloqueia lançamentos futuros', () => {
  assert.match(migration, /centro de custo está pausado e não aceita novos lançamentos/i);
  assert.match(database, /centrosAtivosIds/);
  assert.match(database, /rec\.centro_custo_id && !centrosAtivosIds\.has\(rec\.centro_custo_id\)/);
});
