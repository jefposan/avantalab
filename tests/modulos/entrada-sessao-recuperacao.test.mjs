import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {validarSessaoEntrada,LIMITE_VALIDACAO_ENTRADA_MS} from '../../app/lib/validar-sessao-entrada.ts';
const session={user:{id:'usuario'},access_token:'token-ficticio'};
const nativeRequire=createRequire(import.meta.url);
const require=id=>id==='./LoadingPontos'?{default:()=>React.createElement('span',{'aria-hidden':true,className:'avanta-loading-pontos'})}:nativeRequire(id);
const fonte=readFileSync('app/gestao/page.tsx','utf8');
function cliente(extra={}) {return {getSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user:session.user},error:null}),signOut(){assert.fail('validação não pode encerrar sessão');},...extra};}

test('validação confirma identidade remota; ausência local de sessão mantém login normal',async()=>{
 assert.equal(LIMITE_VALIDACAO_ENTRADA_MS,15000);
 assert.equal((await validarSessaoEntrada(cliente())).session,session);
 assert.equal((await validarSessaoEntrada(cliente({getSession:async()=>({data:{session:null},error:null}),getUser(){assert.fail('sem sessão não consulta usuário');}}))).session,null);
});
for(const tipo of ['rede','rejeição','erro-local','sem-usuário','identidade-divergente'])test(`falha ${tipo} não concede acesso nem apaga sessão; nova tentativa pode confirmar`,async()=>{
 const auth=cliente({getUser:async()=>{
  if(tipo==='rede')throw new TypeError('Failed to fetch');
  return {data:{user:tipo==='identidade-divergente'?{id:'outro'}:null},error:tipo==='rejeição'?{status:401}:null};
 },...(tipo==='erro-local'?{getSession:async()=>({data:{session},error:{message:'falha'}})}:{})});
 await assert.rejects(validarSessaoEntrada(auth),/tente novamente.*sessão não foi apagada/);
 assert.equal(session.user.id,'usuario');
 auth.getUser=async()=>({data:{user:session.user},error:null});auth.getSession=async()=>({data:{session},error:null});
 assert.equal((await validarSessaoEntrada(auth)).session,session);
});
for(const etapa of ['getSession','getUser'])test(`limite encerra ${etapa} pendente e resposta antiga não prossegue`,async()=>{
 let resolver,calls=0;
 const auth=cliente({[etapa]:()=>new Promise(resolve=>{resolver=resolve;})});
 if(etapa==='getSession')auth.getUser=async()=>{calls++;return{data:{user:session.user},error:null};};
 await assert.rejects(validarSessaoEntrada(auth,15),/tente novamente/);
 resolver(etapa==='getSession'?{data:{session},error:null}:{data:{user:session.user},error:null});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0);
 assert.equal((await validarSessaoEntrada(cliente())).session,session);
});

test('efeito real da Gestão sai da preparação em falha, sem navegar ou apagar sessão',async()=>{
 const inicio=fonte.indexOf('  let entradaAtiva = true;\n  const carregarConfiguracoesIniciais');
 const fim=fonte.indexOf('\n}, []);',inicio);assert.ok(inicio>0&&fim>inicio);
 const trecho=fonte.slice(inicio,fim);
 assert.doesNotMatch(trecho,/voltarAoLoginAposSessaoInvalida/);
 const montar=async(falha)=>{
  const estado={loading:null,error:null,validacoes:0};let cleanup;
  vm.runInNewContext(ts.transpileModule(`function montar(){${trecho}}; cleanup=montar();`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
   URLSearchParams,window:{location:{search:'',hash:''}},supabase:{auth:cliente()},
   validarSessaoEntrada:async()=>{estado.validacoes++;throw falha;},
   MENSAGEM_FALHA_VALIDACAO_ENTRADA:'Falhou, tente novamente',setMounted(){},setCarregandoSistema:v=>estado.loading=v,setMensagemCarregamentoSistema(){},setErroPreparacaoAcesso:v=>estado.error=v,
   set cleanup(v){cleanup=v;},
  });
  await new Promise(resolve=>setImmediate(resolve));assert.equal(estado.loading,false);assert.equal(estado.error,'Falhou, tente novamente');assert.equal(estado.validacoes,1);cleanup();
 };
 await montar(new TypeError('Failed to fetch'));
 assert.match(fonte,/if \(erroPreparacaoAcesso\) return <TelaCarregandoAcesso/);
 assert.match(fonte,/onTentarNovamente=\{\(\) => window.location.reload\(\)\}/);
});

test('erro usa a cena oficial com botão operável, sem spinner nem aria-busy ativo',()=>{
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('app/components/TelaCarregandoAcesso.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require});
 const html=renderToStaticMarkup(React.createElement(exports.default,{mensagem:'',erro:'Verifique a conexão. Sua sessão não foi apagada.',onTentarNovamente(){}}));
 assert.match(html,/role="alert" aria-busy="false"/);assert.match(html,/Tentar novamente/);assert.match(html,/Não foi possível preparar o acesso/);
 assert.doesNotMatch(html,/avanta-loading-spinner|disabled=|Preparando acesso|Cancelar e voltar/);assert.match(html,/min-h-11/);assert.match(html,/autofocus/);
});

test('falha persistente oferece reentrada explícita na cena oficial sem limpar o navegador',()=>{
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('app/components/TelaCarregandoAcesso.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require});
 const props={mensagem:'',erro:'Conexão indisponível',onTentarNovamente(){},onEntrarNovamente(){}};
 const html=renderToStaticMarkup(React.createElement(exports.default,props));assert.match(html,/Tentar novamente/);assert.match(html,/Entrar novamente/);assert.doesNotMatch(html,/disabled=/);
 const normal=renderToStaticMarkup(React.createElement(exports.default,{...props,erro:undefined}));assert.doesNotMatch(normal,/Entrar novamente/);
 assert.match(fonte,/reiniciarAcessoLocal\(window\.localStorage, process\.env\.NEXT_PUBLIC_SUPABASE_URL!\)/);
});
