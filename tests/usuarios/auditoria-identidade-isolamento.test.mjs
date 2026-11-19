import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';

function load(file,deps={}) {
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://mock.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'}},Request,Response,URL,console:{error(){}},require:id=>{if(!(id in deps))throw Error('Mock ausente: '+id);return deps[id];}});
 return exports;
}
class NextResponse extends Response {static json(v,o){return new NextResponse(JSON.stringify(v),o);}}
const registry=load('app/lib/modulos-registro.ts',{'./planos-comerciais':{VALOR_MODULO_AVULSO_MENSAL:0}});
const access=load('app/lib/acessos-usuario.ts',{'./modulos-registro':registry});
const releases=load('app/lib/usuarios-empresa-liberacoes.ts',{'./acessos-usuario':access});
const email=load('app/lib/email.ts');
const names=load('app/lib/nome-pessoa.ts');
function environment({role='gestor_master',billing=false,quotaError=false,quotaAllowed=true,authFailure=false,writeFailure=false}={}) {
 const identity={id:'actor',email:'actor@example.invalid'};
 const rows={usuarios_empresa:[{id:'actor-link',empresa_id:'A',user_id:'actor',nome:'Ator Fictício',email:identity.email,login:'actor',perfil:role,status:'ativo',dashboard_liberada:true,modulos_liberados:null},
 {id:'victim-link',empresa_id:'A',user_id:'victim',nome:'Pessoa Fictícia',email:'victim@example.invalid',login:'victim',perfil:'operador_completo',status:'ativo'},
 {id:'victim-B',empresa_id:'B',user_id:'victim',nome:'Pessoa Fictícia',email:'victim@example.invalid',perfil:'gestor_master',status:'ativo'}],usuarios_contas:[{user_id:'actor',email:identity.email,login:'actor'},{user_id:'victim',nome:'Pessoa Fictícia',email:'victim@example.invalid',login:'victim'}]};
 const calls=[];
 const db={auth:{getUser:async()=>({data:{user:{...identity}},error:null}),admin:{updateUserById:async(id,patch)=>{calls.push({kind:'auth',id,patch});if(authFailure)return{error:{message:'falha'}};if(id===identity.id&&patch.email)identity.email=patch.email;return{data:{user:{...identity}},error:null};},createUser:async()=>{calls.push({kind:'create-auth'});return{data:{user:{id:'new-user'}},error:null};}}},
 rpc:async(name,args)=>{calls.push({kind:'rpc',name,args});return{data:true,error:null};},from(table){
  const filters=[];let patch,insert;
  const run=()=>{
   if(patch||insert)calls.push({kind:'write',table,patch,insert});
   if(writeFailure&&table==='usuarios_empresa'&&(patch||insert))return{data:null,error:{message:'falha'}};
   let list=(rows[table]||[]).filter(r=>filters.every(f=>f(r)));
   if(insert){const r={id:'new-link',...insert};(rows[table]??=[]).push(r);list=[r];}
   if(patch)list.forEach(r=>Object.assign(r,patch));
   return{data:list.map(r=>({...r})),error:null,count:list.length};
  };
  const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},neq(k,v){filters.push(r=>r[k]!==v);return q;},in(k,vs){filters.push(r=>vs.includes(r[k]));return q;},ilike(k,v){filters.push(r=>String(r[k]).toLowerCase()===v.toLowerCase());return q;},limit(){return q;},update(p){patch=p;return q;},insert(p){insert=p;return q;},upsert(p){insert=p;return q;},maybeSingle:async()=>{const r=run();return{...r,data:r.data?.[0]||null};},single:async()=>{const r=run();return{...r,data:r.data?.[0]||null};},then(ok,bad){return Promise.resolve(run()).then(ok,bad);}};return q;
 }};
 const deps={'node:crypto':crypto,'next/server':{NextResponse},'@supabase/supabase-js':{createClient:()=>db},'@/app/lib/acessos-usuario':access,'@/app/lib/usuarios-empresa-liberacoes':releases,
 '../../lib/nome-pessoa':names,'../../lib/email':email,'../../lib/usuario-disponibilidade-servidor':{buscarContaAuthPorEmail:async()=>null},
 '../../lib/cobranca':{COBRANCA_ATIVA:billing,podeUsar:()=>true},'../../lib/cobranca-servidor':{resolverEstadoAcessoParaUsuario:async()=>{if(quotaError)throw Error('assinatura indisponível');return{};}},'../../lib/limites-comerciais-servidor':{validarLimiteDeUsuarios:async()=>quotaAllowed?{permitido:true}:{permitido:false,mensagem:'Limite atingido'}}};
 const invoke=(file,body)=>load('app/api/'+file+'/route.ts',deps).POST(new Request('https://mock.invalid/api/'+file,{method:'POST',headers:{authorization:'Bearer ficticio','content-type':'application/json'},body:JSON.stringify(body)}));
 deps['@/app/lib/navegacao-acessos-servidor']={notificarAcessosModulos:async()=>{}};
 const update=(body={})=>invoke('atualizar-usuario-empresa',{acessoId:'victim-link',email:'victim@example.invalid',login:'victim',perfil:'operador_completo',...body});
 return{identity,rows,calls,invoke,update,recover:()=>{writeFailure=false;authFailure=false;}};
}
test('gestor e administrador não trocam e-mail, login ou senha globais de outro usuário',async()=>{
 for(const role of ['gestor_master','administrador'])for(const change of [{email:'outro@example.invalid'},{login:'tomada'},{novaSenha:'SenhaFicticia123'}]){
  const e=environment({role});assert.equal((await e.update(change)).status,403);
  assert.equal(e.calls.length,0);assert.equal(e.rows.usuarios_empresa.find(r=>r.id==='victim-B').email,'victim@example.invalid');
 }
});
test('nome local e permissões continuam editáveis sem escrita de identidade global',async()=>{
 const e=environment({role:'administrador'});const r=await e.update({nome:'Nome no Perfil',liberacoes:{dashboard:false,modulos:['custos']}});
 assert.equal(r.status,200);assert.equal(e.rows.usuarios_empresa[1].nome,'Nome no Perfil');assert.equal(e.rows.usuarios_empresa[1].dashboard_liberada,false);
 assert.equal(e.calls.some(c=>c.kind==='auth'||c.kind==='rpc'||c.table==='usuarios_contas'),false);
 assert.equal(e.rows.usuarios_empresa[2].nome,'Pessoa Fictícia');
});
test('equipe sem e-mail pessoal salva acessos sem trocar identidade, inclusive no outro perfil',async()=>{
 const e=environment();
 for(const row of e.rows.usuarios_empresa.filter(r=>r.user_id==='victim')) row.email='usuario-teste@usuarios.avantalab.local';
 e.rows.usuarios_contas[1].email='usuario-teste@usuarios.avantalab.local';
 const r=await e.update({email:'',nome:'Nome no Perfil',liberacoes:{dashboard:false,modulos:['custos']}});
 assert.equal(r.status,200);
 assert.equal(e.rows.usuarios_empresa[1].dashboard_liberada,false);
 assert.equal(e.rows.usuarios_empresa[2].email,'usuario-teste@usuarios.avantalab.local');
 assert.equal(e.calls.some(c=>c.kind==='auth'||c.kind==='rpc'||c.table==='usuarios_contas'),false);
});
test('omitir e-mail permite editar acessos sem apagar e-mail pessoal existente',async()=>{
 const e=environment();const r=await e.update({email:undefined,nome:'Nome no Perfil'});
 assert.equal(r.status,200);assert.equal(e.rows.usuarios_empresa[1].email,'victim@example.invalid');
 assert.equal(e.calls.some(c=>c.kind==='auth'),false);
});
test('titular não remove e-mail, inclusive ao editar por outro perfil',async()=>{
 const e=environment();
 assert.equal((await e.update({acessoId:'actor-link',email:'',login:'actor',perfil:'gestor_master'})).status,400);
 e.rows.usuarios_empresa.push({id:'owner-B',empresa_id:'B',user_id:'actor',perfil:'gestor_master',status:'ativo'});
 e.rows.usuarios_empresa[0].perfil='operador_completo';
 assert.equal((await e.update({acessoId:'actor-link',email:'',login:'actor'})).status,400);
 assert.equal(e.calls.length,0);
});
test('usuário sem e-mail pessoal edita a própria conta sem recriar identidade técnica',async()=>{
 const e=environment({role:'operador_completo'});
 e.identity.email='usuario-teste@usuarios.avantalab.local';
 e.rows.usuarios_empresa[0].email=e.identity.email;e.rows.usuarios_contas[0].email=e.identity.email;
 const r=await e.update({acessoId:'actor-link',email:'',login:'actor',nome:'Ator Atualizado'});
 assert.equal(r.status,200);assert.equal(e.identity.email,'usuario-teste@usuarios.avantalab.local');
 assert.equal(e.calls.some(c=>c.kind==='auth'),false);
});
test('equipe pode remover seu contato; Auth e diretório mantêm identificador para login',async()=>{
 const e=environment({role:'operador_completo'});
 const r=await e.update({acessoId:'actor-link',email:'',login:'actor'});
 assert.equal(r.status,200);assert.match(e.identity.email,/^usuario-[a-f0-9-]+@usuarios\.avantalab\.local$/);
 assert.equal(e.rows.usuarios_empresa[0].email,e.identity.email);
 assert.equal(e.rows.usuarios_contas[0].email,e.identity.email);
});
test('novo usuário sem e-mail tem identificador único, login e senha sem relaxar perfil',async()=>{
 const e=environment();
 const body={empresaId:'A',nome:'Pessoa Nova',email:'',login:'novo',senha:'SenhaFicticia123',perfil:'operador_simples'};
 assert.equal((await e.invoke('criar-usuario-interno',body)).status,200);
 const account=e.rows.usuarios_contas.find(r=>r.user_id==='new-user');
 assert.match(account.email,/^usuario-[a-f0-9-]+@usuarios\.avantalab\.local$/);
 assert.equal(account.login,'novo');
 const second=environment();assert.equal((await second.invoke('criar-usuario-interno',body)).status,200);
 assert.notEqual(second.rows.usuarios_contas.find(r=>r.user_id==='new-user').email,account.email);
 for(const patch of [{email:'invalido'},{email:'x@usuarios.avantalab.local'},{login:''},{senha:''},{perfil:'gestor_master'}]){
  const env=environment();assert.equal((await env.invoke('criar-usuario-interno',{...body,...patch})).status,400);
  assert.equal(env.calls.length,0);
 }
});
test('opcional não significa ignorar duplicidade ou permitir endereço técnico escolhido',async()=>{
 const body={empresaId:'A',nome:'Pessoa Nova',login:'novo',senha:'SenhaFicticia123',perfil:'operador_simples'};
 for(const patch of [{email:'victim@example.invalid'},{login:'victim',email:''}]){
  const e=environment();assert.equal((await e.invoke('criar-usuario-interno',{...body,...patch})).status,400);
  assert.equal(e.calls.length,0);
 }
 const e=environment({role:'operador_completo'});
 assert.equal((await e.update({acessoId:'actor-link',login:'actor',email:'escolhido@usuarios.avantalab.local'})).status,400);
 assert.equal(e.calls.length,0);
});
test('vínculo sem login próprio aceita o login global inalterado sem permitir sua mudança',async()=>{
 const e=environment();e.rows.usuarios_empresa[1].login=null;
 assert.equal((await e.update({nome:'Nome no Perfil'})).status,200);
 assert.equal((await e.update({login:'outro'})).status,403);
 assert.equal(e.calls.some(c=>c.kind==='rpc'),false);
});
test('atalho de redefinir senha também rejeita terceiros e mantém o titular',async()=>{
 for(const role of ['gestor_master','administrador','operador_completo']){
  const e=environment({role});assert.equal((await e.invoke('redefinir-senha-usuario',{acessoId:'victim-link',novaSenha:'SenhaFicticia123'})).status,403);
  assert.equal(e.calls.length,0);
  assert.equal((await e.invoke('redefinir-senha-usuario',{acessoId:'actor-link',novaSenha:'SenhaFicticia123'})).status,200);
  assert.equal(e.calls.filter(c=>c.kind==='auth').length,1);
 }
});
test('somente Master concede Master; operador não pode criar vínculo',async()=>{
 for(const role of ['gestor_master','administrador','operador_completo','operador_simples']){
  const e=environment({role});const r=await e.invoke('vincular-usuario-existente',{acao:'vincular',empresaId:'A',userId:'outra-pessoa',perfil:'gestor_master'});
  assert.equal(r.status,role==='gestor_master'?400:403);
  // O Master passou a autorização e encontrou usuário inexistente, sem criar nada.
  assert.equal(e.calls.length,0);
 }
 const e=environment();e.rows.usuarios_empresa=e.rows.usuarios_empresa.filter(r=>r.id!=='victim-link');
 assert.equal((await e.invoke('vincular-usuario-existente',{acao:'vincular',empresaId:'A',userId:'victim',perfil:'gestor_master'})).status,200);
});
test('falha de e-mail no Auth não altera vínculo e repetição não confirma sucesso fictício',async()=>{
 const e=environment({authFailure:true});
 for(let i=0;i<2;i++)assert.equal((await e.update({acessoId:'actor-link',email:'novo@example.invalid',login:undefined,perfil:'gestor_master'})).status,503);
 assert.equal(e.calls.filter(c=>c.kind==='auth').length,2);assert.equal(e.calls.some(c=>c.kind==='write'),false);
 assert.equal(e.rows.usuarios_empresa[0].email,'actor@example.invalid');
});
test('titular reconcilia tentativa com Auth atualizado e vínculo ainda antigo',async()=>{
 const e=environment();e.identity.email='novo@example.invalid';
 const r=await e.update({acessoId:'actor-link',email:'novo@example.invalid',login:undefined,perfil:'gestor_master'});
 assert.equal(r.status,200);assert.equal(e.rows.usuarios_empresa[0].email,'novo@example.invalid');assert.equal(e.calls.some(c=>c.kind==='auth'),false);
});
test('falha posterior do vínculo não é sucesso e a próxima tentativa reconcilia com Auth',async()=>{
 const e=environment({writeFailure:true});
 assert.equal((await e.update({acessoId:'actor-link',email:'novo@example.invalid',login:undefined,perfil:'gestor_master'})).status,500);
 assert.equal(e.identity.email,'novo@example.invalid');assert.equal(e.rows.usuarios_empresa[0].email,'actor@example.invalid');
 e.recover();
 assert.equal((await e.update({acessoId:'actor-link',email:'novo@example.invalid',login:undefined,perfil:'gestor_master'})).status,200);
 assert.equal(e.rows.usuarios_empresa[0].email,'novo@example.invalid');
 assert.equal(e.calls.filter(c=>c.kind==='auth').length,1);
});
test('plano indisponível bloqueia novas inclusões, sem mudar acessos existentes; busca continua disponível',async()=>{
 const e=environment({billing:true,quotaError:true});
 const before=JSON.stringify(e.rows);
 assert.equal((await e.invoke('vincular-usuario-existente',{acao:'vincular',empresaId:'A',userId:'victim',perfil:'operador_simples'})).status,503);
 assert.equal((await e.invoke('criar-usuario-interno',{empresaId:'A',nome:'Pessoa Nova',email:'novo@example.invalid',login:'novo',senha:'SenhaFicticia123',perfil:'operador_simples'})).status,503);
 assert.equal((await e.invoke('vincular-usuario-existente',{acao:'buscar',empresaId:'A',termo:'victim@example.invalid'})).status,200);
 assert.equal(e.calls.length,0);assert.equal(JSON.stringify(e.rows),before);
});
test('franquia excedida segue bloqueada; cobrança desligada mantém contrato de rollout',async()=>{
 const e=environment({billing:true,quotaAllowed:false});
 assert.equal((await e.invoke('vincular-usuario-existente',{acao:'vincular',empresaId:'A',userId:'outra-pessoa',perfil:'operador_simples'})).status,409);
 const off=environment({quotaError:true});off.rows.usuarios_empresa=off.rows.usuarios_empresa.filter(r=>r.id!=='victim-link');
 assert.equal((await off.invoke('vincular-usuario-existente',{acao:'vincular',empresaId:'A',userId:'victim',perfil:'operador_simples'})).status,200);
});

test('leitura estrita detecta erros retornados pelo SDK sem alterar a política dos acessos existentes',async()=>{
 for(const fail of ['empresas','assinaturas','usuarios_empresa','assinaturas_loja','assinaturas_perfis_adicionais']){
  const db={from(table){
   const result=()=>({error:table===fail?{message:'indisponível'}:null,data:table==='empresas'?{tipo_perfil:'pessoal',created_at:'2026-02-01',assinatura_origem_empresa_id:fail==='assinaturas_perfis_adicionais'?'origem':null}:table==='assinaturas_loja'?[]:null});
   const q={select(){return q;},eq(){return q;},in(){return q;},order(){return q;},limit(){return q;},maybeSingle:async()=>result(),then(ok,bad){return Promise.resolve(result()).then(ok,bad);}};return q;
  }};
  const helper=load('app/lib/cobranca-servidor.ts',{'@supabase/supabase-js':{createClient:()=>db},'./sessao-perfil':{},'./cobranca':{DATA_LANCAMENTO:'2026-01-01'},'./conta-revisao':{emailsContaRevisaoLojas:()=>[]},'./cobranca-fluxo':{normalizarStatusTemporal:s=>s},'./planos-comerciais':{},'./perfis-quota':{},'./consultas-por-ids-servidor':{}});
  await assert.rejects(()=>helper.resolverEstadoAcessoParaUsuario('A','actor',true),/conferir/,fail);
  if(['empresas','assinaturas'].includes(fail))await assert.doesNotReject(()=>helper.resolverEstadoAcesso('A'));
 }
});

test('Web e Mobile não oferecem credenciais editáveis de terceiros; titular mantém seus controles',()=>{
 const web=readFileSync('app/gestao/page.tsx','utf8');
 assert.match(web,/id="editar-usuario-email"[\s\S]*?readOnly=\{!editandoIdentidadePropria\}/);
 assert.match(web,/id="editar-usuario-login"[\s\S]*?readOnly=\{!editandoIdentidadePropria\}/);
 assert.match(web,/\{editandoIdentidadePropria && <div/);
 const mobile=readFileSync('public/mobile-app.js','utf8');
 const render=mobile.slice(mobile.indexOf('function editarUsuarioHtml('),mobile.indexOf('function trocarEmpresaHtml('));
 for(const own of [false,true]){
  const ctx={state:{empresa:{acessoId:'own',perfil:'gestor_master'},usuarioEditandoId:own?'own':'other'},escapeHtml:v=>String(v),opcoesPerfilHtml:()=>'',campoSenhaSimplesHtml:id=>`<input id="${id}">`};
  vm.createContext(ctx);vm.runInContext(render,ctx);const html=ctx.editarUsuarioHtml({perfil:'operador_completo'});
  assert.equal(html.includes('id="edit-usuario-email" readonly'),!own);
  assert.equal(html.includes('id="edit-usuario-login" readonly'),!own);
  assert.equal(html.includes('id="edit-usuario-senha"'),own);
 }
});

test('contagem ausente da franquia não é interpretada como zero usuários',async()=>{
 const plans=load('app/lib/planos-comerciais.ts');
 const helper=load('app/lib/limites-comerciais-servidor.ts',{'./cobranca':{COBRANCA_ATIVA:true,assinaturaVigente:()=>true},'./planos-comerciais':plans});
 const q={select(){return q;},eq(){return q;},neq(){return q;},then(ok){return Promise.resolve({count:null,error:null}).then(ok);}};
 await assert.rejects(()=>helper.validarLimiteDeUsuarios({from:()=>q},'A',{tipoPerfil:'empresa',plano:'business',status:'ativa'}),/franquia/);
});
