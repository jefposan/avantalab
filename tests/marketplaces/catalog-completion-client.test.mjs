import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import vm from 'node:vm';import ts from 'typescript';
function harness(request,{error='',enabled=true}={}){
 const file=readFileSync('app/marketplaces/CatalogCompletion.tsx','utf8'),ast=ts.createSourceFile('Catalog.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='CatalogCompletion'),exports={},effects=[],states=[],handlers=new Map();
 const window={addEventListener:(n,fn)=>handlers.set(n,fn),removeEventListener:n=>handlers.delete(n),dispatchEvent:e=>states.push(['event',e.type])};
 vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace('export default','export'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:createRequire(import.meta.url),useState:v=>[error||v,next=>states.push(['state',next])],useEffect:fn=>effects.push(fn),window,queueMicrotask,Error,AbortController,AbortSignal,Event,CustomEvent,URLSearchParams,MARKETPLACE_ACCOUNT_SYNCED:'synced',CATALOG_CONTENT_CHANGED:'catalog',CATALOG_COMPLETION_REQUESTED:'requested',notifyProductStockChanged:id=>states.push(['product',id]),styles:{catalogCompletion:'completion'}});
 const tree=exports.CatalogCompletion({companyId:'company',enabled,request});return {tree,start:effects[0],states,handlers};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('StrictMode/cleanup não inicia fila; desmontar não aplica respostas antigas nem bloqueia a tela',async()=>{
 const calls=[];let resolve;const h=harness(async(path,body)=>{calls.push({path,body});if(body?.action==='next')return new Promise(r=>resolve=r);return {pending:1,issues:[]};});
 const early=h.start();early();await tick();assert.equal(calls.length,0);
 const cleanup=h.start();await tick();assert.ok(calls.some(c=>c.body?.action==='seed'));assert.ok(resolve);cleanup();const count=h.states.length;resolve({worked:true,changed:true});await tick();assert.equal(h.states.length,count);assert.equal(h.handlers.size,0);
});
test('fila é sequencial, atualiza sem recarregar edição e sincronização de outra empresa não a reinicia',async()=>{
 const calls=[];let remaining=2;const h=harness(async(path,body)=>{calls.push({path,body});return body?.action==='next'?{worked:remaining-->0,changed:remaining===1}:{pending:0,localUpdated:1,updates:1,issues:[]};});const cleanup=h.start();await tick();await tick();
 assert.equal(calls.filter(c=>c.body?.action==='next').length,3);assert.ok(h.states.some(s=>s[0]==='product'&&s[1]==='company'));assert.ok(h.states.some(s=>s[0]==='event'&&s[1]==='catalog'));
 const count=calls.length;h.handlers.get('synced')({detail:{companyId:'other'}});await tick();assert.equal(calls.length,count);h.handlers.get('synced')({detail:{companyId:'company'}});await tick();assert.equal(calls.filter(c=>c.body?.action==='seed').length,2);cleanup();
});

test('rotina saudável não ocupa espaço nas contas; somente falha aparece como alerta',async()=>{
 const h=harness(async()=>({pending:0,localUpdated:1,updates:0,issues:[{state:'skipped',message:'Preservado'}]}));
 assert.equal(h.tree,null);const cleanup=h.start();await tick();cleanup();
 const failed=harness(async()=>({}),{error:'Falha de comunicação'});
 assert.equal(failed.tree.type,'p');assert.equal(failed.tree.props.role,'alert');
 assert.match(failed.tree.props.children.join(''),/Falha de comunicação/);
 assert.equal(harness(async()=>({}),{error:'Falha',enabled:false}).tree,null);
});
test('falha de requisição continua anunciável e a sincronização posterior pode tentar novamente',async()=>{
 const h=harness(async()=>{throw Error('Não foi possível atualizar');});const cleanup=h.start();await tick();
 assert.ok(h.states.some(s=>s[0]==='state'&&s[1]==='Não foi possível atualizar'));
 assert.ok(h.handlers.has('synced'));cleanup();
});
