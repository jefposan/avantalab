import { sqlDeTesteURL } from '../helpers/sql-historico.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pendingSaleOperation} from '../../app/modules/marketplaces/listing-operations.ts';
import {SHIPMENT_IN_TRANSIT_SUBSTATUSES} from '../../app/modules/marketplaces/shipment-progress.ts';
const read=name=>readFileSync(sqlDeTesteURL(name),'utf8');
const upgrade=read('20261105234500_marketplace_shipment_retry.sql');
async function fixture(){
 const db=new PGlite(),company=crypto.randomUUID(),other=crypto.randomUUID(),user=crypto.randomUUID(),connection=crypto.randomUUID();
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function public.usuario_area_rpc_restricao(text,jsonb) returns boolean language sql stable as $$ select false $$;
 create table auth.users(id uuid primary key);create table empresas(id uuid primary key);
 create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
 create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
 create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,status text,seller_name text,connected_at timestamptz default now()-interval '10 days',last_error_code text);
 create table marketplace_listings(id uuid primary key default gen_random_uuid(),empresa_id uuid,connection_id uuid,provider_listing_id text,search_text text,status text,snapshot jsonb,synced_at timestamptz default now());`);
 await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[user]);
 await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[user,company]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
 await db.query("insert into marketplace_connections(id,empresa_id,provider,status,seller_name) values($1,$2,'mercado_livre','connected','JEFF')",[connection,company]);
 for(const file of ['20261007230000_marketplace_sales_notifications.sql','20261011200000_marketplace_local_products.sql','20261012010000_marketplace_inventory_sync.sql','20261012190000_marketplace_connection_labels.sql','20261012230000_marketplace_sales_history.sql','20261013150000_marketplace_magalu_sales.sql','20261013170000_marketplace_pending_sale_alerts.sql','20261024150000_marketplace_inventory_protection.sql'])await db.exec(read(file));
 const snapshot={confirmedAt:new Date(Date.now()-3*86400000).toISOString(),providerUpdatedAt:new Date().toISOString(),inventoryLines:[{listingId:'MLB123456',quantity:1,title:'Exemplo'}]};
 const sale=async(order,substatus='ready_to_print',patch={})=>(await db.query(`insert into marketplace_sales(empresa_id,connection_id,provider_order_id,status,shipment_status,shipment_substatus,label_status,snapshot) values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,[company,connection,order,patch.status||'paid',patch.shipment||'ready_to_ship',substatus,patch.label||'unavailable',JSON.stringify(snapshot)])).rows[0].id;
 const feed=async()=>(await db.query('select marketplace_live_feed($1,$2) data',[company,user])).rows[0].data;
 return{db,company,other,user,connection,sale,feed};
}

test('SQL real: upgrade remove falsos avisos de envio e mantém saldos, eventos, acesso e atualização de trânsito',async()=>{
 const f=await fixture(),{db}=f;try{
  const transit=await f.sale('100','in_hub'),ready=await f.sale('200');
  assert.equal((await f.feed()).alerts.length,2,'reproduz o defeito da base anterior');
  const before=(await db.query('select id,state,quantity from marketplace_inventory_events order by id')).rows;
  await db.exec(upgrade);await db.exec(upgrade);
  let alerts=(await f.feed()).alerts;assert.deepEqual(alerts.map(a=>a.sale_id),[ready]);
  assert.deepEqual((await db.query('select id,state,quantity from marketplace_inventory_events order by id')).rows,before);
  assert.equal((await db.query('select count(*)::int n from marketplace_stock_movements')).rows[0].n,0);
  const rows=(await db.query('select provider_order_id from marketplace_pending_sales order by provider_order_id')).rows;
  assert.deepEqual(rows.map(r=>r.provider_order_id),['100','200'],'trânsito continua sendo atualizado até concluir');
  await f.sale('300','dropped_off');assert.equal((await f.feed()).alerts.length,1,'trigger não registra falso despacho');
  await db.query("update marketplace_sales set shipment_substatus='picked_up' where id=$1",[ready]);assert.equal((await f.feed()).alerts.length,0);
  assert.equal((await db.query('select shipment_substatus from marketplace_sales where id=$1',[transit])).rows[0].shipment_substatus,'in_hub');
  await assert.rejects(db.query('select marketplace_live_feed($1,$2)',[f.other,f.user]),/Sem acesso/);
  for(const fn of ['marketplace_live_feed(uuid,uuid)','marketplace_shipment_has_left_seller(text,text)','marketplace_sale_operation(text,text,jsonb,text)'])assert.equal((await db.query("select has_function_privilege('authenticated',$1,'execute') allowed",[fn])).rows[0].allowed,false);
 }finally{await db.close();}
});

test('SQL e controlador usam a mesma precedência para trânsito, financeiro, cancelamento e pós-venda',async()=>{
 const f=await fixture(),{db}=f;try{
  await db.exec(upgrade);
  for(const status of ['paid','confirmed','payment_required','payment_in_process','partially_paid','pending_cancel','cancelled','refunded','partially_refunded','invalid'])
   for(const shipment_status of ['ready_to_ship','shipped','delivered','not_delivered'])
    for(const shipment_substatus of [...SHIPMENT_IN_TRANSIT_SUBSTATUSES,'ready_to_print','invoice_pending',null])
     for(const state of ['open','closed','unknown',null]){
      const snapshot=state?{postSaleProgress:{state}}:{};
      const expected=pendingSaleOperation({status,shipment_status,shipment_substatus,snapshot,connection_id:f.connection});
      const actual=(await db.query('select marketplace_sale_operation($1,$2,$3,$4) label',[status,shipment_status,JSON.stringify(snapshot),shipment_substatus])).rows[0].label;
      assert.equal(actual,expected,JSON.stringify({status,shipment_status,shipment_substatus,state}));
     }
 }finally{await db.close();}
});


test('SQL real: observação validada antecipa conferência de correção externa sem modificar saldo, geração ou permissão de reposição',async()=>{
 const f=await fixture(),{db}=f;try{
  const p=crypto.randomUUID(),link=crypto.randomUUID();
  await db.query("insert into marketplace_products(id,empresa_id,name,stock_quantity,stock_confirmed_at,stock_baseline_at,revision) values($1,$2,'Repetidor',1,now(),now(),5)",[p,f.company]);
  await db.query("insert into marketplace_product_links(id,empresa_id,connection_id,product_id,provider,provider_listing_id,title,status,reported_stock) values($1,$2,$3,$4,'mercado_livre','MLB123456','Repetidor','paused',0)",[link,f.company,f.connection,p]);
  await db.query("insert into marketplace_inventory_outbox(link_id,empresa_id,product_id,desired_quantity,revision,state,issue,attempts,next_attempt_at) values($1,$2,$3,1,5,'pending','lower_remote_stock',185,now()+interval '30 minutes') on conflict(link_id) do update set desired_quantity=1,state='pending',issue='lower_remote_stock',attempts=185,next_attempt_at=now()+interval '30 minutes'",[link,f.company,p]);
  const before=(await db.query('select id,stock_quantity,revision from marketplace_products')).rows;
  const jobBefore=(await db.query('select * from marketplace_inventory_outbox')).rows[0];
  await db.exec(upgrade);
  await db.query('select marketplace_observe_listing($1,$2,$3,$4,$5)',[f.company,f.connection,'MLB123456',0,'paused']);
  let job=(await db.query('select * from marketplace_inventory_outbox')).rows[0];
  assert.equal(job.next_attempt_at.getTime(),jobBefore.next_attempt_at.getTime(),'diagnóstico igual não provoca nova rodada imediata');
  await db.query('select marketplace_observe_listing($1,$2,$3,$4,$5)',[f.company,f.connection,'MLB123456',1,'paused']);
  job=(await db.query('select * from marketplace_inventory_outbox')).rows[0];
  assert.ok(job.next_attempt_at.getTime()<=Date.now()+1000);
  assert.equal(job.state,'pending','observação não finge sincronização concluída');
  assert.equal(job.generation,jobBefore.generation);assert.equal(job.allow_increase,false);assert.equal(job.attempts,185);
  assert.equal((await db.query('select status from marketplace_product_links')).rows[0].status,'paused');
  assert.deepEqual((await db.query('select id,stock_quantity,revision from marketplace_products')).rows,before);
  await db.query('select marketplace_observe_listing($1,$2,$3,$4,$5)',[f.other,f.connection,'MLB123456',0,'active']);
  assert.equal((await db.query('select status from marketplace_product_links')).rows[0].status,'paused');
  await db.query("update marketplace_inventory_outbox set next_attempt_at=now()+interval '30 minutes' where link_id=$1",[link]);
  await db.query('select marketplace_observe_listing($1,$2,$3,$4,$5)',[f.company,f.connection,'MLB123456',2,'paused']);
  job=(await db.query('select * from marketplace_inventory_outbox')).rows[0];
  assert.ok(job.next_attempt_at.getTime()<=Date.now()+1000,'saldo remoto maior também antecipa a proteção');
  assert.equal(job.desired_quantity,1);assert.equal(job.allow_increase,false);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.user]);
  await assert.rejects(db.query('select marketplace_observe_listing($1,$2,$3,$4,$5)',[f.company,f.connection,'MLB123456',1,'active']),e=>e.code==='42501'&&/área não foi liberada/.test(e.message));
  assert.equal((await db.query('select status from marketplace_product_links')).rows[0].status,'paused','proteção de área vigente continua bloqueando a escrita');
  assert.equal((await db.query('select count(*)::int n from marketplace_stock_movements')).rows[0].n,0);
 }finally{await db.close();}
});
