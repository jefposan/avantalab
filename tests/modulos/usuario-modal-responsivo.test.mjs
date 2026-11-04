import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gestao = readFileSync('app/gestao/page.tsx', 'utf8');
const editar = gestao.slice(gestao.indexOf('{usuarioEditandoId && ('), gestao.indexOf('{modalUsuarios && ('));
const campos = readFileSync('app/components/AcessosUsuarioCampos.tsx', 'utf8');
test('edição limita altura e mantém ações fora da rolagem', () => {
  assert.match(editar, /max-h-\[calc\(100dvh-3rem\)\]/);
  assert.match(editar, /min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain/);
  assert.match(editar, /mt-4 flex shrink-0 justify-end/);
  assert.match(editar, /md:grid-cols-\[1\.4fr_1fr_1\.2fr\]/);
});
test('liberações compactas preservam toque e coluna mobile', () => {
  assert.match(campos, /grid-cols-1.*sm:grid-cols-2/);
  assert.match(campos, /min-h-11/);
  assert.match(campos, /sm:col-span-2/);
});
