import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const read=p=>readFileSync(p,'utf8');
const { createAccountReader, accountReadMessage } = await import('../../app/marketplaces/account-reader.ts');
test('indicador oficial compacto é acessível, centralizado e sem overlay ou altura de card',()=>{
 const button={};vm.runInNewContext(ts.transpileModule(read('app/components/BotaoAcaoCompacto.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:button,require:s=>s.endsWith('.module.css')?{default:new Proxy({},{get:(_,k)=>k})}:require(s)});
 const loading={};vm.runInNewContext(ts.transpileModule(read('app/components/LoadingPontos.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:loading,require});
 const exports={};vm.runInNewContext(ts.transpileModule(read('app/components/CarregamentoDadosModulo.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:s=>s==='./BotaoAcaoCompacto'?button:s==='./LoadingPontos'?loading:require(s)});
 const props={ativo:true,variante:'indicador',titulo:'Contas conectadas',mensagem:'Carregando contas…',corPrimaria:'#003e73'};
 const html=renderToStaticMarkup(React.createElement(exports.default,props));
 assert.match(html,/role="status"/);assert.match(html,/aria-live="polite"/);assert.match(html,/aria-busy="true"/);assert.match(html,/Contas conectadas. Carregando contas…/);
 assert.match(html,/avanta-loading-pontos/);assert.match(html,/color:#003e73/);assert.doesNotMatch(html,/fixed|min-h-32|backdrop/);
 const enlarged=renderToStaticMarkup(React.createElement(exports.default,{...props,compacto:false,mostrarMensagem:true,mensagem:'Conectando contas...'}));
 assert.doesNotMatch(enlarged,/avanta-loading-pontos--compacto/);
 assert.match(enlarged,/>Conectando contas\.\.\.<\/span>/);
 assert.equal(renderToStaticMarkup(React.createElement(exports.default,{...props,ativo:false})),'');
 const overlay=renderToStaticMarkup(React.createElement(exports.default,{...props,variante:'modulo',onCancelar(){}}));assert.match(overlay,/<button[^>]*type="button"/);assert.match(overlay,/Cancelar/);
});
test('consulta inicial, atualização, falha e leituras simultâneas encerram espera corretamente',async()=>{
 const code=read('app/marketplaces/MarketplacesClient.tsx'),source=ts.createSourceFile('client.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node;
 function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='refreshConnections')node=n;ts.forEachChild(n,walk);}walk(source);
 const fn=ts.transpileModule('('+node.initializer.arguments[0].getText(source)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
 let state={companyId:'company',pending:0,settled:false},resolvers=[],applied=0,errors=[];let fail=false;
 const env={companyId:'company',accountsScope:{current:'company'},setAccountsRead:f=>state=f(state),setAccountsError:value=>errors.push(value),accountReadMessage,loadAccounts(){applied++;},setMagaluCatalogRefresh(){},Math,readAccounts:createAccountReader(()=>fail?Promise.reject(Error('Falha')):new Promise(r=>resolvers.push(r)))};
 const load=new Function('env',`with(env){return ${fn};}`)(env);
 const a=load(),b=load();assert.equal(state.pending,2);await Promise.resolve();assert.equal(resolvers.length,1,'leituras concorrentes compartilham uma requisição');
 resolvers.shift()({accounts:[],canConnect:false});await Promise.all([a,b]);assert.equal(state.pending,0);assert.equal(state.settled,true);
 const appliedBeforeFailure=applied;
 fail=true;await assert.rejects(load(),/Falha/);assert.equal(state.pending,0);assert.equal(errors.at(-1).message,'Falha');assert.equal(applied,appliedBeforeFailure,'falha preserva contas já carregadas');
 fail=false;const old=load();await Promise.resolve();const before=applied;state={companyId:'other',pending:1,settled:false};env.accountsScope.current='other';resolvers.shift()({accounts:[],canConnect:false});await assert.rejects(old,/troca de perfil/);assert.equal(state.companyId,'other');assert.equal(state.pending,1);assert.equal(applied,before,'resposta antiga não altera contas do novo perfil');
 assert.match(code,/accountsRead.pending > 0/);assert.match(code,/aria-busy=\{accountsLoading\}/);
 assert.ok(code.indexOf('className={styles.connectedAccountsLoading}')<code.indexOf('id="connected-accounts-content" hidden='),'indicador permanece fora do conteúdo recolhido');
 const css=read('app/marketplaces/marketplaces.module.css');assert.match(css,/connectedAccountsLoading[^}]*left:50%;top:50%/);assert.match(css,/connectedAccountsLoading[^}]*pointer-events:none/);
 assert.match(code,/readAccounts=\{readAccounts\}/);
 assert.match(read('app/marketplaces/Anunciados.tsx'),/readAccounts \? await readAccounts\(\)/);
 assert.match(code,/accountsError.companyId === companyId && accountsError.message/);
});

test('timeout inclui sessão travada, libera nova consulta e ignora resultado tardio',async()=>{
 let firstResolve,calls=0;const signals=[];
 const expected={accounts:[{id:'current'}],canConnect:true,canManage:true};
 const load=createAccountReader(signal=>{signals.push(signal);calls++;return calls===1?new Promise(resolve=>firstResolve=resolve):Promise.resolve(expected);},15);
 const initial=load(),joined=load();assert.equal(initial,joined);
 await assert.rejects(initial,error=>error.code==='accounts_timeout'&&/Atualizar contas/.test(error.message)&&!/signal timed out/.test(error.message));
 assert.equal(signals[0].aborted,true);
 assert.equal(await load(),expected);assert.equal(calls,2);
 firstResolve({accounts:[{id:'stale'}],canConnect:false,canManage:false});await Promise.resolve();
 assert.equal(await load(),expected);assert.equal(calls,3,'sucesso não vira cache permanente de permissões');
});

test('leitores de perfis diferentes são isolados e falha não vira lista vazia',async()=>{
 let calls=0;const result={accounts:[],canConnect:false,canManage:false};
 const a=createAccountReader(async()=>{calls++;if(calls===1)throw Object.assign(new Error('Sua sessão expirou.'),{code:'unauthorized'});return result;});
 const b=createAccountReader(async()=>result);
 await assert.rejects(a(),/Sua sessão expirou/);assert.equal(await a(),result);assert.equal(await b(),result);
 assert.match(accountReadMessage({name:'TimeoutError',message:'signal timed out'}),/Atualizar contas/);
 assert.match(accountReadMessage(new Error('signal timed out')),/Atualizar contas/);
 assert.equal(accountReadMessage(new Error('Sem permissão.')),'Sem permissão.');
});

test('Anunciados usa o leitor do shell, conserva permissões retornadas e ignora consumidor desmontado',async()=>{
 const source=ts.createSourceFile('Anunciados.tsx',read('app/marketplaces/Anunciados.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let node;
 function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(source)==='loadAccounts')node=n;ts.forEachChild(n,walk);}walk(source);
 const fn=ts.transpileModule('('+node.initializer.arguments[0].getText(source)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
 let resolveRead,calls=0,accounts=null,canManage=null,reported=0;
 const reader=createAccountReader(()=>{calls++;return new Promise(resolve=>resolveRead=resolve);});
 const env={companyId:'company',readAccounts:reader,marketplaceClientRequest(){throw Error('Leitura duplicada');},setAccounts:value=>accounts=value,setCanManage:value=>canManage=value,onAccountsLoaded(){reported++;}};
 const load=new Function('env',`with(env){return ${fn};}`)(env),cancelled=new AbortController();
 const shell=reader(),listing=load(),unmounted=load(cancelled.signal);cancelled.abort();
 await Promise.resolve();assert.equal(calls,1);
 const response={accounts:[{id:'account'}],canManage:false,canConnect:false};resolveRead(response);
 await Promise.all([shell,listing,unmounted]);
 assert.equal(accounts,response.accounts);assert.equal(canManage,false);assert.equal(reported,1);
 const native=createAccountReader(async()=>{throw Object.assign(new Error('signal timed out'),{name:'TimeoutError'});});
 await assert.rejects(native(),error=>error.code==='accounts_timeout'&&!error.message.includes('signal timed out'));
});
