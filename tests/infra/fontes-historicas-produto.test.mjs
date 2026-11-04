import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sqlDeTesteURL } from '../helpers/sql-historico.mjs';
const root = new URL('../../', import.meta.url);
const provenance = JSON.parse(readFileSync(new URL('supabase/historico-sem-registro/proveniencia.json', root), 'utf8'));
const inventory = JSON.parse(readFileSync(new URL('docs/auditorias/reconciliacao-2026-11-04/AUDITORIA-15-SQL.json', root), 'utf8'));

test('15 fontes do produto preservam os bytes publicados, sem entrada automática na fila de migrações', () => {
  assert.equal(provenance.files.length, 15);
  for (const file of provenance.files) {
    assert.ok(file.path.startsWith('supabase/historico-sem-registro/'));
    const content = readFileSync(new URL(file.path, root));
    assert.equal(createHash('sha256').update(content).digest('hex'), file.sha256, file.path);
    assert.equal(existsSync(new URL(file.originalPath, root)), false, 'Não reapresentar identificador sem registro como migração pendente.');
    assert.equal(Object.hasOwn(file, 'appliedMigration'), false, 'Ausência de identificador não prova ausência da aplicação.');
    assert.equal(file.remoteMigrationIdPresent, false);
    assert.equal(file.databaseFootprintPresent, true);
  }
  assert.equal(existsSync(new URL('tests/fixtures/sql-historico/', root)), false, 'Remover a classificação provisória de material exclusivo de testes.');
});
test('carregador usa a fonte histórica única e mantém migrações registradas no caminho oficial', () => {
  for (const file of provenance.files) assert.equal(fileURLToPath(sqlDeTesteURL(file.path.split('/').at(-1))), fileURLToPath(new URL(file.path, root)));
  assert.equal(fileURLToPath(sqlDeTesteURL('20261104190000_reajuste_tabelas_precos.sql')), fileURLToPath(new URL('supabase/migrations/20261104190000_reajuste_tabelas_precos.sql', root)));
  assert.throws(() => sqlDeTesteURL('../fora.sql'), /inválido/);
});
test('inventário auditado associa cada fonte ao mesmo hash e registra a decisão de preservação', () => {
  assert.equal(inventory.records.length, 15);
  assert.equal(inventory.decisionSummary.obsoleteFilesProven, 0);
  for (const file of provenance.files) {
    const row = inventory.records.find(row => row.archivedPath === file.path);
    assert.ok(row, file.path);
    assert.equal(row.sourceSha256, file.sha256);
    assert.equal(row.decision, 'preservar-como-fonte-historica-do-produto');
  }
});
