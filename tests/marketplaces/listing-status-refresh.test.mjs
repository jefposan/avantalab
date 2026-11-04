import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=p=>readFileSync(p,'utf8');
test('progresso da conferência é privado e migração preserva cadastro/saldo',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create table empresas(id uuid primary key);create table marketplace_connections(id uuid primary key);
   create table produto(id int, saldo int);insert into produto values(1,7);`);
  await db.exec(read('supabase/migrations/20261022020000_marketplace_listing_status_checks.sql'));
  assert.deepEqual((await db.query('select * from produto')).rows,[{id:1,saldo:7}]);
  assert.deepEqual((await db.query("select has_table_privilege('authenticated','marketplace_listing_status_checks','select') allowed,has_table_privilege('anon','marketplace_listing_status_checks','select') public,has_table_privilege('service_role','marketplace_listing_status_checks','insert') worker")).rows[0],{allowed:false,public:false,worker:true});
  assert.equal((await db.query("select relrowsecurity from pg_class where relname='marketplace_listing_status_checks'")).rows[0].relrowsecurity,true);
  assert.equal((await db.query('select count(*)::int count from marketplace_listing_status_checks')).rows[0].count,0);
 }finally{await db.close();}
});
test('conferência conhecida está ligada ao worker e à atualização automática sem substituir edição',()=>{
 const worker=read('app/modules/marketplaces/services/inventory-worker.ts');
 assert.match(worker,/refreshKnownListingStatuses/);assert.match(worker,/last_checked_at/);
 const api=read('app/api/modulos/marketplaces/anunciados/sincronizar/route.ts');
 assert.match(api,/reconcileKnown===true/);assert.match(api,/refreshKnownListingStatuses/);
 const ui=read('app/marketplaces/Anunciados.tsx');
 assert.match(ui,/reconcileKnown:\s*true/);assert.match(ui,/setRows\(data.listings\)/);
 assert.match(ui,/listingRemovalVersion\|\|expanded\|\|acting\|\|copyingListing\|\|syncing/);
 assert.match(ui,/loadListRef.current\(true,true\)/);assert.match(ui,/checked.partial \|\| checked.busy/);
 assert.match(ui,/statusNames\[rowStatus\] \|\| rowStatus/);
});
