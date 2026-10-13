import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const read=path=>readFileSync(new URL(`../../supabase/migrations/${path}`,import.meta.url),'utf8');

test('SQL real: pendentes anteriores à ativação geram popup sem baixar estoque ou avisar entregues',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
      create table auth.users(id uuid primary key);create table empresas(id uuid primary key);
      create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
      create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
      create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,status text,seller_name text,connected_at timestamptz default now()-interval '10 days',last_error_code text);
      create table marketplace_listings(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,provider_listing_id text,search_text text,status text,snapshot jsonb,synced_at timestamptz default now());`);
    for(const file of ['20261007230000_marketplace_sales_notifications.sql','20261011200000_marketplace_local_products.sql','20261012010000_marketplace_inventory_sync.sql','20261012190000_marketplace_connection_labels.sql','20261012230000_marketplace_sales_history.sql','20261013150000_marketplace_magalu_sales.sql'])await db.exec(read(file));
    const company=crypto.randomUUID(),other=crypto.randomUUID(),user=crypto.randomUUID(),conn=crypto.randomUUID(),magalu=crypto.randomUUID();
    await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[user]);
    await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[user,company]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
    await db.query("insert into marketplace_connections(id,empresa_id,provider,status,seller_name,last_error_code) values($1,$2,'mercado_livre','connected','CODIGO',null),($3,$2,'magalu','attention','MAGALU','magalu_connector_pending')",[conn,company,magalu]);
    await db.query("insert into marketplace_connection_labels(connection_id,empresa_id,local_label) values($1,$2,'ADRIANO')",[conn,company]);
    await db.query("update marketplace_inventory_settings set activated_at=now()-interval '1 day' where empresa_id=$1",[company]);
    const snapshot=JSON.stringify({soldAt:new Date(Date.now()-3*86400000).toISOString(),confirmedAt:new Date(Date.now()-3*86400000).toISOString(),providerUpdatedAt:new Date().toISOString(),inventoryLines:[{listingId:'MLB123456',title:'Produto',quantity:1}],items:[{title:'Produto',quantity:1}]});
    const save=async(code,shipment='pending',provider='mercado_livre',status='paid',label='unavailable')=>(await db.query(`insert into marketplace_sales(empresa_id,connection_id,provider,provider_order_id,status,shipment_status,label_status,snapshot) values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,[company,provider==='magalu'?magalu:conn,provider,code,status,shipment,label,snapshot])).rows[0].id;
    const sale=await save('100');await save('200','delivered');await save('300','pending','mercado_livre','cancelled');await save('400','pending','mercado_livre','paid','fulfilled');await save('ABC-MAGALU','handling','magalu');
    assert.equal((await db.query('select count(*)::int as n from marketplace_sale_alerts')).rows[0].n,0);
    const before=await db.query('select id,state,quantity from marketplace_inventory_events order by id');
    const migration=read('20261013170000_marketplace_pending_sale_alerts.sql');await db.exec(migration);await db.exec(migration);
    assert.deepEqual((await db.query('select id,state,quantity from marketplace_inventory_events order by id')).rows,before.rows);
    assert.equal((await db.query('select count(*)::int as n from marketplace_stock_movements')).rows[0].n,0);
    const feed=async()=>(await db.query('select marketplace_live_feed($1,$2) as data',[company,user])).rows[0].data;
    let result=await feed();assert.equal(result.alerts.length,2);assert.ok(result.alerts.every(alert=>alert.kind==='pending_dispatch'));
    assert.equal(result.alerts.find(alert=>alert.sale_id===sale).account_name,'ADRIANO');
    await db.query("update marketplace_sales set updated_at=now() where id=$1",[sale]);assert.equal((await feed()).alerts.length,2);
    await db.query("update marketplace_sales set shipment_status='delivered' where id=$1",[sale]);assert.equal((await feed()).alerts.length,1);
    await assert.rejects(db.query('select marketplace_live_feed($1,$2)',[other,user]),/Sem acesso/);
    assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_register_pending_sale(uuid)','execute') as allowed")).rows[0].allowed,false);
    await db.query("update marketplace_connections set status='expired' where id=$1",[magalu]);assert.equal((await feed()).alerts.length,0);
  }finally{await db.close();}
});
