import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ler = (arquivo) => readFileSync(new URL(arquivo, import.meta.url), 'utf8');
const migracao = ler('../../supabase/migrations/20260813123000_backup_restauracao_contas_vendas.sql');
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
