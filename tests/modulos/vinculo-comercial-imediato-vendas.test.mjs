import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const ler = (arquivo) => readFileSync(new URL(arquivo, import.meta.url), 'utf8');
const migracao = ler('../../supabase/migrations/20261005200000_corrigir_vinculo_comercial_catalogo_imediato.sql');
const cliente = ler('../../app/avantavendas/sistema/supabase-client.js');
const aplicacao = ler('../../app/avantavendas/sistema/app.js');

test('código repetido é reconhecido como empresa já adicionada', () => {
  assert.match(migracao, /consultar_codigo_vinculo_vendas_mobile_rpc/);
  assert.match(migracao, /'ja_adicionada', v_ja_adicionada/);
  assert.match(cliente, /consultar_codigo_vinculo_vendas_mobile_rpc/);
  assert.match(cliente, /if \(consulta\?\.ja_adicionada\)/);
  assert.match(aplicacao, /A empresa \$\{resposta\.empresa_nome \|\| ''\} já está adicionada a esta conta/);
});

test('aprovação mantém os três recursos ativos e sincroniza sem reiniciar', () => {
  assert.match(migracao, /novidades_ativas, divulgacao_ativas?, catalogo_ativo/);
  assert.match(migracao, /values \(new\.conta_id, true, true, true\)/);
  assert.match(migracao, /on conflict \(conta_id\) do update\s+set novidades_ativas = true,\s+divulgacao_ativa = true,\s+catalogo_ativo = true/);
  assert.match(aplicacao, /carregarConteudosSecundariosVendas\(false\)/);
  assert.match(aplicacao, /sincronizarCatalogoAutomaticamente\(true\)/);
  assert.match(aplicacao, /atualizarVinculoAprovadoAutomaticamente\(true\)/);
});

test('sincronização do catálogo resolve a empresa pelo vínculo da conta', () => {
  assert.match(migracao, /from public\.vendas_mobile_contas_vinculos_comerciais vinculo/);
  assert.match(migracao, /public\.vendas_mobile_vinculo_conta_valido\(vinculo\.conta_id, vinculo\.empresa_id\)/);
  assert.doesNotMatch(migracao, /select empresa_id into v_empresa_id from public\.vendas_mobile_contas/);
  assert.match(cliente, /!contaContexto\.empresa_id && !vinculoComercialAtivoId/);
});
