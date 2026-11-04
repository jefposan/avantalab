import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=name=>readFileSync(`supabase/migrations/${name}`,'utf8');
test('exclusão SQL: saldo, todas as contas, histórico, concorrência, permissões e repetição segura',async()=>{
 const db=new PGlite();try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
   create table auth.users(id uuid primary key);create table empresas(id uuid primary key);
   create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
   create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
   create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,seller_name text,seller_reference text,status text,last_synced_at timestamptz,expires_at timestamptz);
   create table marketplace_publications(empresa_id uuid,connection_id uuid,provider_listing_id text,response_summary jsonb,status text);
   create table marketplace_inventory_events(empresa_id uuid,product_id uuid,state text);
   create table marketplace_inventory_outbox(empresa_id uuid,product_id uuid,state text,issue text,generation uuid default gen_random_uuid(),updated_at timestamptz);
   create table marketplace_inventory_worker(id integer primary key,lease_until timestamptz);
   create table marketplace_listing_actions(empresa_id uuid,connection_id uuid,provider_listing_id text,action text,status text);
   insert into marketplace_inventory_worker values(1,null);
   create function marketplace_enqueue_stock(e uuid,p uuid,i boolean) returns void language sql as $$select$$;
   create function marketplace_listing_catalog_import(p_empresa uuid,p_connection uuid,p_listing text) returns jsonb language sql as $$select '{"delegated":true}'::jsonb$$;`);
  await db.exec(sql('20261011200000_marketplace_local_products.sql'));
  await db.exec(sql('20261019230000_marketplace_warehouses.sql'));
  await db.exec(`alter table marketplace_inventory_events add foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id);
   alter table marketplace_inventory_outbox add foreign key(empresa_id,product_id) references marketplace_products(empresa_id,id);
   create table future_history(product_id uuid references marketplace_products(id),detail text);
   create table retained_sales(product_id uuid references marketplace_products(id),quantity int);`);
  await db.exec(sql('20261022160000_marketplace_product_removal.sql'));
  const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID(),viewer=crypto.randomUUID(),a=crypto.randomUUID(),b=crypto.randomUUID();
  await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1),($2)',[actor,viewer]);
  await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador'),($3,$2,'ativo','operador_simples')",[actor,company,viewer]);
  await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
  for(const [id,provider]of [[a,'mercado_livre'],[b,'magalu']])await db.query("insert into marketplace_connections(id,empresa_id,provider,seller_name,seller_reference,status)values($1,$2,$3,'Conta','123','connected')",[id,company,provider]);
  const product=async(quantity=0,ean=null)=>{const id=crypto.randomUUID();await db.query('insert into marketplace_products(id,empresa_id,name,stock_quantity,stock_confirmed_at,ean)values($1,$2,$3,$4,case when $4::int is null then null else now()end,$5)',[id,company,'Produto '+id,quantity,ean]);return id;};
  const context=async(id,user=actor,tenant=company)=>(await db.query('select marketplace_product_removal_context($1,$2,$3) review',[tenant,user,id])).rows[0].review;
  const remove=async(id,{key=crypto.randomUUID(),proofs=[],revision=1,mode='deleted',name='Produto '+id,user=actor,tenant=company}={})=>(await db.query('select marketplace_product_remove($1,$2,$3,$4,$5,$6,$7,$8) result',[tenant,user,id,revision,mode,name,key,JSON.stringify(proofs)])).rows[0].result;
  const count=async(table,id)=>(await db.query(`select count(*)::int n from ${table} where ${table==='marketplace_products'?'id':'product_id'}=$1`,[id])).rows[0].n;
  const unused=await product(),key=crypto.randomUUID();
  assert.equal((await context(unused)).mode,'deleted');
  await assert.rejects(context(unused,viewer),/permissão/);await assert.rejects(context(unused,actor,other),/permissão/);
  await assert.rejects(remove(unused,{revision:2}),/mudou/);await assert.rejects(remove(unused,{name:'outro'}),/mudou/);
  assert.equal((await remove(unused,{key})).mode,'deleted');assert.equal(await count('marketplace_products',unused),0);assert.equal(await count('marketplace_product_removals',unused),1);
  assert.equal((await remove(unused,{key})).replayed,true);await assert.rejects(remove(unused,{key,name:'outro'}),/outros dados/);
  for(const qty of [1,null]){const id=await product(qty);assert.equal((await context(id)).stockBlocked,true);await assert.rejects(remove(id),/saldo|quantidade/);}
  const historic=await product();await db.query("insert into future_history values($1,'audit')",[historic]);await db.query('insert into retained_sales values($1,1)',[historic]);
  assert.equal((await context(historic)).mode,'archived');await assert.rejects(remove(historic),/histórico mudou/);
  await remove(historic,{mode:'archived'});assert.equal(await count('retained_sales',historic),1);assert.equal(await count('future_history',historic),1);
  assert.ok((await db.query('select archived_at from marketplace_products where id=$1',[historic])).rows[0].archived_at);
  const id=await product(0,'7891129598607'),links=[];
  for(const [conn,provider,status]of [[a,'mercado_livre','paused'],[b,'magalu','active']]){const link=crypto.randomUUID();links.push({linkId:link,connectionId:conn,listingId:'ITEM'+conn,status,checkedAt:new Date().toISOString()});await db.query('insert into marketplace_product_links(id,empresa_id,product_id,connection_id,provider,provider_listing_id,title,status)values($1,$2,$3,$4,$5,$6,$7,$8)',[link,company,id,conn,provider,'ITEM'+conn,'Produto',status]);}
  const review=await context(id);assert.equal(review.product.links.length,2);assert.equal(review.accounts.length,2);
  await assert.rejects(remove(id,{mode:'archived',proofs:[links[0]]}),/todos os anúncios/);
  await assert.rejects(remove(id,{mode:'archived',proofs:links}),/anúncio ativo/);
  await db.query("update marketplace_product_links set status='paused' where product_id=$1",[id]);links.forEach(p=>p.status='paused');
  await assert.rejects(remove(id,{mode:'archived',proofs:[links[0],links[0]]}),/todos os anúncios/);
  for(const status of ['requested','uncertain']){
   await db.query('insert into marketplace_listing_actions values($1,$2,$3,$4,$5)',[company,a,links[0].listingId,'resume',status]);
   assert.equal((await context(id)).workBlocked,true);
   await assert.rejects(remove(id,{mode:'archived',proofs:links}),/alteração de anúncio/);
   await db.exec('delete from marketplace_listing_actions');
  }
  for(const patch of [{checkedAt:new Date(Date.now()-120000).toISOString()},{checkedAt:null},{connectionId:other},{listingId:'OUTRO'}])await assert.rejects(remove(id,{mode:'archived',proofs:[{...links[0],...patch},links[1]]}),/anúncio ativo/);
  await db.query("insert into marketplace_inventory_outbox(empresa_id,product_id,state)values($1,$2,'pending')",[company,id]);
  await db.exec("update marketplace_inventory_worker set lease_until=now()+interval '1 minute'");await assert.rejects(remove(id,{mode:'archived',proofs:links}),/sincronização/);
  await db.exec('update marketplace_inventory_worker set lease_until=null');
  await db.query("insert into marketplace_inventory_events values($1,$2,'pending')",[company,id]);await assert.rejects(remove(id,{mode:'archived',proofs:links}),/vendas pendentes/);
  await db.query("update marketplace_inventory_events set state='applied' where product_id=$1",[id]);
  await remove(id,{mode:'archived',proofs:links});assert.equal(await count('marketplace_product_links',id),2);assert.equal(await count('marketplace_inventory_events',id),1);
  await assert.rejects(db.query("insert into marketplace_listing_actions values($1,$2,$3,'resume','requested')",[company,a,links[0].listingId]),/arquivado/);
  await assert.rejects(db.query("insert into marketplace_publications values($1,$2,null,$3,'publishing')",[company,a,JSON.stringify({local_product_id:id})]),/Produto removido/);
  assert.equal((await db.query('select state from marketplace_inventory_outbox where product_id=$1',[id])).rows[0].state,'excluded');
  const imported=(await db.query('select marketplace_listing_catalog_import($1,$2,$3) result',[company,a,links[0].listingId])).rows[0].result;assert.equal(imported.archived,true);assert.equal(imported.product_id,id);
  await assert.rejects(product(0,'7891129598607'),/arquivado/);
  const pending=await product();await db.query("insert into marketplace_publications values($1,$2,null,$3,'publishing')",[company,a,JSON.stringify({local_product_id:pending})]);assert.equal((await context(pending)).workBlocked,true);await assert.rejects(remove(pending,{mode:'archived'}),/sincronização/);
  const w=crypto.randomUUID(),offline=await product();await db.query("insert into marketplace_warehouses(id,empresa_id,name,is_online)values($1,$2,'Saldão',false)",[w,company]);await db.query('insert into marketplace_warehouse_balances(empresa_id,product_id,warehouse_id,quantity,confirmed_at)values($1,$2,$3,2,now())',[company,offline,w]);await assert.rejects(remove(offline),/saldo|quantidade/);
  const permissions=(await db.query("select has_function_privilege('authenticated','marketplace_product_remove(uuid,uuid,uuid,bigint,text,text,uuid,jsonb)','execute') rpc,has_table_privilege('anon','marketplace_product_removals','select') audit")).rows[0];assert.equal(permissions.rpc,false);assert.equal(permissions.audit,false);
  await db.exec('update empresa_modulos set ativo=false');
  await assert.rejects(remove(unused,{key}),/Sem permissão/);
 }finally{await db.close();}
});
