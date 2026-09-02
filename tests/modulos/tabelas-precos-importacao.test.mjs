import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { colunasExportacaoTabelasPreco, gerarCodigoTecnicoTabelaPreco } from '../../app/custos/types.ts';

const migracao = readFileSync('supabase/migrations/20260831130000_tabelas_precos_produtos_importacao.sql', 'utf8');
const desvinculo = readFileSync('supabase/migrations/20260831220000_desvincular_precificacao_avantavendas.sql', 'utf8');
const separacaoDivulgacao = readFileSync('supabase/migrations/20260901100000_separar_preco_divulgacao_precificacao.sql', 'utf8');
const migracaoCodigoAutomatico = readFileSync('supabase/migrations/20260901150000_codigo_automatico_tabela_preco.sql', 'utf8');
const workspace = readFileSync('app/custos/CustosWorkspace.tsx', 'utf8');
const tabelas = readFileSync('app/custos/TabelasPrecosView.tsx', 'utf8');
const repositorio = readFileSync('app/custos/repository.ts', 'utf8');
const catalogoDivulgacao = readFileSync('app/components/CatalogoProdutosVendas.tsx', 'utf8');
const vendas = readFileSync('app/avantavendas/sistema/app.js', 'utf8');
const vendasDb = readFileSync('app/avantavendas/sistema/supabase-client.js', 'utf8');

test('tabelas de preços pertencem à empresa e possuem uma única tabela padrão', () => {
  assert.match(migracao, /create table if not exists public\.custos_tabelas_preco/);
  assert.match(migracao, /unique index if not exists custos_tabelas_preco_empresa_padrao_uidx/);
  assert.match(migracao, /where padrao/);
  assert.match(migracao, /public\.custos_pode_acessar_empresa\(empresa_id, true\)/);
  assert.doesNotMatch(migracao, /vendas_mobile_usuario_tem_vinculo_conta_empresa\(empresa_id, 'catalogo'\)/);
});

test('nova tabela pede somente o nome e recebe código técnico automático', () => {
  assert.match(tabelas, /Informe somente um nome para identificar a nova tabela\./);
  assert.doesNotMatch(tabelas, /<label>Código<input/);
  assert.match(migracaoCodigoAutomatico, /v_codigo_base := upper\(regexp_replace/);
  assert.match(migracaoCodigoAutomatico, /exception when unique_violation/);
  assert.doesNotMatch(migracaoCodigoAutomatico, /set codigo =/);
  assert.equal(gerarCodigoTecnicoTabelaPreco('Preço Atacado', []), 'PRECO-ATACADO');
  assert.equal(gerarCodigoTecnicoTabelaPreco('Preço Atacado', ['PRECO-ATACADO']), 'PRECO-ATACADO-2');
});

test('exportação cria uma coluna identificável para cada tabela adicional', () => {
  assert.deepEqual(colunasExportacaoTabelasPreco([
    { codigo: 'PADRAO', nome: 'Padrão', padrao: true },
    { codigo: 'ATACADO', nome: 'Atacado', padrao: false },
    { codigo: 'REVENDA', nome: 'Revenda', padrao: false },
    { codigo: 'ATACADO-2', nome: 'Atacado', padrao: false },
  ]), [
    { codigo: 'ATACADO', nome: 'Atacado', cabecalho: 'Preço · Atacado' },
    { codigo: 'REVENDA', nome: 'Revenda', cabecalho: 'Preço · Revenda' },
    { codigo: 'ATACADO-2', nome: 'Atacado', cabecalho: 'Preço · Atacado (2)' },
  ]);
});

test('cadastro exporta e importa produtos e preços com prévia e proteção concorrente', () => {
  assert.match(workspace, /id: 'precos', rotulo: 'Tabelas de preços'/);
  assert.match(tabelas, /Exportar Excel/);
  assert.match(tabelas, /Importar Excel/);
  assert.match(tabelas, /Revisar importação/);
  assert.match(tabelas, /<Icon name="upload" size=\{17\} \/>/);
  assert.match(tabelas, /<Icon name="download" size=\{17\} \/>/);
  assert.match(tabelas, /AVANTALAB-CUSTOS-2/);
  assert.match(tabelas, /precosLegados/);
  assert.match(tabelas, /Células vazias não alteram o preço já cadastrado/);
  assert.doesNotMatch(tabelas, /book_append_sheet\(livro, planilhaPrecos, 'Tabelas de preços'\)/);
  assert.match(tabelas, /ID interno \(não alterar\)/);
  assert.match(tabelas, /Atualizado em \(não alterar\)/);
  assert.match(repositorio, /custos_importar_produtos_precos_rpc/);
  assert.match(migracao, /foi alterado no sistema depois da exportação/);
  assert.match(migracao, /p_aplicar boolean default false/);
  assert.match(migracao, /custos_importacoes_produtos_precos/);
});

test('precificação da Gestão não se conecta a clientes e pedidos do AvantaVendas', () => {
  assert.doesNotMatch(migracao, /alter table public\.vendas_mobile_clientes[\s\S]*tabela_preco_id/);
  assert.doesNotMatch(migracao, /alter table public\.vendas_mobile_pedidos[\s\S]*tabela_preco_nome/);
  assert.doesNotMatch(migracao, /preencher_tabela_preco_pedido_vendas_mobile/);
  assert.doesNotMatch(migracao, /vendas_mobile_listar_precos_rpc/);
  assert.doesNotMatch(vendasDb, /vendas_mobile_listar_precos_rpc/);
  assert.doesNotMatch(vendasDb, /tabela_preco_id/);
  assert.doesNotMatch(vendas, /id="cliTabelaPreco"/);
  assert.doesNotMatch(vendas, /function precoProdutoNaTabela/);
  assert.doesNotMatch(vendas, /Preço da tabela/);
  assert.doesNotMatch(vendas, /tabela_preco_id/);
});

test('pedido usa o preço sugerido do catálogo de divulgação e permite edição manual', () => {
  assert.match(vendas, /moeda\(produto\.preco \|\| 0\)/);
  assert.match(vendas, /pedidoClienteRascunho\.preco = Number\(produto\?\.preco \|\| 0\)/);
  assert.match(vendas, /<span>Preço<\/span><input id="pedidoClientePreco" type="text" inputmode="numeric"/);
  assert.match(vendas, /oninput="pedidoClienteRascunho\.preco=formatarCampoMoeda\(this\)"/);
  assert.doesNotMatch(vendas, /id="pedidoClientePreco"[^>]*readonly/);
});

test('preço de revenda da divulgação é independente da venda interna da Gestão', () => {
  assert.match(separacaoDivulgacao, /add column if not exists preco_divulgacao numeric\(12,2\)/);
  assert.match(separacaoDivulgacao, /historico\.preco_anterior/);
  assert.match(separacaoDivulgacao, /nullif\(produto\.preco_venda, 0\)/);
  assert.match(separacaoDivulgacao, /v_produto\.preco_divulgacao, 0/);
  assert.doesNotMatch(separacaoDivulgacao, /coalesce\(v_produto\.preco_divulgacao, v_produto\.preco_venda\)/);
  assert.match(catalogoDivulgacao, /Preço sugerido de revenda/);
  assert.match(catalogoDivulgacao, /preco_divulgacao: revenda/);
  assert.match(catalogoDivulgacao, /insert\(\{ \.\.\.payload, preco_custo: 0, preco_venda: 0 \}\)/);
  assert.match(catalogoDivulgacao, /preco_custo: 0, preco_venda: Number\(produto\.preco_divulgacao \|\| 0\)/);
  assert.doesNotMatch(catalogoDivulgacao, /preco_custo: custo/);
  assert.doesNotMatch(repositorio, /preco_divulgacao/);
  assert.match(repositorio, /preco_venda: produto\.preco_venda/);
});

test('migração de compatibilidade desativa automações sem apagar dados históricos', () => {
  assert.match(desvinculo, /drop trigger if exists vendas_mobile_pedidos_tabela_preco/);
  assert.match(desvinculo, /drop function if exists public\.vendas_mobile_listar_precos_rpc\(uuid\)/);
  assert.match(desvinculo, /custos_pode_acessar_empresa\(empresa_id, false\)/);
  assert.doesNotMatch(desvinculo, /drop column/i);
  assert.doesNotMatch(desvinculo, /delete from/i);
});
