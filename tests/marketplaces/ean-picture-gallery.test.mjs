import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('galeria por EAN conserva fotos encontradas, é idempotente e preserva capa manual, saldo e outras empresas',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);');
  await db.exec(readFileSync('supabase/migrations/20261011200000_marketplace_local_products.sql','utf8'));
  await db.exec('create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid,created_by uuid,provider_product_id text,product_name text,ean text,product_description text,image_url text,market_price_cents bigint,created_at timestamptz default now());');
  for(const file of ['20261019020000_marketplace_price_products_stock.sql','20261021040000_marketplace_researched_product_facts.sql','20261026020000_marketplace_ean_picture_gallery.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID();
  await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[actor]);
  const pictures=['https://cdn.example/capa.jpg','https://cdn.example/lateral.jpg','https://cdn.example/tras.jpg'];
  const input={name:'Produto exato',ean:'7899882311471',image:pictures[0],pictures};
  const register=async(data=input,tenant=company)=>(await db.query('select marketplace_price_product_register_gallery($1,$2,$3,$4) id',[tenant,actor,'mercado_livre:MLB123',JSON.stringify(data)])).rows[0].id;
  const id=await register(),read=async()=>(await db.query('select pictures,revision,stock_quantity from marketplace_products where id=$1',[id])).rows[0];
  assert.deepEqual((await read()).pictures,pictures);
  const revision=(await read()).revision;assert.equal(await register(),id);assert.equal((await read()).revision,revision);
  await db.query('update marketplace_products set pictures=$2,stock_quantity=7,stock_confirmed_at=now(),stock_confirmed_by=$3 where id=$1',[id,JSON.stringify(['https://manual.example/capa.jpg']),actor]);
  await register();assert.deepEqual((await read()).pictures,['https://manual.example/capa.jpg']);assert.equal((await read()).stock_quantity,7);
  assert.notEqual(await register(input,other),id);
  await assert.rejects(register({...input,pictures:['javascript:alert(1)']}),/HTTPS/);
  const rights=(await db.query("select has_function_privilege('authenticated','marketplace_price_product_register_gallery(uuid,uuid,text,jsonb)','EXECUTE') client,has_function_privilege('service_role','marketplace_price_product_register_gallery(uuid,uuid,text,jsonb)','EXECUTE') server")).rows[0];
  assert.deepEqual(rights,{client:false,server:true});
 }finally{await db.close();}
});
