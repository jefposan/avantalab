import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const mobile = readFileSync('public/mobile-app.js', 'utf8');

test('a configuração de centros de custo é compartilhada com a Gestão Web', () => {
  assert.match(mobile, /select\('duplicados_ativo, centros_custo_ativo'\)/);
  assert.match(mobile, /upsert\(\{ empresa_id: empresaId, centros_custo_ativo: proximo \}/);
  assert.match(mobile, /function sincronizarCentrosCustoMobile\(\)/);
  assert.match(mobile, /garantir_centro_custo_principal/);
});

test('o menu e a gestão de centros só aparecem quando o recurso está ativo', () => {
  assert.match(mobile, /state\.centrosCustoAtivo && podeGerenciarUsuarios\(\)/);
  assert.match(mobile, /menu-centros-custo/);
  assert.match(mobile, /function centrosCustoMenuHtml\(\)/);
  assert.match(mobile, /centroCustoExclusao/);
  assert.match(mobile, /excluir_centro_custo_com_lancamentos_rpc/);
});

test('novos lançamentos usam o centro ativo escolhido no cabeçalho', () => {
  assert.match(mobile, /Centro de custo<\/span><select id="lancamento-centro-custo"/);
  assert.match(mobile, /bindChange\('lancamento-centro-custo'/);
  assert.match(mobile, /centro_custo_id: centroCustoId/);
  assert.match(mobile, /!ehFutura && !state\.centrosCustoAtivo/);
});

test('edição de centro mantém ações alinhadas e os seletores compactos', () => {
  assert.match(mobile, /flex items-start gap-2 rounded-xl border/);
  assert.match(mobile, /mt-2 text-\[10px\] font-bold uppercase leading-none/);
  assert.match(mobile, /grid-cols-\[116px_116px_36px\] justify-center/);
  assert.match(mobile, /class="flex w-\[116px\] items-center justify-self-center rounded-full/);
});
