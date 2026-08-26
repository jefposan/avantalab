import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const migracao = await readFile(resolve(
  raiz,
  'supabase/migrations/20260826193000_corrigir_gatilho_pedidos_sem_data_pagamento.sql',
), 'utf8');

test('gatilho separa campos exclusivos de pedidos e pagamentos', () => {
  const inicioIf = migracao.indexOf("if tg_table_name = 'vendas_mobile_pagamentos' then");
  const campoPagamento = migracao.indexOf('new.data_pagamento', inicioIf);
  const inicioElse = migracao.indexOf('\n  else', campoPagamento);
  const campoPedido = migracao.indexOf('new.criado_em', inicioElse);
  const fimIf = migracao.indexOf('\n  end if;', campoPedido);

  assert.ok(inicioIf >= 0, 'a tabela do gatilho precisa selecionar o ramo correto');
  assert.ok(campoPagamento > inicioIf && campoPagamento < inicioElse, 'pagamentos usam data_pagamento somente no próprio ramo');
  assert.ok(campoPedido > inicioElse && campoPedido < fimIf, 'pedidos usam criado_em somente no próprio ramo');
  assert.doesNotMatch(migracao, /case\s+when\s+tg_table_name[\s\S]*new\.data_pagamento/i);
});
