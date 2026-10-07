import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const raiz = new URL('../../', import.meta.url);
const cliente = await readFile(new URL('app/avantavendas/sistema/supabase-client.js', raiz), 'utf8');

test('catálogo do AvantaVendas não traz produtos inativos para a lista', () => {
  const funcao = cliente.match(/async function listarCatalogoVendas\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
  assert.match(funcao, /\.eq\('conta_id', contaId\)\s*\.eq\('ativo', true\)/);
});
