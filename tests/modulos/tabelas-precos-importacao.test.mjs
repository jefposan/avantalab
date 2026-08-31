import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migracao = readFileSync('supabase/migrations/20260831130000_tabelas_precos_produtos_importacao.sql', 'utf8');
const workspace = readFileSync('app/custos/CustosWorkspace.tsx', 'utf8');
const tabelas = readFileSync('app/custos/TabelasPrecosView.tsx', 'utf8');
const repositorio = readFileSync('app/custos/repository.ts', 'utf8');
const vendas = readFileSync('app/avantavendas/sistema/app.js', 'utf8');
const vendasDb = readFileSync('app/avantavendas/sistema/supabase-client.js', 'utf8');

test('tabelas de preços pertencem à empresa e possuem uma única tabela padrão', () => {
  assert.match(migracao, /create table if not exists public\.custos_tabelas_preco/);
  assert.match(migracao, /unique index if not exists custos_tabelas_preco_empresa_padrao_uidx/);
  assert.match(migracao, /where padrao/);
  assert.match(migracao, /public\.custos_pode_acessar_empresa\(empresa_id, true\)/);
  assert.match(migracao, /vendas_mobile_usuario_tem_vinculo_conta_empresa\(empresa_id, 'catalogo'\)/);
});

test('cadastro exporta e importa produtos e preços com prévia e proteção concorrente', () => {
  assert.match(workspace, /id: 'precos', rotulo: 'Tabelas de preços'/);
  assert.match(tabelas, /Exportar Excel/);
  assert.match(tabelas, /Importar Excel/);
  assert.match(tabelas, /Revisar importação/);
  assert.match(tabelas, /ID interno \(não alterar\)/);
  assert.match(tabelas, /Atualizado em \(não alterar\)/);
  assert.match(repositorio, /custos_importar_produtos_precos_rpc/);
  assert.match(migracao, /foi alterado no sistema depois da exportação/);
  assert.match(migracao, /p_aplicar boolean default false/);
  assert.match(migracao, /custos_importacoes_produtos_precos/);
});

test('cliente escolhe a tabela e o pedido preserva preço e origem usados', () => {
  assert.match(migracao, /alter table public\.vendas_mobile_clientes[\s\S]*tabela_preco_id/);
  assert.match(migracao, /alter table public\.vendas_mobile_pedidos[\s\S]*tabela_preco_nome/);
  assert.match(migracao, /alter table public\.vendas_mobile_pedido_itens[\s\S]*preco_tabela/);
  assert.match(migracao, /preco_alterado_manual/);
  assert.match(migracao, /preencher_tabela_preco_pedido_vendas_mobile/);
  assert.match(vendasDb, /vendas_mobile_listar_precos_rpc/);
  assert.match(vendasDb, /tabela_preco_id: customer\.tabela_preco_id \|\| null/);
  assert.match(vendas, /id="cliTabelaPreco"/);
  assert.match(vendas, /function precoProdutoNaTabela/);
  assert.match(vendas, /Preço da tabela/);
  assert.match(vendas, /tabela_preco_id: rascunho\.tabelaPrecoId \|\| null/);
});

test('preço histórico do pedido não depende de alterações futuras da tabela', () => {
  assert.match(migracao, /create trigger vendas_mobile_pedido_itens_preco_referencia before insert or update/);
  assert.match(migracao, /new\.preco_tabela := v_preco/);
  assert.doesNotMatch(migracao, /update public\.vendas_mobile_pedido_itens[\s\S]*custos_tabela_preco_itens/);
});
