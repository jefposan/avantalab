import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('posts: versões, tentativa idempotente, concorrência, tenant e acessos isolados sem mudar produto',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create schema storage;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(empresa_id uuid,user_id uuid,status text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_price_users(empresa_id uuid,user_id uuid,ativo boolean);create table marketplace_products(empresa_id uuid,id uuid,name text,stock_quantity integer,archived_at timestamptz,unique(empresa_id,id));create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
 await db.exec(readFileSync('supabase/historico-sem-registro/20261027130000_marketplace_product_posts.sql','utf8'));
 const c=crypto.randomUUID(),other=crypto.randomUUID(),p=crypto.randomUUID(),actor=crypto.randomUUID(),reader=crypto.randomUUID(),key=crypto.randomUUID();
 await db.query('insert into empresas values($1),($2)',[c,other]);await db.query('insert into auth.users values($1),($2)',[actor,reader]);
 await db.query("insert into usuarios_empresa values($1,$2,'ativo')",[c,actor]);await db.query('insert into marketplace_price_users values($1,$2,true)',[c,reader]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[c]);await db.query("insert into marketplace_products values($1,$2,'Produto',3,null)",[c,p]);
 const call=async(rev,k=crypto.randomUUID(),a=actor,company=c,draft={description:'Post'},hash='a'.repeat(64))=>(await db.query('select marketplace_product_post_save($1,$2,$3,$4,$5,$6,$7) r',[company,p,a,k,rev,JSON.stringify(draft),hash])).rows[0].r;
 const first=await call(0,key);assert.equal(first.revision,1);assert.equal(first.image_path,`${c}/${p}/${key}/post.png`);assert.equal((await call(0,key)).revision,1);
 await assert.rejects(call(1,key,actor,c,{description:'Outro'}),/outros dados/);
 await assert.rejects(call(0),/Outro usuário/);
 assert.equal((await call(1,undefined,reader)).revision,2,'usuário de consulta autorizado cria post sem permissão de estoque');
 await assert.rejects(call(2,undefined,reader,other),/Sem acesso/);
 await db.query('update marketplace_price_users set ativo=false where user_id=$1',[reader]);await assert.rejects(call(2,undefined,reader),/Sem acesso/);
 assert.equal((await db.query('select count(*)::int n from marketplace_product_posts')).rows[0].n,2);
 assert.deepEqual((await db.query('select name,stock_quantity from marketplace_products')).rows[0],{name:'Produto',stock_quantity:3});
 const rights=(await db.query("select relrowsecurity rls,has_table_privilege('authenticated','marketplace_product_posts','select') read,has_function_privilege('authenticated','marketplace_product_post_save(uuid,uuid,uuid,uuid,integer,jsonb,text)','execute') rpc from pg_class where relname='marketplace_product_posts'")).rows[0];assert.deepEqual(rights,{rls:true,read:false,rpc:false});
 assert.equal((await db.query("select public from storage.buckets where id='marketplace-product-posts'")).rows[0].public,false);
 }finally{await db.close();}
});
