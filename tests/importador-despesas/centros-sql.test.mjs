import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
test('centro explícito, recibo, repetição, isolamento e rascunhos por centro no SQL real',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('app.actor',true),'')::uuid$$;
 create table empresas(id uuid primary key);create table centros_custo(id uuid primary key,empresa_id uuid,nome text,ativo boolean);create table configuracoes(empresa_id uuid,centros_custo_ativo boolean);
 create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table despesas_cadastradas(empresa_id uuid,nome text);
 create table lancamentos(id uuid default gen_random_uuid(),empresa_id uuid,centro_custo_id uuid,ano integer,mes text,dia integer,despesa_nome text,descricao text,valor numeric,status text,tipo_obs text);
 grant usage on schema auth to authenticated;grant select on usuarios_empresa,centros_custo to authenticated;`);
 await db.exec(readFileSync('supabase/migrations/20260721223000_importador_despesas_lancamentos.sql','utf8'));
 await db.exec('alter default privileges grant execute on functions to anon;');
 await db.exec(readFileSync('tests/fixtures/sql-historico/20261030143000_importador_despesas_centros.sql','utf8'));
 assert.equal((await db.query("select has_function_privilege('anon','public.importar_lancamentos_despesas_contexto_rpc(uuid,uuid,text,jsonb)','EXECUTE') as allowed")).rows[0].allowed,false);
 const actor=crypto.randomUUID(),otherActor=crypto.randomUUID(),company=crypto.randomUUID(),other=crypto.randomUUID(),lika=crypto.randomUUID(),luciana=crypto.randomUUID(),paused=crypto.randomUUID(),outside=crypto.randomUUID();
 await db.query('insert into auth.users values($1),($2)',[actor,otherActor]);await db.query('insert into empresas values($1),($2)',[company,other]);await db.query("insert into usuarios_empresa values($1,$2,'ativo','operador_completo')",[actor,company]);await db.query("select set_config('app.actor',$1,false)",[actor]);
 await db.query("insert into centros_custo values($1,$5,'Lika',true),($2,$5,'Luciana',true),($3,$5,'Pausado',false),($4,$6,'Outro perfil',true)",[lika,luciana,paused,outside,company,other]);await db.query('insert into configuracoes values($1,true)',[company]);await db.query("insert into despesas_cadastradas values($1,'Alimentação')",[company]);
 const item={data:'2026-09-10',tipo_despesa:'Alimentação',descricao:'Teste controlado',valor:10,item_chave:'linha-lika'};
 const run=async(center,items=[item],profile=company)=>(await db.query('select importar_lancamentos_despesas_contexto_rpc($1,$2,$3,$4) r',[profile,center,'lote',JSON.stringify(items)])).rows[0].r;
 assert.equal((await run(lika)).inseridos,1);assert.equal((await run(lika)).ignorados,1);assert.equal((await run(luciana,[{...item,data:'2026-10-10',item_chave:'linha-luciana'}])).inseridos,1);
 assert.deepEqual((await db.query('select centro_custo_id,mes from lancamentos order by mes')).rows,[{centro_custo_id:luciana,mes:'OUTUBRO'},{centro_custo_id:lika,mes:'SETEMBRO'}]);
 await assert.rejects(run(null),/Selecione o centro/);await assert.rejects(run(outside),/inválido/);await assert.rejects(run(paused),/pausado/);await assert.rejects(run(lika,[{...item,item_chave:'invalida',tipo_despesa:'Outra'}]),/não pertence/);await assert.rejects(run(outside,[item],other),/permissão/);assert.equal((await db.query('select count(*)::int n from lancamentos')).rows[0].n,2);
 await db.exec('set role authenticated');
 const save=(center,user=actor,profile=company)=>db.query("insert into importador_despesas_rascunhos_centros(empresa_id,usuario_id,centro_custo_id,ano,mes,dados) values($1,$2,$3,2026,'OUTUBRO',$4)",[profile,user,center,JSON.stringify({itens:[{teste:true}]})]);
 await save(lika);await save(luciana);assert.equal((await db.query('select count(*)::int n from importador_despesas_rascunhos_centros')).rows[0].n,2);
 await assert.rejects(save(outside),/row-level security/);await assert.rejects(save(paused),/row-level security/);await assert.rejects(save(lika,otherActor),/row-level security/);
 await db.query("delete from importador_despesas_rascunhos_centros where centro_custo_id=$1",[lika]);assert.equal((await db.query('select centro_custo_id from importador_despesas_rascunhos_centros')).rows[0].centro_custo_id,luciana);
 await db.exec('reset role');await db.query('update configuracoes set centros_custo_ativo=false where empresa_id=$1',[company]);assert.equal((await run(null,[{...item,item_chave:'sem-centros'}])).inseridos,1);
 }finally{await db.close();}
});
