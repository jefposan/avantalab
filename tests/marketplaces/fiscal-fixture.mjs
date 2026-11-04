import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const migration = await readFile('supabase/migrations/20261026170000_marketplace_fiscal_history.sql', 'utf8');
export const ids = { company:'10000000-0000-4000-8000-000000000001', other:'10000000-0000-4000-8000-000000000002', connection:'20000000-0000-4000-8000-000000000001', foreign:'20000000-0000-4000-8000-000000000002', sale:'30000000-0000-4000-8000-000000000001' };
export async function fixture(legacy = false) {
  const db = new PGlite(), { company, other, connection, foreign, sale } = ids;
  await db.exec(`create role anon; create role authenticated; create role service_role; create table empresas(id uuid primary key);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);`);
  await db.query('insert into empresas values ($1),($2)', [company,other]);
  await db.query("insert into marketplace_connections values ($1,$2,'mercado_livre'),($3,$4,'mercado_livre')", [connection,company,foreign,other]);
  await db.exec(await readFile('supabase/migrations/20261007230000_marketplace_sales_notifications.sql','utf8'));
  await db.query("insert into marketplace_sales(id,empresa_id,connection_id,provider_order_id,status,shipment_id,snapshot) values($1,$2,$3,'2000019139347426','paid','555',$4)",[sale,company,connection,JSON.stringify(legacy ? {dceEmission:{requestedAt:'2026-10-26T13:00:00Z',emissionId:'receipt-original'}} : {})]);
  await db.exec(migration);
  return db;
}
