import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.createSourceFile('ImportStockChoice.tsx',readFileSync('app/marketplaces/ImportStockChoice.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let node;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='choose')node=n;ts.forEachChild(n,walk);}walk(source);
const expression=ts.transpileModule('('+node.getText(source)+')',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
const make=new Function('env',`with(env){return ${expression};}`);
test('escolher cadastro não confirma quantidade; mantém a tentativa e abre a conferência física',async()=>{
 const calls=[],adjusted=[],attempt={current:null},env={lock:{current:false},alive:{current:true},attempt,canManage:true,candidates:[{id:'local',name:'Nome local'}],selected:'local',companyId:'company',notice:{connectionId:'account',listingId:'listing'},crypto,AbortSignal,Error,setBusy(){},setError(){},setAttempted(){},notifyProductStockChanged(){},onAdjust:n=>adjusted.push(n),marketplaceClientRequest:async(path,body)=>{calls.push(body);return{product_id:'local'};}};
 await make(env)();assert.equal(adjusted[0].productId,'local');assert.equal(adjusted[0].source,'stock');assert.equal(adjusted[0].productName,'Nome local');assert.equal(calls[0].quantity,undefined);assert.equal(calls[0].action,'choose_import_product');const key=calls[0].requestKey;
 await make(env)();assert.equal(calls[1].requestKey,key);
 env.canManage=false;await make(env)();assert.equal(calls.length,2);env.canManage=true;env.selected='other-profile';await make(env)();assert.equal(calls.length,2);
});
