import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '../..');
const migracao = await readFile(resolve(
  raiz,
  'supabase/migrations/20260826193000_corrigir_gatilho_pedidos_sem_data_pagamento.sql',
), 'utf8');
const migracaoIsolamentoCatalogo = await readFile(resolve(
  raiz,
  'supabase/migrations/20260909084500_isolar_gatilho_produtos_catalogo.sql',
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

test('gatilho comum não acessa campos exclusivos do catálogo', () => {
  const inicioComum = migracaoIsolamentoCatalogo.indexOf(
    'create or replace function public.preencher_conta_operacional_vendas_mobile()',
  );
  const inicioProduto = migracaoIsolamentoCatalogo.indexOf(
    'create or replace function public.preencher_conta_operacional_produto_vendas_mobile()',
  );
  const fimComum = migracaoIsolamentoCatalogo.indexOf('\n$$;', inicioComum) + '\n$$;'.length;
  const funcaoComum = migracaoIsolamentoCatalogo.slice(inicioComum, fimComum);

  assert.ok(inicioComum >= 0 && fimComum > inicioComum && inicioProduto > fimComum);
  assert.doesNotMatch(funcaoComum, /catalogo_produto_origem_id/);
  assert.match(funcaoComum, /vendas_mobile_pode_operar_conta\(new\.conta_id\)/);
  assert.match(funcaoComum, /new\.user_id := auth\.uid\(\)/);
});

test('exceção da publicação fica vinculada somente ao gatilho de produtos', () => {
  const inicioProduto = migracaoIsolamentoCatalogo.indexOf(
    'create or replace function public.preencher_conta_operacional_produto_vendas_mobile()',
  );
  const funcaoProduto = migracaoIsolamentoCatalogo.slice(inicioProduto);

  assert.match(funcaoProduto, /if tg_table_name <> 'vendas_mobile_produtos' then/);
  assert.match(funcaoProduto, /new\.catalogo_produto_origem_id is not null/);
  assert.match(funcaoProduto, /vendas_mobile_pode_publicar_conteudo\(catalogo\.empresa_id\)/);
  assert.match(
    migracaoIsolamentoCatalogo,
    /create trigger vendas_mobile_produtos_conta_padrao[\s\S]*execute function public\.preencher_conta_operacional_produto_vendas_mobile\(\)/,
  );
});

test('migração corretiva não altera nem remove dados operacionais', () => {
  assert.match(migracaoIsolamentoCatalogo, /begin;/i);
  assert.match(migracaoIsolamentoCatalogo, /commit;/i);
  assert.doesNotMatch(migracaoIsolamentoCatalogo, /\bdelete\s+from\b/i);
  assert.doesNotMatch(migracaoIsolamentoCatalogo, /\btruncate\b/i);
  assert.doesNotMatch(migracaoIsolamentoCatalogo, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migracaoIsolamentoCatalogo, /\balter\s+table\b/i);
  assert.doesNotMatch(migracaoIsolamentoCatalogo, /\binsert\s+into\b/i);
  assert.doesNotMatch(migracaoIsolamentoCatalogo, /\bupdate\s+public\./i);
});
