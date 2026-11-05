import { sqlDeTesteURL } from '../helpers/sql-historico.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=name=>readFileSync(sqlDeTesteURL(name),'utf8');
test('SQL: Magalu baixa uma vez, não soma contas, preserva histórico, cancelamento e ML',async()=>{
 const db=new PGlite();try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,status text,seller_name text,connected_at timestamptz default now()-interval '2 days');create table marketplace_listings(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,provider text default 'mercado_livre',provider_listing_id text,search_text text,status text,snapshot jsonb,synced_at timestamptz default now());create table marketplace_listing_actions(id uuid primary key default gen_random_uuid(),connection_id uuid,provider_listing_id text,status text);`);
  for(const file of ['20261007230000_marketplace_sales_notifications.sql','20261011200000_marketplace_local_products.sql','20261012010000_marketplace_inventory_sync.sql','20261012230000_marketplace_sales_history.sql','20261013150000_marketplace_magalu_sales.sql'])await db.exec(sql(file));
  // A migração 27 restringe o enfileiramento ao conector então implementado.
  await db.exec(`do $$declare d text;begin d:=pg_get_functiondef('marketplace_enqueue_stock(uuid,uuid,boolean)'::regprocedure);d:=replace(d,'l.product_id=p.id','l.product_id=p.id and l.provider=''mercado_livre''');execute d;end $$;`);
  const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID(),ml=crypto.randomUUID(),magalu=crypto.randomUUID();
  await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[actor]);await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[actor,company]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
  await db.query("insert into marketplace_connections(id,empresa_id,provider,status)values($1,$2,'mercado_livre','connected'),($3,$2,'magalu','connected')",[ml,company,magalu]);
  await db.query("insert into marketplace_inventory_settings values($1,true,now()-interval '2 days')on conflict(empresa_id)do update set activated_at=excluded.activated_at",[company]);
  await db.exec(sql('20261021020000_marketplace_connector_parity.sql'));
  const command=async(action,data)=>(await db.query('select marketplace_product_command($1,$2,$3,$4,$5) r',[company,actor,action,JSON.stringify(data),crypto.randomUUID()])).rows[0].r;
  const product=(await command('create',{name:'Produto',stock_quantity:4,physical_confirmation:true})).product_id;
  await db.query("update marketplace_products set stock_baseline_at=now()-interval '1 day' where id=$1",[product]);
  for(const [connection,provider,id]of[[ml,'mercado_livre','MLB123456'],[magalu,'magalu','SKU.1']])await command('link',{product_id:product,connection_id:connection,provider,provider_listing_id:id,title:'Produto',reported_stock:4,status:'active'});
  const stock=async()=>(await db.query('select stock_quantity from marketplace_products where id=$1',[product])).rows[0].stock_quantity;
  const save=async(code,confirmedAt,status='paid',quantity=1)=>db.query("insert into marketplace_sales(empresa_id,connection_id,provider,provider_order_id,status,snapshot)values($1,$2,'magalu',$3,$4,$5)on conflict(connection_id,provider_order_id)do update set status=excluded.status,snapshot=excluded.snapshot,updated_at=now()",[company,magalu,code,status,JSON.stringify({confirmedAt,providerUpdatedAt:new Date().toISOString(),inventoryLines:[{listingId:'SKU.1',quantity,variationId:'',title:'Produto'}]})]);
  await save('antiga',new Date(Date.now()-86400000).toISOString());assert.equal(await stock(),4,'histórico não ganha nova baixa');
  await db.query("update marketplace_inventory_channels set activated_at=now()-interval '1 hour' where connection_id=$1",[magalu]);
  const now=new Date().toISOString();await save('venda-1',now);await save('venda-1',now);assert.equal(await stock(),3);assert.equal((await db.query("select count(*)::int n from marketplace_stock_movements where kind='sale'")).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from marketplace_inventory_outbox where desired_quantity=3')).rows[0].n,2,'ML e Magalu recebem o mesmo Online');
  await save('venda-1',now,'cancelled');assert.equal(await stock(),3,'cancelamento não devolve fisicamente por suposição');
  await save('venda-1',now,'paid',2);assert.equal(await stock(),3,'mudança de quantidade vira pendência, não baixa duplicada');assert.equal((await db.query("select issue from marketplace_inventory_events where order_id='venda-1'")).rows[0].issue,'order_quantity_changed');
  await assert.rejects(db.query("insert into marketplace_listings(provider,provider_listing_id)values('magalu','../SKU')"),e=>e.code==='23514');
  await db.query("insert into marketplace_listings(provider,provider_listing_id)values('magalu','SKU.1'),('mercado_livre','MLB123456')");
  const rights=(await db.query("select has_table_privilege('authenticated','marketplace_inventory_channels','select') allowed,relrowsecurity rls from pg_class where relname='marketplace_inventory_channels'")).rows[0];assert.deepEqual(rights,{allowed:false,rls:true});
 }finally{await db.close();}
});
