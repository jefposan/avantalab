import test from 'node:test';
import assert from 'node:assert/strict';
import { productCleanupFixture } from './helpers/product-cleanup-fixture.mjs';
const review=async(f,ids,actor=f.scope.actor,company=f.scope.company)=>(await f.db.query('select marketplace_product_cleanup_review($1,$2,$3) as plan',[company,actor,ids])).rows[0].plan;
const list=async f=>(await f.db.query('select marketplace_product_cleanup_list($1,$2) as result',[f.scope.company,f.scope.actor])).rows[0].result;
const execute=async(f,ids,plan,options={})=>(await f.db.query('select marketplace_product_cleanup_execute($1,$2,$3,$4,$5,$6,$7) as result',[options.company||f.scope.company,options.actor||f.scope.actor,ids,plan.reviewToken,options.confirmation??plan.companyName,options.acknowledged??true,options.key||crypto.randomUUID()])).rows[0].result;
const archived=async(f,id)=>(await f.db.query('select archived_at from marketplace_products where id=$1',[id])).rows[0]?.archived_at;

test('prévia completa isola perfis e bloqueia saldos/anúncios/trabalho sem bloquear históricos',async()=>{
 const f=await productCleanupFixture();try{
  const data=await list(f);assert.equal(data.products.length,7);assert.ok(!data.products.some(p=>p.id===f.products.foreign));
  assert.equal(data.products.find(p=>p.id===f.products.price).origin,'avantaprecos');
  assert.equal(data.products.find(p=>p.id===f.products.historic).hasHistory,true);
  assert.equal(data.products.find(p=>p.id===f.products.historic).blockers.length,0);
  assert.ok(data.products.find(p=>p.id===f.products.stocked).blockers.some(b=>b.includes('saldo')));
  assert.ok(data.products.find(p=>p.id===f.products.shared).blockers.some(b=>b.includes('anúncios')));
  await assert.rejects(review(f,[f.products.price,f.products.foreign]),/não pertence/);
  await assert.rejects(review(f,[f.products.price,f.products.price]),/diferentes/);
  await assert.rejects(review(f,[]),/Selecione/);
  await assert.rejects(review(f,[f.products.price],crypto.randomUUID()),/permissão/);
  const blocked=await review(f,[f.products.stocked]);await assert.rejects(execute(f,[f.products.stocked],blocked),/saldo|bloqueios/);
  await f.db.query("insert into marketplace_product_price_researches(empresa_id,product_id,status) values($1,$2,'pending')",[f.scope.company,f.products.price]);
  assert.ok((await review(f,[f.products.price])).products[0].blockers.length);
 }finally{await f.db.close();}
});

test('exige confirmação explícita, revisão atual e seleção exata; falha não apaga parcialmente',async()=>{
 const f=await productCleanupFixture();try{
  const ids=[f.products.price,f.products.local],plan=await review(f,ids);
  await assert.rejects(execute(f,ids,plan,{acknowledged:false}),/Confirme/);
  await assert.rejects(execute(f,ids,plan,{confirmation:'OUTRO PERFIL'}),/confirmação/);
  assert.equal(await archived(f,ids[0]),null);
  await f.db.query('update marketplace_products set revision=revision+1 where id=$1',[ids[0]]);
  await assert.rejects(execute(f,ids,plan),/mudaram/);
  const current=await review(f,ids),failingId=current.products[1].id;
  await f.db.exec("create function fail_cleanup_test() returns trigger language plpgsql as $$begin if new.id='"+failingId+"'::uuid and new.archived_at is not null then raise exception 'Falha simulada';end if;return new;end$$;create trigger fail_cleanup_test before update on marketplace_products for each row execute function fail_cleanup_test();");
  await assert.rejects(execute(f,ids,current),/Falha simulada/);
  assert.equal(await archived(f,ids[0]),null);assert.equal(await archived(f,ids[1]),null);
  assert.equal((await f.db.query('select count(*)::int n from marketplace_product_cleanups')).rows[0].n,0);
  assert.equal((await f.db.query('select count(*)::int n from marketplace_product_removals')).rows[0].n,0);
 }finally{await f.db.close();}
});

test('retira cadastros ativos, preserva todas as pesquisas/vendas e permite repetir a mesma tentativa',async()=>{
 const f=await productCleanupFixture();try{
  const warehouse=crypto.randomUUID();
  await f.db.query("insert into marketplace_warehouses(id,empresa_id,name,is_online) values($1,$2,'Histórico local',false)",[warehouse,f.scope.company]);
  await f.db.query("insert into marketplace_stock_movements(empresa_id,product_id,actor_id,kind,stock_after,note) values($1,$2,$3,'confirmation',0,'Conferência histórica')",[f.scope.company,f.products.historic,f.scope.actor]);
  await f.db.query("insert into marketplace_warehouse_movements(empresa_id,product_id,actor_id,warehouse_id,kind,stock_after,warehouse_name) values($1,$2,$3,$4,'set',0,'Histórico local')",[f.scope.company,f.products.historic,f.scope.actor,warehouse]);
  const ids=[f.products.price,f.products.local,f.products.historic],plan=await review(f,ids),key=crypto.randomUUID();
  const before=(await f.db.query('select (select count(*) from marketplace_price_consultations)::int prices,(select count(*) from marketplace_direct_sales)::int sales,(select count(*) from future_product_history)::int future,(select count(*) from marketplace_stock_movements)::int stock,(select count(*) from marketplace_warehouse_movements)::int warehouses')).rows[0];
  const done=await execute(f,ids,plan,{key});assert.equal(done.removed,3);assert.equal(done.historyPreserved,true);
  for(const id of ids)assert.ok(await archived(f,id));
  assert.deepEqual((await f.db.query('select (select count(*) from marketplace_price_consultations)::int prices,(select count(*) from marketplace_direct_sales)::int sales,(select count(*) from future_product_history)::int future,(select count(*) from marketplace_stock_movements)::int stock,(select count(*) from marketplace_warehouse_movements)::int warehouses')).rows[0],before);
  assert.ok(!(await list(f)).products.some(p=>ids.includes(p.id)));
  assert.equal((await execute(f,[...ids].reverse(),plan,{key})).replayed,true);
  await assert.rejects(execute(f,[ids[0]],plan,{key}),/outra seleção/);
  assert.equal(await archived(f,f.products.foreign),null);
  const access=(await f.db.query("select has_function_privilege('authenticated','marketplace_product_cleanup_execute(uuid,uuid,uuid[],text,text,boolean,uuid)','execute') authenticated,has_table_privilege('anon','marketplace_product_cleanups','select') anon")).rows[0];assert.equal(access.authenticated,false);assert.equal(access.anon,false);
  await f.db.query("update usuarios_empresa set status='inativo' where user_id=$1 and empresa_id=$2",[f.scope.actor,f.scope.company]);
  await assert.rejects(execute(f,ids,plan,{key}),/permissão/);
 }finally{await f.db.close();}
});

test('evento antigo da conta arquivada é histórico; evento pendente de conta atual e saldo fora do Online bloqueiam',async()=>{
 const f=await productCleanupFixture();try{
  await f.db.query("update marketplace_connections set data_archived_at=now(),catalog_import_enabled=false where id=$1",[f.scope.account]);
  await f.db.query("insert into marketplace_inventory_events(empresa_id,product_id,connection_id,state,issue) values($1,$2,$3,'pending','product_not_linked')",[f.scope.company,f.products.historic,f.scope.account]);
  let plan=await review(f,[f.products.historic]);assert.equal(plan.products[0].blockers.length,0);
  await execute(f,[f.products.historic],plan);
  assert.equal((await f.db.query('select count(*)::int n from marketplace_inventory_events where product_id=$1',[f.products.historic])).rows[0].n,1);
  await f.db.query("insert into marketplace_inventory_events(empresa_id,product_id,connection_id,state,issue) values($1,$2,$3,'pending','stock_not_confirmed')",[f.scope.company,f.products.local,f.scope.sharedAccount]);
  plan=await review(f,[f.products.local]);assert.ok(plan.products[0].blockers.length);await assert.rejects(execute(f,[f.products.local],plan),/bloqueios/);
  const warehouse=crypto.randomUUID();await f.db.query("insert into marketplace_warehouses(id,empresa_id,name,is_online) values($1,$2,'Saldão',false)",[warehouse,f.scope.company]);
  await f.db.query('insert into marketplace_warehouse_balances(empresa_id,product_id,warehouse_id,quantity,confirmed_at) values($1,$2,$3,1,now())',[f.scope.company,f.products.price,warehouse]);
  assert.ok((await review(f,[f.products.price])).products[0].blockers.some(b=>b.includes('saldo')));
 }finally{await f.db.close();}
});

test('conta desconectada libera o cadastro e retira vínculos/fila locais com auditoria, sem apagar vendas ou anúncios remotos',async()=>{
 const f=await productCleanupFixture();try{
  const id=f.products.sold,link=(await f.db.query('select id,provider_listing_id from marketplace_product_links where product_id=$1',[id])).rows[0];
  await f.db.query("insert into marketplace_inventory_outbox(empresa_id,product_id,link_id,state,issue) values($1,$2,$3,'pending','reconnect')",[f.scope.company,id,link.id]);
  await f.db.query('insert into marketplace_listing_stock_control(empresa_id,product_id,link_id) values($1,$2,$3)',[f.scope.company,id,link.id]);
  await f.db.query("insert into marketplace_inventory_events(empresa_id,product_id,connection_id,state,issue) values($1,$2,$3,'pending','product_not_linked')",[f.scope.company,id,f.scope.account]);
  const plan=await review(f,[id]);assert.equal(plan.products[0].linked,false);assert.equal(plan.products[0].disconnectedLinks,1);assert.equal(plan.products[0].blockers.length,0);
  const done=await execute(f,[id],plan);assert.equal(done.removed,1);
  const counts=(await f.db.query('select (select count(*) from marketplace_product_links where product_id=$1)::int links,(select count(*) from marketplace_inventory_outbox where product_id=$1)::int jobs,(select count(*) from marketplace_listing_stock_control where product_id=$1)::int controls,(select count(*) from marketplace_direct_sales where product_id=$1)::int sales,(select count(*) from marketplace_inventory_events where product_id=$1)::int events',[id])).rows[0];
  assert.deepEqual(counts,{links:0,jobs:0,controls:0,sales:1,events:1});
  const audit=(await f.db.query('select snapshot from marketplace_product_removals where product_id=$1',[id])).rows[0].snapshot;
  assert.equal(audit.product.links.length,1);assert.equal(audit.retiredStockJobs.length,1);
  assert.equal((await f.db.query('select count(*)::int n from marketplace_listings where provider_listing_id=$1 and empresa_id=$2',[link.provider_listing_id,f.scope.company])).rows[0].n,1);
  assert.equal((await f.db.query('select marketplace_listing_catalog_import($1,$2,$3) r',[f.scope.company,f.scope.account,link.provider_listing_id])).rows[0].r.removed,true);
  assert.equal(await archived(f,f.products.foreign),null);
 }finally{await f.db.close();}
});

test('conta conectada, vencida ou reconectada continua protegida; a reconexão invalida a prévia antiga',async()=>{
 const f=await productCleanupFixture();try{
  const id=f.products.eligible,plan=await review(f,[id]);assert.equal(plan.products[0].blockers.length,0);
  for(const state of ['connected','expired','attention']){
   await f.db.query('update marketplace_connections set status=$1,updated_at=clock_timestamp() where id=$2',[state,f.scope.account]);
   assert.ok((await review(f,[id])).products[0].blockers.some(b=>b.includes('conectada')));
   await assert.rejects(execute(f,[id],plan),/mudaram/);assert.equal(await archived(f,id),null);
  }
  await f.db.query("update marketplace_connections set status='disconnected',sync_lock_until=now()+interval '1 minute' where id=$1",[f.scope.account]);
  assert.ok((await review(f,[id])).products[0].blockers.some(b=>b.includes('andamento')));
  await f.db.query('update marketplace_connections set sync_lock_until=null where id=$1',[f.scope.account]);
  await f.db.query("insert into marketplace_listing_actions(empresa_id,connection_id,provider_listing_id,action,status) values($1,$2,'MLB7898578153678','pause','requested')",[f.scope.company,f.scope.account]);
  assert.ok((await review(f,[id])).products[0].blockers.some(b=>b.includes('andamento')));
  const mixed=await review(f,[f.products.shared]);assert.equal(mixed.products[0].linked,true);assert.ok(mixed.products[0].blockers.length);
  await assert.rejects(execute(f,[f.products.shared],mixed),/bloqueios/);
 }finally{await f.db.close();}
});

test('encontra referências desconectadas pelo EAN sem vínculo e preserva bloqueio de operações em voo',async()=>{
 const f=await productCleanupFixture();try{
  const id=f.products.eligible;
  await f.db.query('delete from marketplace_product_links where product_id=$1',[id]);
  await f.db.query("insert into marketplace_publications(empresa_id,connection_id,provider_listing_id,response_summary,status) values($1,$2,'MLB7898578153678',$3,'published')",[f.scope.company,f.scope.account,JSON.stringify({local_product_id:id})]);
  let plan=await review(f,[id]);assert.equal(plan.products[0].disconnectedLinks,1);assert.equal(plan.products[0].blockers.length,0);
  await f.db.query("update marketplace_publications set status='publishing' where response_summary->>'local_product_id'=$1",[id]);
  assert.ok((await review(f,[id])).products[0].blockers.length);
  await f.db.query("update marketplace_publications set status='published' where response_summary->>'local_product_id'=$1",[id]);
  plan=await review(f,[id]);await execute(f,[id],plan);
  const snapshot=(await f.db.query('select snapshot from marketplace_product_removals where product_id=$1',[id])).rows[0].snapshot;
  assert.equal(snapshot.product.links[0].unlinked,true);
 }finally{await f.db.close();}
});
