import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
function load(file, dependencies) { const exports={}; vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process,Request,Response,URL,require:id=>dependencies[id]}); return exports; }
const registro=load('app/lib/modulos-registro.ts',{'./planos-comerciais':{VALOR_MODULO_AVULSO_MENSAL:14.9}});
const domain=load('app/lib/acessos-usuario.ts',{'./modulos-registro':registro});
function api(members, unavailable=false, authError=null) {
  class NextResponse extends Response { static json(body, opts) { return new NextResponse(JSON.stringify(body),opts); } }
  const db={auth:{getUser:async()=>({data:{user:authError?null:{id:'usuario'}},error:authError})},from:()=>{
    let filters=[];
    const query={select(){return this},eq(k,v){filters.push([k,v]);return this},neq(){return this},limit(){return this},maybeSingle:async()=>({data:members.find(m=>filters.every(([k,v])=>m[k]===v))||null,error:unavailable?{}:null}),then(resolve){resolve({data:members,error:unavailable?{}:null})}};
    return query;
  }};
  return load('app/lib/acessos-usuario-servidor.ts',{'@supabase/supabase-js':{createClient:()=>db},'next/server':{NextResponse},'./acessos-usuario':domain});
}
const members=[{empresa_id:'restrita',user_id:'usuario',perfil:'administrador',status:'ativo',dashboard_liberada:false,modulos_liberados:['projetos']},{empresa_id:'completa',user_id:'usuario',perfil:'administrador',status:'ativo',dashboard_liberada:true,modulos_liberados:null}];
test('rotas administrativas usam autenticação própria sem interpretar senha como JWT',async()=>{
  const guard=api([],false,{status:401,name:'AuthApiError'});
  for(const path of ['/api/admin-feedbacks','/api/admin-perfis','/api/admin-configuracoes','/api/admin-cadastros','/api/admin-consumo','/api/admin-cupons','/api/admin-downloads','/api/admin-conteudos-vendas','/api/admin-disparos/programacoes','/api/admin-rep-p-certificado','/api/admin-rep-p-empresas']) {
    assert.equal(await guard.protegerApiPorLiberacao(new Request('https://teste'+path,{headers:{authorization:'Bearer senha-ficticia'}})),null,path);
  }
  for(const path of ['/api/admin-perfis-falso','/api/admin-desconhecido','/api/lancamentos']) assert.equal((await guard.protegerApiPorLiberacao(new Request('https://teste'+path,{headers:{authorization:'Bearer senha-ficticia'}}))).status,401,path);
});
test('erro de comunicação não é expiração nem autorização',async()=>{
  const response=await api([],false,{status:0,name:'AuthRetryableFetchError'}).protegerApiPorLiberacao(new Request('https://teste/api/acessos-usuario',{headers:{authorization:'Bearer teste'}}));
  assert.equal(response.status,503);
});
test('API bloqueia Dashboard e módulo negado, sem herdar o vínculo de outra empresa',async()=>{
  const guard=api(members);
  for(const path of ['/api/lancamentos?empresaId=restrita','/api/modulos/custos/documento?empresaId=restrita','/api/modulos/acesso?empresaId=restrita&moduloId=custos']) assert.equal((await guard.protegerApiPorLiberacao(new Request('https://teste'+path,{headers:{authorization:'Bearer teste'}}))).status,403);
  for(const path of ['/api/modulos/projetos/documento?empresaId=restrita','/api/lancamentos?empresaId=completa','/api/acessos-usuario']) assert.equal(await guard.protegerApiPorLiberacao(new Request('https://teste'+path,{headers:{authorization:'Bearer teste'}})),null);
});
test('falha de banco não vira autorização e alteração de outro usuário usa empresa do alvo',async()=>{
  await assert.rejects(api(members,true).protegerApiPorLiberacao(new Request('https://teste/api/lancamentos?empresaId=restrita',{headers:{authorization:'Bearer teste'}})));
  const alvo=[...members,{id:'alvo',empresa_id:'restrita'}];
  const response=await api(alvo).protegerApiPorLiberacao(new Request('https://teste/api/atualizar-usuario-empresa',{method:'POST',headers:{authorization:'Bearer teste','content-type':'application/json'},body:JSON.stringify({acessoId:'alvo'})}));
  assert.equal(response.status,403);
});
