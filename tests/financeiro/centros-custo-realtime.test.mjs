import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync('supabase/migrations/20260915103000_centros_custo_realtime.sql', 'utf8');

test('configurações e centros de custo participam do Realtime', () => {
  assert.match(migration, /alter publication supabase_realtime add table public\.configuracoes/);
  assert.match(migration, /alter publication supabase_realtime add table public\.centros_custo/);
  assert.match(migration, /pg_publication_tables/);
});
