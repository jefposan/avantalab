import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const company='10000000-0000-4000-8000-000000000001',actor='10000000-0000-4000-8000-000000000002',product='10000000-0000-4000-8000-000000000003',owner='10000000-0000-4000-8000-000000000004',other='10000000-0000-4000-8000-000000000005';
async function fixture(){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(empresa_id uuid,user_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_products(empresa_id uuid,id uuid,name text,sku text,ean text,category_id text,catalog_product_id text,description text,pictures jsonb,attributes jsonb,publication_form jsonb,stock_quantity int,price_cents int,revision bigint,updated_at timestamptz,archived_at timestamptz,primary key(empresa_id,id));create table marketplace_product_operations(empresa_id uuid,request_key uuid,actor_id uuid,action text,request_hash text,result jsonb);create table saldo(id int,quantidade int);insert into saldo values(1,3);insert into empresas values('${company}');insert into auth.users values('${actor}');insert into usuarios_empresa values('${company}','${actor}','ativo','administrador');insert into empresa_modulos values('${company}','marketplaces',true,null);insert into marketplace_products values('${company}','${product}','Nome manual','SKU','7896347195829','MLB123','','Descrição manual','["https://manual.com/capa.jpg"]','[{"id":"POWER","name":"Potência","value":"500 W"},{"id":"TEXT","name":"Texto","value":""}]','{"attributes":{"COLOR":"Minha cor"},"shippingMode":"me2"}',3,9999,1,now(),null);`);await db.exec(readFileSync('supabase/migrations/20261027010000_catalog_completion.sql','utf8'));return db;}
const seed=db=>db.query('select marketplace_catalog_completion_seed($1,$2)',[company,actor]);
const claim=async(db,who=owner)=>(await db.query('select marketplace_catalog_completion_claim($1,$2) job',[who,company])).rows[0].job;
const fill=(db,revision=1,who=owner,data={description:'Descrição oficial',pictures:['https://http2.mlstatic.com/nova.jpg'],attributes:[{id:'POWER',name:'Potência',value:'900 W'},{id:'TEXT',name:'Texto',value:'Oficial'},{id:'COLOR',name:'Cor',value:'Preto'}]})=>db.query('select marketplace_catalog_complete_local($1,$2,$3,$4,$5,$6) changed',[company,actor,product,revision,who,data]);
const source={id:'MLB999',name:'Nome oficial',ean:'7896347195829',description:'Descrição oficial',pictures:[{id:'nova',url:'https://http2.mlstatic.com/nova.jpg'}],attributes:[{id:'POWER',name:'Potência',value:'900 W'},{id:'WARRANTY_TIME',name:'Garantia',value:'1 ano'},{id:'SELLER_SKU',name:'Código',value:'Outro'}]};
const confirmFull=(db,revision=1,who=actor)=>db.query('select marketplace_catalog_confirm_full($1,$2,$3,$4,$5)',[company,who,product,revision,source]);
const claimFull=async db=>(await db.query('select marketplace_catalog_completion_claim($1,$2,true) job',[owner,company])).rows[0].job;
test('seleção de fotos e capa é exata; worker antigo não assume o trabalho; preço e saldo preservados',async()=>{const db=await fixture();try{
 await db.exec(readFileSync('supabase/migrations/20261027020000_catalog_full_confirmation.sql','utf8'));await db.exec(readFileSync('supabase/migrations/20261027030000_catalog_photo_selection.sql','utf8'));
 const selected={...source,photoMode:'custom',pictures:[{id:'photo-second',url:'https://http2.mlstatic.com/segunda.jpg'},{id:'photo-first',url:'https://http2.mlstatic.com/primeira.jpg'}]};
 await db.query('select marketplace_catalog_confirm_full($1,$2,$3,1,$4)',[company,actor,product,selected]);assert.equal(await claimFull(db),null);
 const job=(await db.query('select marketplace_catalog_completion_claim($1,$2,true,true) job',[owner,company])).rows[0].job;assert.equal(job.product_id,product);
 await db.query('select marketplace_catalog_apply_full_local($1,$2,$3,1,$4)',[company,actor,product,owner]);const row=(await db.query('select * from marketplace_products')).rows[0];assert.deepEqual(row.pictures,selected.pictures.map(p=>p.url));assert.equal(row.publication_form.pictureUrl,selected.pictures[0].url);assert.equal(row.price_cents,9999);assert.equal(row.stock_quantity,3);assert.equal(row.sku,'SKU');
 assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_catalog_completion_claim(uuid,uuid,boolean,boolean)','execute') allowed")).rows[0].allowed,false);
 await db.exec("update marketplace_catalog_completion set state='completed',lease_owner=null,lease_until=null,next_check_at=now()");assert.equal(await claimFull(db),null);
 const next=(await db.query('select marketplace_catalog_completion_claim($1,$2,true,true) job',[owner,company])).rows[0].job;assert.equal(next.photo_policy,'custom');assert.deepEqual(next.progress,{});
}finally{await db.close();}});
test('ficha completa exige confirmação explícita, conserva decisões comerciais e permite capa e dados técnicos oficiais',async()=>{const db=await fixture();try{
 await db.exec(readFileSync('supabase/migrations/20261027020000_catalog_full_confirmation.sql','utf8'));
 await seed(db);await claim(db);await assert.rejects(db.query('select marketplace_catalog_apply_full_local($1,$2,$3,1,$4)',[company,actor,product,owner]),/Confirmação inválida/);
 await assert.rejects(confirmFull(db),/andamento/);await db.exec("update marketplace_catalog_completion set state='completed',lease_owner=null,lease_until=null");
 await assert.rejects(confirmFull(db,0),/mudou/);await assert.rejects(confirmFull(db,1,other),/Sem permissão/);await confirmFull(db);assert.equal(await claim(db),null);assert.equal((await claimFull(db)).product_id,product);
 await db.query('select marketplace_catalog_apply_full_local($1,$2,$3,1,$4)',[company,actor,product,owner]);const row=(await db.query('select * from marketplace_products')).rows[0];
 assert.equal(row.name,'Nome oficial');assert.equal(row.description,'Descrição oficial');assert.equal(row.pictures[0],source.pictures[0].url);assert.ok(row.pictures.includes('https://manual.com/capa.jpg'));assert.equal(row.attributes.find(a=>a.id==='POWER').value,'900 W');assert.ok(!row.attributes.some(a=>a.id==='WARRANTY_TIME'||a.id==='SELLER_SKU'));
 assert.equal(row.price_cents,9999);assert.equal(row.stock_quantity,3);assert.equal(row.sku,'SKU');assert.equal(row.ean,source.ean);assert.equal(row.catalog_product_id,'');assert.equal(row.publication_form.shippingMode,'me2');assert.equal(row.publication_form.attributes.COLOR,'Minha cor');assert.equal(row.publication_form.pictureUrl,source.pictures[0].url);
 assert.equal((await db.query('select result from marketplace_product_operations')).rows[0].result.before.name,'Nome manual');assert.deepEqual((await db.query('select * from saldo')).rows,[{id:1,quantidade:3}]);
 assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_catalog_confirm_full(uuid,uuid,uuid,bigint,jsonb)','execute') allowed")).rows[0].allowed,false);
}finally{await db.close();}});
test('edição posterior à confirmação e envio incerto bloqueiam atualização completa',async()=>{const db=await fixture();try{
 await db.exec(readFileSync('supabase/migrations/20261027020000_catalog_full_confirmation.sql','utf8'));await confirmFull(db);await claimFull(db);await db.exec('update marketplace_products set revision=2');
 await assert.rejects(db.query('select marketplace_catalog_apply_full_local($1,$2,$3,1,$4)',[company,actor,product,owner]),/cadastro mudou/);assert.equal((await db.query('select name from marketplace_products')).rows[0].name,'Nome manual');
 await db.exec("update marketplace_catalog_completion set state='review_required'");await assert.rejects(confirmFull(db,2),/envio incerto/);
}finally{await db.close();}});
test('SQL real preserva todos os campos preenchidos, capa, estoque, preço e atributos do formulário',async()=>{const db=await fixture();try{
 await seed(db);const job=await claim(db);assert.equal(job.product_id,product);assert.equal(await claim(db,other),null);
 assert.equal((await fill(db)).rows[0].changed,true);const row=(await db.query('select * from marketplace_products')).rows[0];
 assert.equal(row.name,'Nome manual');assert.equal(row.description,'Descrição manual');assert.equal(row.price_cents,9999);assert.equal(row.stock_quantity,3);assert.equal(row.sku,'SKU');assert.equal(row.ean,'7896347195829');assert.equal(row.catalog_product_id,'');
 assert.deepEqual(row.pictures,['https://manual.com/capa.jpg','https://http2.mlstatic.com/nova.jpg']);assert.equal(row.attributes.find(a=>a.id==='POWER').value,'500 W');assert.equal(row.attributes.find(a=>a.id==='TEXT').value,'Oficial');assert.ok(!row.attributes.some(a=>a.id==='COLOR'));assert.equal(row.publication_form.attributes.COLOR,'Minha cor');assert.equal(row.publication_form.shippingMode,'me2');assert.deepEqual((await db.query('select * from saldo')).rows,[{id:1,quantidade:3}]);
 await assert.rejects(fill(db),/cadastro mudou/);await assert.rejects(fill(db,2,other),/tentativa foi substituída/);
 assert.equal((await db.query('select count(*)::int n from marketplace_product_operations')).rows[0].n,1);
}finally{await db.close();}});
test('SQL real respeita RLS/ACL, empresa, papel, revisão e lease; envio interrompido nunca é retomado automaticamente',async()=>{const db=await fixture();try{
 assert.equal((await db.query("select relrowsecurity from pg_class where relname='marketplace_catalog_completion'")).rows[0].relrowsecurity,true);
 assert.equal((await db.query("select has_table_privilege('authenticated','marketplace_catalog_completion','select') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_function_privilege('authenticated','marketplace_catalog_completion_claim(uuid,uuid)','execute') allowed")).rows[0].allowed,false);
 await assert.rejects(db.query('select marketplace_catalog_completion_seed($1,$2)',[other,actor]),/Sem permissão/);await seed(db);await db.exec("update usuarios_empresa set perfil='operador_simples'");assert.equal(await claim(db),null);await db.exec("update usuarios_empresa set perfil='administrador'");await claim(db);
 await db.exec("update marketplace_catalog_completion set state='sending',lease_until=now()-interval '1 minute'");assert.equal(await claim(db,other),null);assert.equal((await db.query('select state from marketplace_catalog_completion')).rows[0].state,'review_required');await seed(db);assert.equal(await claim(db),null);
 await db.exec("update marketplace_catalog_completion set state='processing',lease_until=now()-interval '1 minute'");assert.equal((await claim(db,other)).lease_owner,other);
 await db.exec("update marketplace_catalog_completion set state='completed',lease_owner=null,lease_until=null,next_check_at=now()+interval '1 day'");await seed(db);assert.equal(await claim(db),null);
}finally{await db.close();}});
test('descrição local vazia reaproveita primeiro o texto já preenchido no formulário; foto inválida reverte toda a transação',async()=>{const db=await fixture();try{
 await db.exec(`update marketplace_products set description='',publication_form=publication_form||'{"description":"Meu texto preparado"}'`);await seed(db);await claim(db);
 await assert.rejects(fill(db,1,owner,{description:'Catálogo',pictures:['http://inseguro.com/foto'],attributes:[]}),/Foto de catálogo inválida/);
 assert.equal((await db.query('select revision from marketplace_products')).rows[0].revision,1);
 await fill(db);assert.equal((await db.query('select description from marketplace_products')).rows[0].description,'Meu texto preparado');
}finally{await db.close();}});

test('novos cadastros só entram após ativação da empresa; guarda estado anterior e não troca rótulos manuais',async()=>{const db=await fixture();try{
 await seed(db);await claim(db);await db.exec(`update marketplace_products set attributes='[{"id":"TEXT","name":"Meu rótulo","value":""}]'`);await fill(db);
 const saved=(await db.query('select result from marketplace_product_operations')).rows[0].result;assert.equal(saved.before.description,'Descrição manual');assert.equal(saved.before.stock_quantity,3);assert.equal(saved.before.revision,1);
 assert.equal((await db.query('select attributes from marketplace_products')).rows[0].attributes[0].name,'Meu rótulo');
 await db.exec(`insert into marketplace_products(empresa_id,id,name,ean,description,pictures,attributes,publication_form,revision) values('${company}','${other}','Novo','7896006214007','','[]','[]','{}',1)`);
 assert.equal((await db.query('select count(*)::int n from marketplace_catalog_completion')).rows[0].n,2);
 await db.exec(`update usuarios_empresa set status='inativo';insert into marketplace_products(empresa_id,id,name,ean,description,pictures,attributes,publication_form,revision) values('${company}','10000000-0000-4000-8000-000000000009','Outro','7896006214007','','[]','[]','{}',1)`);
 assert.equal((await db.query('select count(*)::int n from marketplace_catalog_completion')).rows[0].n,2);
}finally{await db.close();}});
