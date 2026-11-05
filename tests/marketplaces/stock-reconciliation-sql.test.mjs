import { sqlDeTesteURL } from '../helpers/sql-historico.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=name=>readFileSync(sqlDeTesteURL(name),'utf8');
test('sincronização: migração, origem única, isolamento offline, recibo e zero confirmado',async()=>{
 const db=new PGlite();try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);`);
  for(const name of ['20261006090000_avantaprecos_users.sql','20261011200000_marketplace_local_products.sql'])await db.exec(sql(name));
  await db.exec(`create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas(id),created_by uuid references auth.users(id),provider_product_id text,product_name text,ean text,product_description text,image_url text,market_price_cents bigint,created_at timestamptz default now());`);
  for(const name of ['20261019020000_marketplace_price_products_stock.sql','20261019210000_marketplace_price_stock_permission.sql'])await db.exec(sql(name));
  const company=crypto.randomUUID(),actor=crypto.randomUUID(),connection=crypto.randomUUID();
  await db.query('insert into empresas values($1)',[company]);await db.query('insert into auth.users values($1)',[actor]);
  await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[actor,company]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
  const product=(await db.query('select marketplace_product_command($1,$2,$3,$4,$5) r',[company,actor,'create',JSON.stringify({name:'Air Fryer',stock_quantity:3,physical_confirmation:true}),crypto.randomUUID()])).rows[0].r.product_id;
  await db.exec(`create table marketplace_inventory_events(empresa_id uuid,product_id uuid,state text);create table marketplace_inventory_settings(empresa_id uuid,enabled boolean);create table marketplace_inventory_outbox(link_id uuid primary key,empresa_id uuid,product_id uuid,desired_quantity integer,revision bigint,allow_increase boolean,generation uuid default gen_random_uuid(),state text default 'pending',issue text,attempts integer default 0,next_attempt_at timestamptz default now(),updated_at timestamptz default now());create function marketplace_enqueue_stock(p_empresa uuid,p_product uuid,p_increase boolean default false) returns void language sql as $$select$$;`);
  await db.exec(sql('20261019230000_marketplace_warehouses.sql'));
  await db.exec(sql('20261021010000_marketplace_stock_reconciliation.sql'));
  await db.query('insert into marketplace_inventory_settings values($1,true)',[company]);await db.query("insert into marketplace_connections values($1,$2,'mercado_livre')",[connection,company]);
  const links=[crypto.randomUUID(),crypto.randomUUID()];
  for(let i=0;i<2;i++)await db.query("insert into marketplace_product_links(id,empresa_id,product_id,connection_id,provider,provider_listing_id,title,reported_stock,status) values($1,$2,$3,$4,'mercado_livre',$5,'Air Fryer',2,'active')",[links[i],company,product,connection,`MLB12345${i}`]);
  const warehouse=async(action,payload)=>(await db.query('select marketplace_warehouse_command($1,$2,$3,$4,$5) r',[company,actor,action,JSON.stringify(payload),crypto.randomUUID()])).rows[0].r;
  const offline=(await warehouse('create',{name:'Saldão'})).warehouseId;
  await warehouse('add',{warehouseId:offline,productId:product,revision:1,quantity:4});
  const stock=async()=>(await db.query('select stock_quantity,revision from marketplace_products where id=$1',[product])).rows[0];
  const review=async(quantity=2)=>{
   const sources=links.map((id,i)=>({id,eligible:true,provider:'mercado_livre',quantity,listingId:`MLB12345${i}`}));
   return(await db.query('insert into marketplace_stock_sync_reviews(empresa_id,actor_id,product_id,revision,sources) values($1,$2,$3,$4,$5) returning id',[company,actor,product,(await stock()).revision,JSON.stringify(sources)])).rows[0].id;
  };
  const run=async(payload,key=crypto.randomUUID())=>(await db.query('select marketplace_stock_sync_command($1,$2,$3,$4) r',[company,actor,key,JSON.stringify(payload)])).rows[0].r;
  const key=crypto.randomUUID(),payload={reviewId:await review(),direction:'listing_to_local',sourceId:links[0],confirmation:true,confirmZero:false};
  const first=await run(payload,key);assert.equal(first.quantity,2);assert.equal((await stock()).stock_quantity,2,'não soma dois anúncios');
  assert.deepEqual(await run(payload,key),first);await assert.rejects(run({...payload,direction:'local_to_listings'},key),/outros dados/);
  assert.equal((await db.query('select quantity from marketplace_warehouse_balances where warehouse_id=$1',[offline])).rows[0].quantity,4,'Saldão preservado');
  assert.equal((await db.query('select count(*)::int n from marketplace_inventory_outbox where desired_quantity=2')).rows[0].n,2);
  const expired=await review();await db.query("update marketplace_stock_sync_reviews set created_at=now()-interval '6 minutes' where id=$1",[expired]);await assert.rejects(run({...payload,reviewId:expired}),/expirada/);
  const foreign=crypto.randomUUID();await db.query('insert into empresas values($1)',[foreign]);await assert.rejects(db.query('select marketplace_stock_sync_command($1,$2,$3,$4)',[foreign,actor,crypto.randomUUID(),JSON.stringify(payload)]),/Sem permissão/);
  const pendingReview=await review();await db.query("insert into marketplace_inventory_events values($1,$2,'pending')",[company,product]);await assert.rejects(run({...payload,reviewId:pendingReview}),/vendas pendentes/);await db.query('delete from marketplace_inventory_events');
  const zero={...payload,reviewId:await review(0)};await assert.rejects(run(zero),/Confirme a pausa/);await run({...zero,confirmZero:true});assert.equal((await stock()).stock_quantity,0);
  const stale=await review(3);await db.query('update marketplace_products set revision=revision+1 where id=$1',[product]);await assert.rejects(run({...payload,reviewId:stale}),/saldo local mudou/);
  await db.query('delete from marketplace_inventory_outbox');await db.query("select marketplace_observe_listing($1,$2,'MLB123450',5,'active')",[company,connection]);
  assert.equal((await db.query('select count(*)::int n from marketplace_inventory_outbox')).rows[0].n,0,'edição externa não reenfileira sobrescrita');
  const rights=(await db.query("select has_function_privilege('authenticated','marketplace_stock_sync_command(uuid,uuid,uuid,jsonb)','execute') allowed,relrowsecurity rls from pg_class where relname='marketplace_stock_sync_operations'")).rows[0];assert.deepEqual(rights,{allowed:false,rls:true});
 }finally{await db.close();}
});
