import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {refreshAccountSales} from '../../app/marketplaces/startup-account-sync.ts';
const source=readFileSync(new URL('../../app/marketplaces/Anunciados.tsx',import.meta.url),'utf8');
function harness(request){
 const ast=ts.createSourceFile('Anunciados.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='synchronize')fn=node.initializer.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(fn);
 const calls=[],sales=[],state={error:'',notice:'',syncing:false},controller={current:null};
 const context={AbortController,Error,marketplace:'mercado_livre',companyId:'company',accountId:'',accounts:[{id:'a',name:'Conta A'},{id:'b',name:'Conta B'}],acting:false,expanded:'',copyingListing:null,
  marketplaceIntegrated:()=>true,accountsForMarketplace:accounts=>accounts,salesAccountAvailable:()=>true,accountDisplayName:account=>account.name,
  syncController:controller,setExpanded:()=>{},setCopyingListing:()=>{},setCopyTargetId:()=>{},
  setSyncing:v=>{state.syncing=v;},setError:v=>{state.error=v;},setSyncNotice:v=>{state.notice=v;},
  marketplaceClientRequest:async(path,body)=>{if(path.startsWith('vendas?')){sales.push(path);return{sales:[]};}calls.push(body);return request(body);},refreshAccountSales,
  setLoading:()=>assert.fail('atualização manual não bloqueia lista'),setExpandedState:()=>assert.fail('não descarta edição aberta'),
  loadAccounts:async()=>{calls.push('accounts');},loadListRef:{current:async()=>{calls.push('local-list');}},
 };
 const run=vm.runInNewContext(ts.transpile(`(${fn})`,{target:ts.ScriptTarget.ES2022}),context);
 return{run,calls,state,controller,sales};
}
test('403 na conferência não impede descoberta nem atualização das outras contas',async()=>{
 const h=harness(body=>{if(body.reconcileKnown&&body.connectionId==='a')throw Error('Recurso negado pelo ML');return{count:2,complete:true};});
 await h.run();assert.equal(h.calls.filter(body=>body.connectionId==='a').length,2);assert.equal(h.calls.filter(body=>body.connectionId==='b').length,2);
 assert.match(h.state.error,/Conta A — conferir situação: Recurso negado/);assert.equal(h.sales.length,2);assert.equal(h.state.notice,'');assert.equal(h.state.syncing,false);
});
test('falha na busca de uma conta preserva carga local e não declara sincronização completa',async()=>{
 const h=harness(body=>{if(!body.reconcileKnown&&body.connectionId==='a')throw Error('HTTP 403');return{count:3,complete:true};});
 await h.run();assert.ok(h.calls.some(body=>body.connectionId==='b'&&!body.reconcileKnown));assert.equal(h.sales.length,1);assert.match(h.sales[0],/connectionId=b/);
 assert.match(h.state.error,/Conta A: HTTP 403/);assert.equal(h.state.notice,'');assert.equal(h.state.syncing,false);
});
test('conferência parcial retornada pela API não vira sucesso total',async()=>{
 const h=harness(body=>({count:1,complete:true,partial:!!body.reconcileKnown}));await h.run();assert.match(h.state.error,/Conta A/);assert.match(h.state.error,/Conta B/);assert.match(h.state.error,/pendente/);
});
test('carga bem-sucedida mantém sucesso e sempre libera controles',async()=>{
 const h=harness(()=>({count:2,complete:true}));await h.run();assert.equal(h.state.error,'');assert.equal(h.state.syncing,false);assert.equal(h.state.notice,'');assert.equal(h.sales.length,2);
});
test('segundo clique não duplica fila; cancelamento interrompe sem novos lotes',async()=>{
 let release;const h=harness(()=>new Promise(resolve=>release=resolve));const pending=h.run();assert.equal(h.state.syncing,true);await h.run();assert.equal(h.calls.length,1);h.controller.current.abort();release({complete:true});await pending;assert.equal(h.calls.length,1);assert.equal(h.state.syncing,false);assert.equal(h.sales.length,0);
});
test('aviso não apaga total conhecido e refresh não limpa a lista antecipadamente',()=>{
 assert.match(source,/!!error && totalScope !== countScope/);
 assert.match(source,/setTotalScope\(scope\)/);
 assert.doesNotMatch(source,/setTimeout\(\(\) => \{ setRows\(\[\]\); void loadList/);
 assert.match(source,/rowsFilter === rowFilter/);
 assert.match(source,/setRowsFilter\(JSON.stringify\(\[query,status,order,qualityFilter,page,noticeListing\?\.listingId\]\)\)/);
});
