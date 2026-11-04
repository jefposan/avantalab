import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createSearchRenderFixture} from './price-search-render-harness.mjs';

test('consulta_precos vê edição manual e pesquisa ativa; revisão e carregamento continuam protegidos',()=>{
 const result={status:'found',localProductId:crypto.randomUUID(),localProductRevision:1,ean:'7908103790527',product:{id:'LOCAL:test',name:'Produto teste',description:'',image:null,attributes:[]},prices:{market:200,minimum:100,medium:140,ideal:180}};
 const fixture=extra=>createSearchRenderFixture({company:{id:crypto.randomUUID(),nome:'Teste',perfil:'consulta_precos'},resultDetailsOpen:true,result,...extra}).render().html;
 const html=fixture();assert.match(html,/Ajustar preço médio/);assert.match(html,/Atualizar cálculos/);
 const button=h=>h.match(/<button[^>]*aria-label="Atualizar preço"[^>]*>/)?.[0];
 assert.ok(button(html));assert.doesNotMatch(button(html),/disabled/);
 assert.match(button(fixture({result:{...result,localProductRevision:undefined}})),/disabled/);
 assert.match(button(fixture({savingPrice:true})),/disabled/);
 assert.match(fixture({result:{...result,prices:undefined}}),/Ajustar preço médio/);
 const missing=fixture({result:{...result,prices:undefined,referenceStatus:'missing'}});assert.match(missing,/Produto cadastrado sem preço/);assert.match(missing,/Informe uma referência/);assert.doesNotMatch(missing,/Referência salva e conferida/);
 assert.match(fixture({result:{...result,referenceStatus:'saved'}}),/Referência salva e conferida no servidor/);
 assert.match(fixture({result:{...result,referenceStatus:'preserved'}}),/Referência anterior preservada/);
});

test('SQL real: preço liberado por perfil ativo, sem conceder estoque/cadastro geral; pesquisa e concorrência preservadas',async()=>{
 const db=new PGlite();try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;
   create table auth.users(id uuid primary key);create table empresas(id uuid primary key);
   create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);
   create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);
   create table marketplace_price_users(user_id uuid,empresa_id uuid,ativo boolean);
   create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);`);
  for(const file of ['20261011200000_marketplace_local_products.sql','20261019010000_marketplace_product_price_research.sql','20261021050000_marketplace_price_reference_access.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID(),regular=crypto.randomUUID(),id=crypto.randomUUID();
  await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1),($2)',[actor,regular]);
  await db.query("insert into empresa_modulos values($1,'marketplaces',true,null),($2,'marketplaces',true,null)",[company,other]);
  await db.query('insert into marketplace_price_users values($1,$2,true)',[actor,company]);
  await db.query("insert into usuarios_empresa values($1,$2,'ativo','operador_simples')",[regular,company]);
  await db.query(`insert into marketplace_products(id,empresa_id,name,price_cents,stock_quantity,stock_confirmed_at,pictures,publication_form) values($1,$2,'Manual',20000,7,now(),'["https://example.com/manual.jpg"]','{"custom":"preservado"}')`,[id,company]);
  const edit=(who=actor,revision=1,key=crypto.randomUUID(),tenant=company,price=25000)=>db.query('select marketplace_price_reference_edit($1,$2,$3,$4,$5,$6) r',[tenant,who,id,revision,price,key]);
  const key=crypto.randomUUID();await edit(actor,1,key);await edit(actor,1,key);
  let p=(await db.query('select * from marketplace_products where id=$1',[id])).rows[0];
  assert.equal(p.price_cents,25000);assert.equal(p.revision,2);assert.equal(p.stock_quantity,7);assert.equal(p.name,'Manual');assert.deepEqual(p.pictures,['https://example.com/manual.jpg']);assert.equal(p.publication_form.custom,'preservado');assert.equal(p.publication_form.price,250);
  await assert.rejects(edit(actor,1),/cadastro mudou/);await assert.rejects(edit(actor,1,key,company,26000),/dados diferentes/);
  await assert.rejects(edit(actor,2,crypto.randomUUID(),other),/Sem permissão/);
  await assert.rejects(db.query("select marketplace_product_command($1,$2,'confirm_stock',$3,$4)",[company,actor,JSON.stringify({product_id:id,revision:2,quantity:99}),crypto.randomUUID()]),/permissão/i);
  const research=async(who,revision,action,key,offers=[])=>db.query('select marketplace_product_price_research($1,$2,$3,$4,$5,$6,$7,null) r',[company,who,id,revision,key,action,JSON.stringify(offers)]);
  const job=crypto.randomUUID();assert.equal((await research(actor,2,'claim',job)).rows[0].r.claimed,true);
  await research(actor,2,'complete',job,[{price:300,url:'https://example.com/oferta',title:'Produto',seller:'Loja'}]);
  await edit(regular,3,crypto.randomUUID(),company,35000);
  await db.exec('update marketplace_price_users set ativo=false');await assert.rejects(edit(actor,4),/Sem permissão/);await assert.rejects(research(actor,4,'claim',crypto.randomUUID()),/Sem permissão/);
  await db.exec('update empresa_modulos set ativo=false');await assert.rejects(edit(regular,4),/Sem permissão/);
  assert.equal((await db.query('select count(*)::int n from marketplace_stock_movements')).rows[0].n,0);
  const rights=(await db.query("select has_function_privilege('authenticated','marketplace_price_reference_edit(uuid,uuid,uuid,bigint,bigint,uuid)','EXECUTE') e,has_function_privilege('anon','marketplace_price_reference_allowed(uuid,uuid)','EXECUTE') a")).rows[0];assert.deepEqual(rights,{e:false,a:false});
 }finally{await db.close();}
});
