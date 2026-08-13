import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ler = (arquivo) => readFileSync(new URL(arquivo, import.meta.url), 'utf8');
const migracaoInicial = ler('../../supabase/migrations/20260813123000_backup_restauracao_contas_vendas.sql');
const migracaoCompleta = ler('../../supabase/migrations/20260813183000_backup_completo_conta_vendas.sql');
const migracaoVinculoConta = ler('../../supabase/migrations/20260813220000_vinculo_catalogo_por_conta_vendas.sql');
const migracaoRecursosVinculo = ler('../../supabase/migrations/20260813224500_corrigir_recursos_vinculo_migrado_vendas.sql');
const migracao = `${migracaoInicial}\n${migracaoCompleta}\n${migracaoVinculoConta}\n${migracaoRecursosVinculo}`;
const aplicacao = ler('../../app/avantavendas/sistema/app.js');
const cliente = ler('../../app/avantavendas/sistema/supabase-client.js');
const apiBackup = ler('../../app/api/vendas/backup/route.ts');
const apiPontos = ler('../../app/api/vendas/pontos-restauracao/route.ts');

test('snapshot reúne somente os registros da conta solicitada', () => {
  for (const tabela of ['clientes', 'produtos', 'pedidos', 'pagamentos', 'agenda']) {
    assert.match(migracao, new RegExp(`vendas_mobile_${tabela} t where t\\.conta_id = p_conta_id`));
  }
  assert.match(migracao, /join public\.vendas_mobile_pedidos p on p\.id = i\.pedido_id\s+where p\.conta_id = p_conta_id/);
  assert.match(migracao, /join public\.vendas_mobile_produtos p on p\.id = m\.produto_id\s+where p\.conta_id = p_conta_id/);
});

test('snapshot completo preserva perfil, participantes e estado do catálogo', () => {
  assert.match(migracaoCompleta, /'schema_versao', 2/);
  assert.match(migracaoCompleta, /'conta', to_jsonb\(v_conta\)/);
  assert.match(migracaoCompleta, /'conta_usuarios'/);
  assert.match(migracaoCompleta, /'recursos_conta'/);
  assert.match(migracaoCompleta, /'preferencias_conta'/);
  assert.match(migracaoCompleta, /'catalogo_recebimentos'/);
  assert.match(migracaoCompleta, /vendas_mobile_produtos t where t\.conta_id = p_conta_id/);
});

test('catálogo e recursos ficam isolados pela conta ativa', () => {
  assert.match(migracaoCompleta, /vendas_mobile_contas_recursos/);
  assert.match(migracaoCompleta, /sincronizar_catalogo_vendas_mobile_rpc\(p_conta_id uuid\)/);
  assert.match(migracaoCompleta, /p\.conta_id = p_conta_id and p\.catalogo_produto_origem_id/);
  assert.match(cliente, /sincronizar_catalogo_vendas_mobile_rpc', \{ p_conta_id: contaId \}/);
  assert.match(cliente, /atualizar_recurso_vinculo_comercial_vendas_mobile_rpc/);
  assert.match(cliente, /p_conta_id: contaId, p_empresa_id: empresaId/);
  assert.match(cliente, /from\('vendas_mobile_contas_preferencias'\)/);
});

test('empresa financeira e fornecedor do catálogo permanecem separados', () => {
  assert.match(migracaoVinculoConta, /vendas_mobile_contas_vinculos_comerciais/);
  assert.match(migracaoVinculoConta, /join public\.vendas_mobile_catalogos catalogo on catalogo\.id = p\.catalogo_empresa_id/);
  assert.match(migracaoVinculoConta, /public\.vendas_mobile_vinculo_conta_valido\(v\.conta_id, v\.empresa_id\)/);
  assert.match(migracaoVinculoConta, /p_conta_id uuid/);
  assert.match(cliente, /p_conta_id: contaAtivaId\(\) \|\| null/);
});

test('migração do vínculo protege todos os dados operacionais', () => {
  assert.match(migracaoVinculoConta, /create temporary table av_vendas_preservacao_migracao/);
  for (const tabela of ['produtos', 'clientes', 'pedidos', 'pagamentos']) {
    assert.match(migracaoVinculoConta, new RegExp(`select count\\(\\*\\) from public\\.vendas_mobile_${tabela}`));
  }
  assert.match(migracaoVinculoConta, /Protecao de dados: a migracao alterou registros operacionais e foi cancelada/);
  assert.match(migracaoVinculoConta, /Protecao de catalogo: uma conta com produtos recebidos ficou sem vinculo/);
});

test('empresa exibida e recursos migrados usam o vínculo comercial ativo', () => {
  assert.match(aplicacao, /state\.vinculoComercialAtivo\?\.empresa_nome \|\| state\.acessoVendas\?\.empresa_nome/);
  assert.match(migracaoRecursosVinculo, /novidades_ativas = legado\.novidades_ativas/);
  assert.match(migracaoRecursosVinculo, /divulgacao_ativa = legado\.divulgacao_ativa/);
  assert.match(migracaoRecursosVinculo, /catalogo_ativo = legado\.catalogo_ativo/);
  assert.match(migracaoRecursosVinculo, /Protecao de dados: a correcao de recursos alterou registros operacionais/);
});

test('restauração completa não contorna revogação feita pela empresa', () => {
  assert.match(migracaoCompleta, /A empresa deste backup revogou o acesso/);
  assert.match(migracaoCompleta, /vendas_mobile_acessos a where a\.user_id = p_criado_por/);
  assert.match(migracaoCompleta, /usuarios_empresa u where u\.user_id = p_criado_por/);
  assert.match(migracaoCompleta, /values \(p_conta_id, p_criado_por, 'proprietario', 'ativo'\)/);
});

test('restauração e reset exigem proprietário e criam ponto anterior', () => {
  assert.match(migracao, /Somente o proprietário pode restaurar esta conta/);
  assert.match(migracao, /p_conta_id, 'pre_restauracao', p_criado_por/);
  assert.match(migracao, /Somente o proprietário pode resetar esta conta/);
  assert.match(migracao, /p_conta_id, 'pre_reset', v_usuario/);
  assert.match(migracao, /delete from public\.vendas_mobile_clientes where conta_id = p_conta_id/);
  assert.doesNotMatch(cliente, /rpc\('resetar_vendas_mobile_rpc'/);
  assert.match(cliente, /rpc\('resetar_conta_vendas_mobile_rpc'/);
});

test('APIs validam vínculo, papel e confirmação destrutiva', () => {
  assert.match(apiBackup, /obterContextoContaVendas/);
  assert.match(apiBackup, /contexto\.papel !== 'proprietario'/);
  assert.match(apiBackup, /SUBSTITUIR/);
  assert.match(apiBackup, /backup pertence a outra conta de vendas/);
  assert.match(apiBackup, /\[1, 2\]\.includes/);
  assert.match(apiPontos, /podeGerirBackup/);
  assert.match(apiPontos, /contexto\.papel !== 'proprietario'/);
  assert.match(apiPontos, /RESTAURAR/);
});

test('Configurações expõem Dados e segurança conforme o papel da conta', () => {
  assert.match(aplicacao, /Dados e segurança/);
  assert.match(aplicacao, /podeGerirDadosConta/);
  assert.match(aplicacao, /podeRestaurarDadosConta/);
  assert.match(aplicacao, /baixarBackupContaVendas/);
  assert.match(aplicacao, /abrirPontosRestauracaoVendas/);
  assert.match(aplicacao, /Uma cópia de segurança é criada automaticamente antes de cada restauração/);
});
