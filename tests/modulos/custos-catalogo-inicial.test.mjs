import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('catálogo inicial é local, idempotente e privado; preserva fontes desativadas e excluídas',async()=>{
 const db=new PGlite(),company='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create function custos_pode_acessar_empresa(uuid,boolean) returns boolean language sql as $$select $1=nullif(current_setting('test.company',true),'')::uuid and current_setting('test.edit',true)='true'$$;
   create table empresas(id uuid primary key);insert into empresas values('${company}'),('${other}');
   create table vendas_mobile_catalogos(id uuid primary key default gen_random_uuid(),empresa_id uuid references empresas,nome text,codigo text,origem text,ativo boolean,publicado_avantavendas boolean,padrao boolean,criado_por uuid,criado_em timestamptz default now(),excluido_em timestamptz,unique(empresa_id,codigo));
   create unique index catalogo_padrao on vendas_mobile_catalogos(empresa_id) where padrao;
   set test.uid='${company}';set test.company='${company}';set test.edit='true';`);
  await db.exec(readFileSync('supabase/migrations/20261117020000_catalogo_local_inicial_custos.sql','utf8'));
  const ensure=async(id=company)=>(await db.query('select to_jsonb(custos_garantir_catalogo_inicial_rpc($1)) as result',[id])).rows[0].result;
  const first=await ensure();assert.equal(first.nome,'Catálogo local');assert.equal(first.origem,'custos_local');assert.equal(first.ativo,true);assert.equal(first.padrao,true);assert.equal(first.publicado_avantavendas,false);assert.equal((await ensure()).id,first.id);
  assert.equal((await db.query('select count(*)::int n from vendas_mobile_catalogos')).rows[0].n,1);
  await assert.rejects(ensure(other),/permissão/);
  await db.exec("set test.edit='false'");await assert.rejects(ensure(),/permissão/);
  await db.exec("set test.edit='true';set test.uid=''");await assert.rejects(ensure(),/permissão/);
  await db.exec(`set test.uid='${company}';update vendas_mobile_catalogos set ativo=false,padrao=false,nome='Fonte preservada',publicado_avantavendas=true`);
  const before=(await db.query('select * from vendas_mobile_catalogos')).rows;await ensure();assert.deepEqual((await db.query('select * from vendas_mobile_catalogos')).rows,before);
  await db.exec('update vendas_mobile_catalogos set excluido_em=now()');
  const excluded=(await db.query('select * from vendas_mobile_catalogos')).rows[0],second=await ensure();
  assert.notEqual(second.id,first.id);assert.notEqual(second.codigo,first.codigo);assert.equal(second.publicado_avantavendas,false);
  assert.deepEqual((await db.query('select * from vendas_mobile_catalogos where id=$1',[first.id])).rows[0],excluded);
  assert.equal((await ensure()).id,second.id);
  const privileges=(await db.query("select has_function_privilege('anon','custos_garantir_catalogo_inicial_rpc(uuid)','execute') as anon,has_function_privilege('authenticated','custos_garantir_catalogo_inicial_rpc(uuid)','execute') as authenticated")).rows[0];assert.equal(privileges.anon,false);assert.equal(privileges.authenticated,true);
 }finally{await db.close();}
});

test('carregamento seleciona catálogo retornado e não tenta criar quando já existe ou é somente leitura',async()=>{
 const ts=await import('typescript'),vm=await import('node:vm');
 const source=readFileSync('app/custos/repository.ts','utf8');
 for(const scenario of ['vazio','existente','leitura','falha']){
  const calls=[],company='company',catalog={id:'local-id',empresa_id:company,nome:'Catálogo local',origem:'custos_local',codigo:'CUSTOS_LOCAL',ativo:true,padrao:true,publicado_avantavendas:false};
  const supabase={rpc:async(name,args)=>{calls.push({name,args});return name==='custos_garantir_tabela_padrao_rpc'?{data:{},error:null}:scenario==='falha'?{data:null,error:{message:'Falha'}}:{data:catalog,error:null};},from:table=>{
   const response=table==='vendas_mobile_catalogos'?{data:scenario==='existente'?[{...catalog,ativo:false}]:[],error:null}:table==='custos_documentos'?{data:{documento:{},revisao:1},error:null}:table==='cadastros_perfil'?{data:{},error:null}:{data:[],error:null};
   const chain={then:resolve=>Promise.resolve(response).then(resolve)};for(const method of ['select','eq','in','order','maybeSingle'])chain[method]=()=>chain;return chain;
  }};
  const scope={exports:{},require:name=>name.includes('supabase')?{supabase}:name==='./types'?{normalizarDocumento:value=>value,documentoVazio:()=>({})}:{}};
  vm.runInNewContext(ts.default.transpileModule(source,{compilerOptions:{module:ts.default.ModuleKind.CommonJS,target:ts.default.ScriptTarget.ES2022}}).outputText,scope);
  if(scenario==='falha')await assert.rejects(scope.exports.carregarCustos(company,true),/iniciar o catálogo local/);
  else{const result=await scope.exports.carregarCustos(company,scenario!=='leitura');assert.equal(result.catalogoId,scenario==='leitura'?'':'local-id');if(scenario!=='leitura')assert.equal(result.catalogos[0].publicado_avantavendas,false);}
  assert.equal(calls.filter(call=>call.name==='custos_garantir_catalogo_inicial_rpc').length,['vazio','falha'].includes(scenario)?1:0);
 }
});
