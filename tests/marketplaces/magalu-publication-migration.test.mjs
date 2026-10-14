import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('migração impede segundo envio do mesmo SKU à mesma loja sem tocar no Mercado Livre', async () => {
  const db = new PGlite();
  try {
    await db.exec("create table marketplace_publications(connection_id uuid, provider text, provider_listing_id text, status text)");
    const sql = readFileSync(new URL('../../supabase/migrations/20261014030000_marketplace_magalu_publication_guard.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    const connection = '11111111-1111-4111-8111-111111111111';
    await db.query("insert into marketplace_publications values($1,'magalu','SKU-1','publishing')", [connection]);
    await assert.rejects(db.query("insert into marketplace_publications values($1,'magalu','SKU-1','published')", [connection]), error => error.code === '23505');
    await assert.rejects(db.query("insert into marketplace_publications values($1,'magalu','SKU-2','publishing')", [connection]), error => error.code === '23505');
    await db.query("insert into marketplace_publications values($1,'mercado_livre','SKU-1','published')", [connection]);
    await db.query("insert into marketplace_publications values($1,'magalu','SKU-1','failed')", [connection]);
    assert.equal((await db.query('select count(*)::int as n from marketplace_publications')).rows[0].n, 3);
  } finally { await db.close(); }
});
