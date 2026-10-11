import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { localProductData, physicalQuantity, productFromPreparation, productFromSnapshot } from '../../app/modules/marketplaces/services/local-product-model.ts';

test('quantidade física desconhecida não vira zero; só aceita inteiros não negativos', () => {
  for (const value of [null, undefined, '', '1', -1, 1.2, NaN, 100000]) assert.equal(physicalQuantity(value), null);
  assert.equal(physicalQuantity(0), 0); assert.equal(physicalQuantity(99999), 99999);
});
test('cadastro usa campos permitidos, EAN opcional e fotos HTTPS, sem copiar segredos', () => {
  const product = localProductData({ name:'Produto', ean:'', price:99.89, pictures:['javascript:alert(1)','https://example.com/foto.jpg'], accessToken:'secret', buyer:'private' });
  assert.equal(product.ean,null); assert.equal(product.price_cents,9989); assert.equal(product.invalidEan,false);
  assert.deepEqual(product.pictures,['https://example.com/foto.jpg']); assert.equal(product.accessToken,undefined); assert.equal(product.buyer,undefined);
  assert.equal(localProductData({name:'Produto',ean:'7899882306942'}).invalidEan,true);
});
test('anúncio importado mantém quantidade apenas como dado da ficha, sem confirmar saldo', () => {
  const imported=productFromSnapshot({title:'Produto',ean:'',price:100,stock:7,category:'MLB123',shipping:{mode:'me2'}});
  assert.equal(imported.stock_quantity,undefined); assert.equal(imported.publication_form.stock,7); assert.equal(imported.ean,null);
  const saved=productFromPreparation({ean:'',price:120,stock:4,description:'Completa',attributes:{BRAND:'Marca'},copySource:{connectionId:'private',listingId:'MLB1'}},{name:'Produto',pictures:['https://example.com/foto.jpg'],attributes:[]});
  assert.equal(saved.publication_form.copySource,undefined); assert.equal(saved.price_cents,12000); assert.equal(saved.description,'Completa');
});
test('RPC real: isolamento, estoque pendente/zero, idempotência, concorrência e vínculos sem soma', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create role anon; create role authenticated; create role service_role; create table auth.users(id uuid primary key); create table empresas(id uuid primary key); create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text); create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz); create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);`);
    await db.exec(readFileSync(new URL('../../supabase/migrations/20261011200000_marketplace_local_products.sql',import.meta.url),'utf8'));
    const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID(),connection=crypto.randomUUID(),wrong=crypto.randomUUID();
    await db.query('insert into empresas values ($1),($2)',[company,other]); await db.query('insert into auth.users values ($1)',[actor]);
    await db.query("insert into usuarios_empresa values ($1,$2,'ativo','administrador')",[actor,company]);
    await db.query("insert into empresa_modulos values ($1,'marketplaces',true,null)",[company]);
    await db.query("insert into marketplace_connections values ($1,$2,'mercado_livre'),($3,$4,'mercado_livre')",[connection,company,wrong,other]);
    const command=async(action,data,key=crypto.randomUUID(),empresa=company)=>(await db.query('select marketplace_product_command($1,$2,$3,$4,$5) as result',[empresa,actor,action,JSON.stringify(data),key])).rows[0].result;
    const data={name:'Produto',connection_id:connection,provider:'mercado_livre',provider_listing_id:'MLB1',reported_stock:5,stock_quantity:90};
    const imported=await command('import',data); assert.equal(imported.created,true);
    assert.equal((await command('import',data)).product_id,imported.product_id);
    const stock=async id=>(await db.query('select stock_quantity from marketplace_products where id=$1',[id])).rows[0].stock_quantity;
    assert.equal(await stock(imported.product_id),null);
    await assert.rejects(command('import',{...data,connection_id:wrong}),/não pertence/);
    await assert.rejects(command('create',{name:'Outro'},crypto.randomUUID(),other),/Sem permissão/);
    await assert.rejects(command('confirm_stock',{product_id:imported.product_id,quantity:3,physical_confirmation:true}),/atualizado/);
    await assert.rejects(command('confirm_stock',{product_id:imported.product_id,revision:1,quantity:3}),/Confirme/);
    await assert.rejects(command('confirm_stock',{product_id:imported.product_id,revision:1,quantity:2.5,physical_confirmation:true}),/inválida/);
    const key=crypto.randomUUID(),confirm={product_id:imported.product_id,revision:1,quantity:3,physical_confirmation:true};
    const outcomes=await Promise.allSettled([command('confirm_stock',confirm,key),command('confirm_stock',{...confirm,quantity:2})]);
    assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
    await command('confirm_stock',confirm,key);
    assert.equal((await db.query('select count(*)::int as n from marketplace_stock_movements')).rows[0].n,1);
    await assert.rejects(command('confirm_stock',{...confirm,quantity:2},key),/dados diferentes/);
    const pending=await command('import',{...data,provider_listing_id:'MLB2',reported_stock:7});
    await command('merge',{product_id:pending.product_id,revision:1,target_id:imported.product_id,target_revision:2});
    assert.equal(await stock(imported.product_id),3);
    await command('enrich',{product_id:imported.product_id,revision:3,description:'Descrição completa',pictures:['https://example.com/foto.jpg'],stock_quantity:500,name:'Outro nome'});
    assert.equal(await stock(imported.product_id),3);
    assert.equal((await db.query('select name from marketplace_products where id=$1',[imported.product_id])).rows[0].name,'Produto');
    assert.equal((await db.query('select count(*)::int as n from marketplace_product_links where product_id=$1',[imported.product_id])).rows[0].n,2);
    assert.equal((await command('import',{...data,provider_listing_id:'MLB2'})).product_id,imported.product_id);
    await assert.rejects(command('merge',{product_id:imported.product_id,revision:4,target_id:pending.product_id,target_revision:2}),/ainda não confirmado/);
    await command('link',{product_id:imported.product_id,connection_id:connection,provider:'mercado_livre',provider_listing_id:'MLB3',reported_stock:100});
    assert.equal(await stock(imported.product_id),3);
    await assert.rejects(command('create',{name:'Sem confirmação',stock_quantity:2}),/Confirme/);
    const draftKey=crypto.randomUUID(); const draft=await command('draft',{name:'Novo',stock_quantity:0,physical_confirmation:true},draftKey);
    assert.equal((await command('draft',{name:'Alterado',stock_quantity:80,physical_confirmation:true},draftKey)).product_id,draft.product_id);
    assert.equal(await stock(draft.product_id),0);
    const secured=await db.query("select relname,relrowsecurity from pg_class where relname in ('marketplace_products','marketplace_product_links','marketplace_stock_movements','marketplace_product_operations')");
    assert.equal(secured.rows.length,4); assert.ok(secured.rows.every(r=>r.relrowsecurity));
    const rights=await db.query("select has_function_privilege('authenticated','marketplace_product_command(uuid,uuid,text,jsonb,uuid)','EXECUTE') as exec, has_table_privilege('anon','marketplace_products','SELECT') as read");
    assert.deepEqual(rights.rows[0],{exec:false,read:false});
    await db.query("update usuarios_empresa set perfil='operador_simples'");
    await assert.rejects(command('create',{name:'Negado'}),/Sem permissão/);
  } finally { await db.close(); }
});
