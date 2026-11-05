import { sqlDeTesteURL } from '../helpers/sql-historico.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read=name=>readFileSync(sqlDeTesteURL(name),'utf8');
test('SQL real: Editar estoque nasce desmarcado, limita empresa/comando e revogação preserva saldo/histórico',async()=>{
  const db=new PGlite();try{
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);`);
    await db.exec(read('20261006090000_avantaprecos_users.sql'));
    await db.exec(read('20261011200000_marketplace_local_products.sql'));
    await db.exec(`create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas(id),created_by uuid references auth.users(id),provider_product_id text,product_name text,ean text,product_description text,image_url text,market_price_cents bigint,created_at timestamptz default now());`);
    await db.exec(read('20261019020000_marketplace_price_products_stock.sql'));
    const company=crypto.randomUUID(),other=crypto.randomUUID(),editor=crypto.randomUUID(),manager=crypto.randomUUID();
    await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1),($2)',[editor,manager]);
    await db.query("insert into empresa_modulos values($1,'marketplaces',true,null),($2,'marketplaces',true,null)",[company,other]);
    await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[manager,company]);
    await db.query("insert into marketplace_price_users(empresa_id,user_id,nome,login,email) values($1,$2,'Editor','editor','editor@example.invalid')",[company,editor]);
    // Migrar não concede nada aos usuários que já existiam.
    const migration=read('20261019210000_marketplace_price_stock_permission.sql');await db.exec(migration);await db.exec(migration);
    assert.equal((await db.query('select can_edit_stock from marketplace_price_users')).rows[0].can_edit_stock,false);
    const cmd=async(actor,action,data,key=crypto.randomUUID(),tenant=company)=>(await db.query('select marketplace_product_command($1,$2,$3,$4,$5) result',[tenant,actor,action,JSON.stringify(data),key])).rows[0].result;
    const product=(await cmd(manager,'create',{name:'Produto',price_cents:50000})).product_id;
    const input={product_id:product,revision:1,quantity:3,physical_confirmation:true};
    await assert.rejects(cmd(editor,'confirm_stock',input),/Sem permissão/);
    await db.query('update marketplace_price_users set can_edit_stock=true where empresa_id=$1 and user_id=$2',[company,editor]);
    const key=crypto.randomUUID();await cmd(editor,'confirm_stock',input,key);await cmd(editor,'confirm_stock',input,key);
    assert.equal((await db.query('select stock_quantity from marketplace_products where id=$1',[product])).rows[0].stock_quantity,3);
    const movement=(await db.query('select actor_id,stock_after from marketplace_stock_movements where product_id=$1',[product])).rows;assert.deepEqual(movement,[{actor_id:editor,stock_after:3}]);
    await assert.rejects(cmd(editor,'confirm_stock',{...input,quantity:5}),/atualizado/);
    for(const action of ['create','update','merge','link','import','enrich','draft'])await assert.rejects(cmd(editor,action,{...input,revision:2}),/Sem permissão/);
    await assert.rejects(cmd(editor,'confirm_stock',{...input,revision:2},crypto.randomUUID(),other),/Sem permissão/);
    await db.query('update marketplace_price_users set can_edit_stock=false');await assert.rejects(cmd(editor,'confirm_stock',{...input,revision:2}),/Sem permissão/);
    await db.query('update marketplace_price_users set can_edit_stock=true,ativo=false');await assert.rejects(cmd(editor,'confirm_stock',{...input,revision:2}),/Sem permissão/);
    await db.query('update marketplace_price_users set ativo=true');await db.query('update empresa_modulos set ativo=false where empresa_id=$1',[company]);await assert.rejects(cmd(editor,'confirm_stock',{...input,revision:2}),/Sem permissão/);
    await db.query('update empresa_modulos set ativo=true,expira_em=now()-interval \'1 minute\' where empresa_id=$1',[company]);await assert.rejects(cmd(editor,'confirm_stock',{...input,revision:2}),/Sem permissão/);
    assert.equal((await db.query('select stock_quantity from marketplace_products where id=$1',[product])).rows[0].stock_quantity,3);
    const rights=(await db.query("select has_function_privilege('authenticated','marketplace_price_stock_authorized(uuid,uuid,text)','execute') helper,has_function_privilege('anon','marketplace_product_command_base_49(uuid,uuid,text,jsonb,uuid)','execute') base,relrowsecurity rls from pg_class where relname='marketplace_price_users'")).rows[0];assert.deepEqual(rights,{helper:false,base:false,rls:true});
  } finally {await db.close();}
});
