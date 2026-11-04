import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('Anunciados.tsx',readFileSync('app/marketplaces/Anunciados.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let node;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='executeAction')node=n;ts.forEachChild(n,walk);}walk(source);
const expression=ts.transpileModule('('+node.getText(source)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
const make=new Function('env',`with(env){return ${expression};}`);
function fixture(){
 const calls=[],state={},env={confirmation:{id:'MLB123456',connectionId:'account-a',companyId:'company',provider:'mercado_livre',action:'pause',requestKey:'same-attempt'},acting:false,actionLock:{current:false},companyId:'company',marketplace:'mercado_livre',canManage:true,scopedAccounts:[{id:'account-a',status:'connected'},{id:'account-b',status:'connected'}],activeAccountId:'',AbortSignal,
  notifyProductStockChanged(){},setError:v=>state.error=v,setConfirmation:v=>state.confirmation=v,setActing:v=>state.acting=v,setExpanded:v=>state.expanded=v,setSyncNotice:v=>state.notice=v,loadListRef:{current:async()=>calls.push('refresh')},requestAnimationFrame:fn=>fn(),editButtons:{current:new Map()},listingRowKey:()=>'',marketplaceClientRequest:async(path,body)=>{calls.push({path,body});return{success:true,pending:false};}};
 return{env,calls,state,run:()=>make(env)()};
}
test('Todas as contas, ficha recolhida ou outra ficha aberta não impedem ação da conta confirmada',async()=>{
 for(const activeAccountId of ['', 'account-b']){const f=fixture();f.env.activeAccountId=activeAccountId;await f.run();assert.equal(f.calls[0].body.connectionId,'account-a');assert.equal(f.calls[0].body.requestKey,'same-attempt');assert.equal(f.calls[0].body.action,'pause');assert.match(f.state.notice,/confirmada/);}
});
test('contexto/permissão alterados mostram erro sem enviar; clique duplo não duplica',async()=>{
 for(const patch of [{companyId:'other'},{marketplace:'magalu'},{canManage:false},{scopedAccounts:[]}]){const f=fixture();Object.assign(f.env,patch);await f.run();assert.equal(f.calls.length,0);assert.match(f.state.error,/Nenhuma ação foi enviada/);}
 const f=fixture();let release;f.env.marketplaceClientRequest=()=>new Promise(resolve=>release=resolve);const first=f.run();await f.run();assert.equal(f.env.actionLock.current,true);release({success:true});await first;assert.equal(f.env.actionLock.current,false);
});
test('resposta sem confirmação não vira sucesso; processamento é apresentado como pendente',async()=>{
 for(const result of [{},{success:false},{pending:true}]){const f=fixture();f.env.marketplaceClientRequest=async()=>result;await f.run();if(result.pending)assert.match(f.state.notice,/aguardando/);else{assert.match(f.state.error,/não confirmou/);assert.equal(f.state.notice,undefined);}}
});
