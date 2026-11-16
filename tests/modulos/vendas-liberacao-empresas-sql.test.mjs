import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const politicas=JSON.parse(readFileSync('tests/fixtures/vendas-runtime-politicas-piloto.json','utf8'));
const migration=readFileSync('supabase/migrations/20261116120000_vendas_liberacao_empresas.sql','utf8');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const qi=s=>'"'+s.replaceAll('"','""')+'"';
test('SQL real libera empresas instaladas, recusa inativas/expiradas/pessoal e mantém comandos e privilégio mínimo',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role avanta_vendas_runtime noinherit nosuperuser nobypassrls; create schema fiscal_private;create schema auth;create function auth.uid() returns uuid language sql as $$select null::uuid$$;create function public.usuario_area_rpc_restricao(text,jsonb) returns boolean language sql as $$select true$$;`);
 const tabelas=new Map();for(const p of politicas)tabelas.set(`${p.schemaname}.${p.tablename}`,p);
 for(const [t,p] of tabelas){
  let cols=p.qual.includes('company_id')?'company_id uuid':'empresa_id uuid';
  if(p.tablename==='empresas')cols='tipo_perfil text';
  if(p.tablename==='empresa_modulos')cols='empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz';
  if(p.tablename==='vendas_mobile_catalogo_produtos')cols='catalogo_id uuid';
  if(p.tablename==='custos_tabela_preco_itens')cols='tabela_preco_id uuid';
  if(p.tablename==='vendas_operacoes')cols='empresa_id uuid,numero bigint,ano integer,tipo text,situacao text,criado_em timestamptz,atualizado_em timestamptz';
  if(p.tablename==='vendas_sequencias')cols='empresa_id uuid,tipo text,ano integer,proximo_numero bigint,atualizado_em timestamptz,constraint vendas_sequencias_pkey unique(empresa_id,tipo,ano)';
  await db.exec(`create table ${t}(id uuid ${p.tablename==='vendas_sequencias'?'':'primary key'} default gen_random_uuid(),${cols});alter table ${t} enable row level security;grant ${p.cmd==='SELECT'?'select':'select,insert,update'} on ${t} to avanta_vendas_runtime;`);
 }
 await db.exec('grant usage on schema public,fiscal_private to avanta_vendas_runtime');
 for(const p of politicas)await db.exec(`create policy ${qi(p.policyname)} on ${qi(p.schemaname)}.${qi(p.tablename)} for ${p.cmd} to avanta_vendas_runtime ${p.qual?'using ('+p.qual+')':''} ${p.with_check?'with check ('+p.with_check+')':''}`);
 const original=readFileSync('supabase/migrations/20260905166000_vendas_runtime_fechamento.sql','utf8');await db.exec(original.slice(original.indexOf('create or replace function'),original.indexOf('revoke all on function public.vendas_reservar')));
 for(let n=1;n<=5;n++)await db.query('insert into empresas(id,tipo_perfil) values($1,$2)',[id(n),n===5?'pessoal':'empresa']);
 for(const [n,ativo,expira] of [[1,true,null],[2,true,null],[3,false,null],[4,true,'2020-01-01'],[5,true,null]])await db.query("insert into empresa_modulos(empresa_id,modulo_id,ativo,expira_em) values($1,'vendas',$2,$3)",[id(n),ativo,expira]);
 await db.query("insert into vendas_operacoes(id,empresa_id,tipo,situacao,criado_em) values($1,$2,'pedido','rascunho',now()),($3,$4,'pedido','rascunho',now())",[id(11),id(1),id(22),id(2)]);
 await db.exec(migration);await db.exec(migration);
 assert.equal((await db.query("select count(*)::int n from pg_policies where 'avanta_vendas_runtime'=any(roles)")).rows[0].n,politicas.length);
 await db.exec('set role avanta_vendas_runtime');
 assert.deepEqual((await db.query('select id from empresas order by id')).rows.map(x=>x.id),[id(1),id(2)]);
 await assert.rejects(db.query('insert into vendas_clientes(id,empresa_id) values($1,$2)',[id(33),id(3)]),/row-level security/);
 assert.equal((await db.query('select * from vendas_reservar_numero_operacao($1,$2)',[id(2),id(22)])).rows[0].operacao_numero,1);
 assert.equal((await db.query('select * from vendas_reservar_numero_operacao($1,$2)',[id(2),id(22)])).rows[0].operacao_numero,1);
 assert.equal((await db.query('update vendas_operacoes set numero=99 where empresa_id=$1 and id=$2 returning id',[id(1),id(22)])).rows.length,0);
 await db.exec('reset role');
 assert.equal((await db.query("select has_function_privilege('anon','public.vendas_runtime_empresa_liberada(uuid)','execute') acesso")).rows[0].acesso,false);
 assert.equal((await db.query("select rolbypassrls or rolsuper as elevado from pg_roles where rolname='avanta_vendas_runtime'")).rows[0].elevado,false);
 }finally{await db.close();}
});
