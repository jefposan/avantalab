import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/ProjectWorkspace.tsx', import.meta.url), 'utf8');
test('reorganizar e direção apenas abrem a confirmação', () => {
  assert.match(source, /Tooltip texto="Aplica o layout automático e substitui todas as posições manuais/);
  assert.match(source, /onClick=\{\(\) => setReorganizeDirection\(direction\)\}/);
  assert.match(source, /onChange=\{\(event\) => setReorganizeDirection\(event.target.value as MapDirection\)\}/);
  assert.equal((source.match(/layoutProject\(project,/g) || []).length, 1);
});
test('cancelamento não altera o projeto; confirmação preserva desfazer', () => {
  assert.match(source, /onClose=\{\(\) => setReorganizeDirection\(null\)\}/);
  assert.match(source, /onClick=\{\(\) => setReorganizeDirection\(null\)\}>Cancelar/);
  assert.match(source, /if \(!reorganizeDirection \|\| readOnly\) return; const next = layoutProject\(project, reorganizeDirection\)/);
  assert.match(source, /Confirmar reorganização/);
  assert.match(source, /inclusive dos ramos recolhidos/);
  assert.match(source, /Use Desfazer para recuperar as posições anteriores/);
});
