import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8');
const ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='openHistoryResult')callback=n.initializer;ts.forEachChild(n,walk);}walk(ast);
async function open(current,stale=false){
 const old={historyId:'old',prices:{market:200,minimum:100,medium:140,ideal:180},sample:{source:'old'},consultedAt:'old-date'};
 let rendered;
 const env={exports:{},useCallback:f=>f,consultationBusyRef:{current:false},stockBusy:false,cancelPriceSearch(){},setSearchIsLocal(){},consultationRunRef:{current:0},setResultError(){},setResultFromCatalog(){},historyToConsultation:()=>old,setResult:r=>rendered=r,setResultDetailsOpen(){},company:{id:'company'},AbortController,AbortSignal,consultationAbortRef:{current:null},setLoading(){},setSearchCancelable(){},request:async()=>{if(stale)env.consultationRunRef.current++;return{result:current}}};
 vm.runInNewContext(ts.transpileModule('const openHistoryResult='+callback.getText(ast)+';exports.open=openHistoryResult;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,env);
 env.exports.open({local_product_id:'product'});await new Promise(r=>setImmediate(r));return{rendered,old};
}
test('reabrir histórico após edição manual usa referência atual e sugestões do servidor',async()=>{
 const current={historyId:'manual',prices:{market:500,minimum:250,medium:350,ideal:450},sample:{source:'local_reference'},localProductRevision:4};
 const {rendered}=await open(current);assert.equal(rendered,current);assert.equal(rendered.prices.market,500);assert.equal(rendered.prices.medium,350);
});
test('mesmo preço preserva contexto da pesquisa sem substituir cálculos atuais',async()=>{
 const current={historyId:'current',prices:{market:200,minimum:110,medium:150,ideal:190}};
 const {rendered}=await open(current);assert.equal(rendered.prices,current.prices);assert.equal(rendered.historyId,'old');
});
test('resposta de abertura antiga não substitui outra consulta',async()=>{
 const {rendered,old}=await open({prices:{market:500}},true);assert.equal(rendered,old);
});
