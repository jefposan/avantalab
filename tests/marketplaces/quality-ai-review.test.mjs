import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const source=ts.createSourceFile('Review.tsx',readFileSync('app/marketplaces/QualityAIReview.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='apply')fn=n;ts.forEachChild(n,walk);}walk(source);
const compiled=ts.transpileModule(`(${fn.getText(source)})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'');
function fixture({reviewed=true,stale=false,fail=false}={}){
 const calls=[],state={},data={productId:'product',sourceConnectionId:'account',sourceId:'MLB123456',revisions:{attributes:'rev',details:'rev',pictures:'rev'},suggestions:[{field:'COLOR',value:'Preto'}],description:'Descrição confirmada',pictures:[]};
 const env={data,reviewed,busy:false,finished:false,companyId:'company',productId:'product',selected:['COLOR','description'],URLSearchParams,AbortSignal,Event,window:{dispatchEvent:()=>calls.push('event')},setBusy:v=>state.busy=v,onBusy:v=>state.parentBusy=v,setError:v=>state.error=v,setFinished:v=>state.finished=v,setResults:v=>state.results=v,
 request:async()=>{calls.push('preflight');return {revision:stale?'changed':'rev'};},commonProductRequest:({kind,onlyMissing,onProgress})=>async(path,body)=>{assert.equal(onlyMissing,true);if(!body){calls.push(`read:${kind}`);return {revision:'fresh'};}calls.push(`apply:${kind}`);assert.equal(body.revision,'fresh');onProgress([{id:'MLB123456',message:'Confirmado'}]);if(fail)throw Error('Falha parcial');return {success:true};}};
 return {state,calls,apply:new Function('env',`with(env){return ${compiled}}`)(env)};
}
test('sem revisão não envia nada; proposta antiga bloqueia todos antes da primeira gravação',async()=>{
 let f=fixture({reviewed:false});await f.apply();assert.deepEqual(f.calls,[]);
 f=fixture({stale:true});await f.apply();assert.equal(f.calls.some(c=>c.startsWith('apply:')),false);assert.match(f.state.error,/mudou/);assert.equal(f.state.busy,false);assert.equal(f.state.parentBusy,false);
});
test('revisão válida aplica somente selecionados e falha parcial interrompe próximo tipo sem retry',async()=>{
 let f=fixture();await f.apply();assert.deepEqual(f.calls.slice(0,2),['preflight','preflight']);assert.ok(f.calls.includes('apply:attributes'));assert.ok(f.calls.includes('apply:details'));assert.equal(f.state.finished,true);assert.equal(f.state.error,'');
 f=fixture({fail:true});await f.apply();assert.equal(f.calls.filter(c=>c.startsWith('apply:')).length,1);assert.match(f.state.error,/parcial/);assert.equal(f.state.finished,true);assert.equal(f.state.busy,false);
});
