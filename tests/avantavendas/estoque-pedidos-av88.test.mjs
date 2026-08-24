import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);

async function ler(caminho) {
  return readFile(new URL(caminho, raiz), 'utf8');
}

test('pedido aplica somente a diferença de estoque e devolve os saldos confirmados', async () => {
  const migracao = await ler('supabase/migrations/20260824170000_estoque_automatico_pedidos_vendas.sql');

  assert.match(migracao, /v_quantidades_anteriores/);
  assert.match(migracao, /v_quantidades_novas/);
  assert.match(migracao, /quantidade_nova - quantidade_anterior as quantidade_consumida/);
  assert.match(migracao, /v_final := v_anterior - v_item\.quantidade_consumida/);
  assert.match(migracao, /not v_produto\.estoque_controlado/);
  assert.match(migracao, /'consignacao'/);
  assert.match(migracao, /'venda'/);
  assert.match(migracao, /'retorno_consignacao'/);
  assert.match(migracao, /'cancelamento'/);
  assert.match(migracao, /'estoques_atualizados'/);
});

test('exclusão é atômica, idempotente e restaura o estoque do pedido', async () => {
  const [migracao, cliente] = await Promise.all([
    ler('supabase/migrations/20260824170000_estoque_automatico_pedidos_vendas.sql'),
    ler('app/avantavendas/sistema/supabase-client.js'),
  ]);

  assert.match(migracao, /function public\.excluir_pedido_vendas_mobile_rpc/);
  assert.match(migracao, /v_quantidades,\s*'\{\}'::jsonb/);
  assert.match(migracao, /if not found then[\s\S]*'estoques_atualizados'/);
  assert.match(cliente, /rpc\('excluir_pedido_vendas_mobile_rpc'/);
  assert.doesNotMatch(cliente.slice(cliente.indexOf('async function deleteOrder'), cliente.indexOf('async function savePayment')), /\.from\('vendas_mobile_pedidos'\)\.delete/);
});

test('Dashboard aplica o saldo servidor em gravações, reenvios e conversão de consignado', async () => {
  const app = await ler('app/avantavendas/sistema/app.js');

  assert.match(app, /function aplicarEstoquesConfirmadosPedido/);
  assert.match(app, /state\.produtos = \(state\.produtos \|\| \[\]\)\.map/);
  assert.ok((app.match(/aplicarEstoquesConfirmadosPedido\(/g) || []).length >= 8);
  assert.match(app, /\.then\(aplicarEstoquesConfirmadosPedido\)/);
});

test('revisão av88 documenta a atualização automática do estoque', async () => {
  const [versao, changelog, manual] = await Promise.all([
    ler('app/avantavendas/version.ts'),
    ler('CHANGELOG.md'),
    ler('docs/ava/vendas.md'),
  ]);

  const revisaoAtual = Number(versao.match(/AVANTAVENDAS_ASSET_REVISION = '(\d+)'/)?.[1] || 0);
  assert.ok(revisaoAtual >= 88, 'a revisão atual não pode regredir abaixo da av88');
  assert.match(changelog, /1\.11\.0-av88/);
  assert.match(changelog, /item bonificado abatem o saldo/);
  assert.match(manual, /Revisão 1\.11\.0-av88/);
});
