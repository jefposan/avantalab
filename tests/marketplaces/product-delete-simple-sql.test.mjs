import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=n=>readFileSync('supabase/migrations/'+n,'utf8');
test('exclusão simplificada: saldo desconhecido/positivo não bloqueia; apaga cadastro e mantém vendas/movimentos',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
 create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
 create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text,seller_name text,seller_reference text,status text,last_synced_at timestamptz,expires_at timestamptz);
 create table marketplace_publications(empresa_id uuid,connection_id uuid,provider_listing_id text,response_summary jsonb,status text);
 create table marketplace_inventory_events(empresa_id uuid,product_id uuid,state text);
 create table marketplace_inventory_outbox(empresa_id uuid,product_id uuid,state text,issue text,generation uuid default gen_random_uuid(),updated_at timestamptz);
 create table marketplace_inventory_worker(id integer primary key,lease_until timestamptz);insert into marketplace_inventory_worker values(1,null);
 create table marketplace_listing_actions(empresa_id uuid,connection_id uuid,provider_listing_id text,action text,status text);
 create function marketplace_enqueue_stock(e uuid,p uuid,i boolean)returns void language sql as $$select$$;
 create function marketplace_listing_catalog_import(p_empresa uuid,p_connection uuid,p_listing text)returns jsonb language sql as $$select '{"delegated":true}'::jsonb$$;`);
 await db.exec(sql('20261011200000_marketplace_local_products.sql'));await db.exec(sql('20261019230000_marketplace_warehouses.sql'));
 await db.exec(`alter table marketplace_inventory_events add foreign key(empresa_id,product_id)references marketplace_products(empresa_id,id);
 create table marketplace_direct_sales(id uuid primary key default gen_random_uuid(),empresa_id uuid,product_id uuid not null,product_name text,total_cents int,foreign key(empresa_id,product_id)references marketplace_products(empresa_id,id));
 create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid,local_product_id uuid,foreign key(empresa_id,local_product_id)references marketplace_products(empresa_id,id));
 create table marketplace_price_product_sources(empresa_id uuid,product_id uuid,foreign key(empresa_id,product_id)references marketplace_products(empresa_id,id));
 create table marketplace_product_internal_notes(empresa_id uuid,product_id uuid,notes text,foreign key(empresa_id,product_id)references marketplace_products(empresa_id,id));`);
 await db.exec(sql('20261022160000_marketplace_product_removal.sql'));
 const company=crypto.randomUUID(),actor=crypto.randomUUID(),account=crypto.randomUUID();
 await db.query('insert into empresas values($1)',[company]);await db.query('insert into auth.users values($1)',[actor]);await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[actor,company]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
 const product=async(q=null)=>{const id=crypto.randomUUID();await db.query('insert into marketplace_products(id,empresa_id,name,stock_quantity,stock_confirmed_at)values($1,$2,$3,$4,case when $4::int is null then null else now()end)',[id,company,'Máquina '+id,q]);return id;};
 const old=await product(); // Identidade de registros anteriores também é preenchida.
 await db.exec(sql('20261022180000_marketplace_product_delete_simple.sql'));
 const review=async id=>(await db.query('select marketplace_product_removal_context($1,$2,$3)r',[company,actor,id])).rows[0].r;
 const remove=async(id,proofs=[],key=crypto.randomUUID(),revision=1)=>(await db.query("select marketplace_product_remove($1,$2,$3,$4,'deleted',$5,$6,$7)r",[company,actor,id,revision,'Máquina '+id,key,JSON.stringify(proofs)])).rows[0].r;
 for(const id of [old,await product(null),await product(0),await product(9)]){
  await db.query("insert into marketplace_direct_sales(empresa_id,product_id,product_name,total_cents)values($1,$2,'Máquina vendida',60000)",[company,id]);
  await db.query('insert into marketplace_price_consultations(empresa_id,local_product_id)values($1,$2)',[company,id]);await db.query('insert into marketplace_price_product_sources values($1,$2)',[company,id]);await db.query("insert into marketplace_product_internal_notes values($1,$2,'Duplicado')",[company,id]);
  await db.query("insert into marketplace_stock_movements(empresa_id,product_id,actor_id,kind,stock_before,stock_after)values($1,$2,$3,'adjustment',1,0)",[company,id,actor]);
  const r=await review(id);assert.equal(r.mode,'deleted');assert.equal(r.stockBlocked,false);
  const key=crypto.randomUUID();assert.equal((await remove(id,[],key)).mode,'deleted');assert.equal((await remove(id,[],key)).replayed,true);
  assert.equal((await db.query('select count(*)::int n from marketplace_products where id=$1',[id])).rows[0].n,0);
  assert.equal((await db.query('select product_name,total_cents from marketplace_direct_sales where product_id=$1',[id])).rows[0].total_cents,60000);
  assert.equal((await db.query('select count(*)::int n from marketplace_stock_movements where product_id=$1',[id])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from marketplace_price_consultations where local_product_id=$1',[id])).rows[0].n,0);
  await assert.rejects(db.query("insert into marketplace_direct_sales(empresa_id,product_id)values($1,$2)",[company,id]),/Produto excluído/);
 }
 const linked=await product();await db.query("insert into marketplace_connections(id,empresa_id,provider,status)values($1,$2,'mercado_livre','connected')",[account,company]);
 const link=crypto.randomUUID();await db.query("insert into marketplace_product_links(id,empresa_id,product_id,connection_id,provider,provider_listing_id,title,status)values($1,$2,$3,$4,'mercado_livre','MLB1','Máquina','paused')",[link,company,linked,account]);
 const proof={linkId:link,connectionId:account,listingId:'MLB1',status:'paused',checkedAt:new Date().toISOString()};await assert.rejects(remove(linked,[proof]),/Encerre ou exclua/);
 proof.status='closed';await db.query("update marketplace_product_links set status='closed' where id=$1",[link]);await remove(linked,[proof]);
 const imported=(await db.query("select marketplace_listing_catalog_import($1,$2,'MLB1')r",[company,account])).rows[0].r;assert.equal(imported.removed,true);
 const secure=(await db.query("select has_table_privilege('anon','marketplace_product_history_keys','select')a,has_function_privilege('authenticated','marketplace_product_remove(uuid,uuid,uuid,bigint,text,text,uuid,jsonb)','execute')b")).rows[0];assert.deepEqual(secure,{a:false,b:false});
 }finally{await db.close();}
});

test('busca SQL normaliza registros antigos e novos, acentos/cedilha e Unicode decomposto sem alterar título',async()=>{
 const db=new PGlite();try{await db.exec("create table marketplace_listings(title text,provider_listing_id text,snapshot jsonb,search_text text);insert into marketplace_listings values('Máquina de Costura','MLB1','{}','máquina de costura');");await db.exec(sql('20261022181000_marketplace_search_accents.sql'));
 assert.equal((await db.query("select count(*)::int n from marketplace_listings where search_text ilike '%maquina%'")).rows[0].n,1);
 await db.query('insert into marketplace_listings values($1,$2,$3,$4)',['Açúcar e coração','MLB2','{}','AÇÚCAR']);
 assert.equal((await db.query("select search_text from marketplace_listings where provider_listing_id='MLB2'")).rows[0].search_text,'acucar e coracao mlb2');
 assert.equal((await db.query('select marketplace_search_normalize($1)n',['  MÁQUINA  ç '])).rows[0].n,'maquina c');
 assert.equal((await db.query("select title from marketplace_listings where provider_listing_id='MLB1'")).rows[0].title,'Máquina de Costura');
 }finally{await db.close();}
});
