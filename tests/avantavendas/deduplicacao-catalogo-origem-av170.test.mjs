import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);
const migracao = await readFile(new URL('supabase/migrations/20261007010000_deduplicar_produtos_catalogo_por_origem.sql', raiz), 'utf8');

test('deduplicação preserva a primeira cópia e move os vínculos da repetida', () => {
  assert.match(migracao, /first_value\(produto\.id\)[\s\S]*order by produto\.criado_em, produto\.id/);
  assert.match(migracao, /update public\.vendas_mobile_pedido_itens item[\s\S]*set produto_id = repetido\.produto_canonico_id/);
  assert.match(migracao, /update public\.vendas_mobile_estoque_movimentos movimento[\s\S]*set produto_id = repetido\.produto_canonico_id/);
  assert.match(migracao, /update public\.vendas_mobile_contas_catalogo_recebimentos recebimento[\s\S]*set produto_id = repetido\.produto_canonico_id/);
  assert.match(migracao, /catalogo_produto_origem_id = null/);
  assert.match(migracao, /motivo_inativacao', 'copia_duplicada_de_catalogo'/);
});

test('sincronização fica protegida contra publicação concorrente da mesma origem', () => {
  assert.match(migracao, /create unique index vendas_mobile_produtos_conta_origem_catalogo_uidx/);
  assert.match(migracao, /perform pg_advisory_xact_lock\(hashtextextended\([\s\S]*catalogo-produto-conta:/);
  assert.match(migracao, /where conta_id = v_conta\.id and catalogo_produto_origem_id = v_produto\.id/);
});
