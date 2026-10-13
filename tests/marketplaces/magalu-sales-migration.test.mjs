import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const read = path => readFileSync(new URL(`../../supabase/migrations/${path}`,import.meta.url),'utf8');
test('SQL real: migração Magalu preserva ML, isola cursor/empresa e alerta uma vez sem baixar estoque', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role;
      create table auth.users(id uuid primary key); create table empresas(id uuid primary key);
      create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
      create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
      create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,status text,seller_name text,connected_at timestamptz default now()-interval '2 days');
      create table marketplace_listings(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,provider_listing_id text,search_text text,status text,snapshot jsonb,synced_at timestamptz default now());`);
    for (const path of ['20261007230000_marketplace_sales_notifications.sql','20261011200000_marketplace_local_products.sql','20261012010000_marketplace_inventory_sync.sql','20261012230000_marketplace_sales_history.sql']) await db.exec(read(path));
    const company=crypto.randomUUID(), other=crypto.randomUUID(), conn=crypto.randomUUID(), ml=crypto.randomUUID();
    await db.query('insert into empresas values($1),($2)',[company,other]);
    await db.query("insert into marketplace_connections(id,empresa_id,provider,status) values($1,$2,'magalu','attention'),($3,$2,'mercado_livre','connected')",[conn,company,ml]);
    await db.query("insert into marketplace_sales(empresa_id,connection_id,provider_order_id,status,snapshot) values($1,$2,'123','paid','{}')",[company,ml]);
    const migration=read('20261013150000_marketplace_magalu_sales.sql');await db.exec(migration);await db.exec(migration);
    assert.equal((await db.query("select count(*)::int as n from marketplace_sales where provider='mercado_livre'")).rows[0].n,1);
    await db.query('insert into marketplace_magalu_sales_sync(empresa_id,connection_id) values($1,$2)',[company,conn]);
    await assert.rejects(db.query('update marketplace_magalu_sales_sync set empresa_id=$1',[other]), e=>e.code==='23503');
    for (const role of ['anon','authenticated']) assert.equal((await db.query("select has_table_privilege($1,'marketplace_magalu_sales_sync','select') as allowed",[role])).rows[0].allowed,false);
    await db.query("update marketplace_inventory_settings set enabled=true,activated_at=now()-interval '2 days' where empresa_id=$1",[company]);
    const snapshot=JSON.stringify({confirmedAt:new Date(Date.now()-3600000).toISOString(),providerUpdatedAt:new Date().toISOString(),inventoryLines:[],items:[{title:'Produto teste',quantity:1}]});
    const save=async(code,status='paid',data=snapshot)=>db.query(`insert into marketplace_sales(empresa_id,connection_id,provider,provider_order_id,status,snapshot) values($1,$2,'magalu',$3,$4,$5)
      on conflict(connection_id,provider_order_id) do update set status=excluded.status,snapshot=excluded.snapshot`,[company,conn,code,status,data]);
    await save('12345678901234567890123456789012345678901234');await save('12345678901234567890123456789012345678901234');
    assert.equal((await db.query('select count(*)::int as n from marketplace_sale_alerts')).rows[0].n,1);
    assert.equal((await db.query('select count(*)::int as n from marketplace_inventory_events')).rows[0].n,0);
    assert.equal((await db.query('select count(*)::int as n from marketplace_stock_movements')).rows[0].n,0);
    await save('CANCELADA','cancelled');await save('HISTORICO','paid',JSON.stringify({...JSON.parse(snapshot),confirmedAt:'2020-01-01T00:00:00Z'}));
    assert.equal((await db.query('select count(*)::int as n from marketplace_sale_alerts')).rows[0].n,1);
    await assert.rejects(save('../resource'),e=>e.code==='23514');
    await assert.rejects(db.query("insert into marketplace_sales(empresa_id,connection_id,provider_order_id,status,snapshot) values($1,$2,'abc','paid','{}')",[company,ml]),e=>e.code==='23514');
  } finally { await db.close(); }
});
