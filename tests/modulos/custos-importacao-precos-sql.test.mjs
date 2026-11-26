import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
const empresa='10000000-0000-4000-8000-000000000001',outra='10000000-0000-4000-8000-000000000002',cat='20000000-0000-4000-8000-000000000001',produto='30000000-0000-4000-8000-000000000001',padrao='40000000-0000-4000-8000-000000000001',dist='40000000-0000-4000-8000-000000000002',revenda='40000000-0000-4000-8000-000000000003';
const preco=(tabela_codigo,preco)=>({produto_id:produto,sku:'C1.0',tabela_codigo,preco});
test('PostgreSQL real: prévia exata, transação, histórico, concorrência e preservação cadastral',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as 'select null::uuid';
 create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select true';
 create function usuario_area_rpc_restricao(text,jsonb) returns boolean language sql as 'select true';
 create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid,excluido_em timestamptz);
 create table vendas_mobile_catalogo_produtos(id uuid primary key,catalogo_id uuid,sku text,nome text,descricao text,ncm text,estoque numeric,preco_venda numeric,excluido_em timestamptz,atualizado_em timestamptz);
 create table custos_tabelas_preco(id uuid primary key,empresa_id uuid,codigo text,nome text,padrao boolean,ativo boolean);
 create table custos_tabela_preco_itens(tabela_preco_id uuid,produto_id uuid,preco numeric,atualizado_em timestamptz default now(),unique(tabela_preco_id,produto_id));
 create table custos_tabela_preco_historico(empresa_id uuid,tabela_preco_id uuid,produto_id uuid,preco_anterior numeric,preco_novo numeric,origem text);
 create table custos_importacoes_produtos_precos(empresa_id uuid,arquivo_nome text,exportado_em timestamptz,produtos_criados int,produtos_atualizados int,precos_atualizados int);
 insert into vendas_mobile_catalogos values('${cat}','${empresa}',null);
 insert into vendas_mobile_catalogo_produtos values('${produto}','${cat}','C1.0','Nome atual','Descrição preservada','12345678',77,10,null,'2026-11-26');
 insert into custos_tabelas_preco values('${padrao}','${empresa}','PADRAO','Preço padrão',true,true),('${dist}','${empresa}','DIST','Distribuidor',false,true),('${revenda}','${empresa}','REVENDA','Revenda',false,true);`);
 await db.exec(readFileSync('supabase/migrations/20261126223000_custos_importar_somente_precos.sql','utf8'));
 const rpc=async(rows,token=null,e=empresa)=>(await db.query('select custos_importar_somente_precos_rpc($1,$2,$3,$4) r',[e,'arquivo-antigo.xlsx',JSON.stringify(rows),token])).rows[0].r;
 const snapshot=async()=>(await db.query('select * from vendas_mobile_catalogo_produtos')).rows[0];
 const before=await snapshot();let input=[preco('DIST',8),preco('REVENDA',8),preco('PADRAO',null)];let preview=await rpc(input);
 assert.equal(preview.alterados,2);assert.equal(preview.preservados,1);assert.equal(preview.produtos,1);assert.deepEqual(await snapshot(),before);
 assert.equal((await db.query('select count(*)::int n from custos_tabela_preco_historico')).rows[0].n,0);
 const applied=await rpc(input,preview.revisao);assert.deepEqual(applied.mudancas,preview.mudancas);assert.deepEqual(await snapshot(),before);
 assert.deepEqual((await db.query('select preco::float v from custos_tabela_preco_itens order by tabela_preco_id')).rows.map(r=>r.v),[8,8]);
 assert.equal((await rpc(input)).alterados,0);assert.equal((await db.query('select count(*)::int n from custos_tabela_preco_historico')).rows[0].n,2);
 // Zero is explicit, blank and unselected tables are untouched.
 input=[preco('DIST',0)];preview=await rpc(input);await rpc(input,preview.revisao);
 assert.equal(Number((await db.query(`select preco from custos_tabela_preco_itens where tabela_preco_id='${revenda}'`)).rows[0].preco),8);
 // Current server snapshot, not export date, protects confirmation.
 input=[preco('PADRAO',15)];preview=await rpc(input);await db.exec(`update vendas_mobile_catalogo_produtos set preco_venda=11,atualizado_em=now()`);
 await assert.rejects(rpc(input,preview.revisao),/mudaram após/);preview=await rpc(input);await rpc(input,preview.revisao);
 const after=await snapshot();for(const key of ['sku','nome','descricao','ncm','estoque','catalogo_id'])assert.deepEqual(after[key],before[key]);assert.equal(Number(after.preco_venda),15);
 await assert.rejects(rpc([preco('DIST',2),preco('NAO_EXISTE',3)],'fake'),/Tabela não/);
 assert.equal(Number((await db.query(`select preco from custos_tabela_preco_itens where tabela_preco_id='${dist}'`)).rows[0].preco),0);
 await assert.rejects(rpc([preco('DIST',-1)]),/inválido/);await assert.rejects(rpc([preco('DIST',2),preco('DIST',3)]),/repetido/);
 await assert.rejects(rpc([preco('DIST',2)],null,outra),/empresa/);
 await assert.rejects(rpc([{...preco('DIST',3),nome:'Sobrescrever'}]),/Estrutura/);
 // A failure writing history must roll back earlier price writes in the same call.
 const saved=await snapshot();
 await db.exec('alter table custos_tabela_preco_historico add constraint validar_historico check (preco_novo<>13)');
 input=[preco('PADRAO',13)];preview=await rpc(input);
 await assert.rejects(rpc(input,preview.revisao),/validar_historico/);assert.deepEqual(await snapshot(),saved);
 await db.exec('alter table custos_tabela_preco_historico drop constraint validar_historico');
 // An explicit destination that matches its old inherited value must remain correct
 // even if the standard price changes in this same import.
 await db.exec(`delete from custos_tabela_preco_itens where tabela_preco_id='${revenda}'`);
 input=[preco('PADRAO',20),preco('REVENDA',15)];preview=await rpc(input);assert.equal(preview.alterados,2);await rpc(input,preview.revisao);
 assert.equal(Number((await db.query(`select preco from custos_tabela_preco_itens where tabela_preco_id='${revenda}'`)).rows[0].preco),15);
 await db.exec(`create or replace function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as 'select false';`);
 await assert.rejects(rpc([preco('DIST',3)]),/permissão/);
 }finally{await db.close();}
});
