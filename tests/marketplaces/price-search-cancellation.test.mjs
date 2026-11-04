import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {boundedPriceRequest,waitForPriceSearch} from '../../app/modules/marketplaces/price-search-cancellation.ts';
const source=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8');
const part=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const cancel=source.match(/const cancelPriceSearch = useCallback\(\(silent = false\) => \{[\s\S]*?\}, \[\]\);/)?.[0] || '';
const consult=part('  const consult =','  const updateHistoryPrice =');
const refresh=part('  const refreshProductPrice =','  const openPricedProducts =');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(request){
 const states={},updates=[],exports={};
 const env={exports,useCallback:fn=>fn,AbortController,AbortSignal,Date,Error,crypto,waitForPriceSearch,setTimeout,clearTimeout,
 company:{id:'company'},connectionId:'account',stockBusy:false,savingPrice:false,loading:false,
 result:{localProductId:'product',localProductRevision:1},catalogAbortRef:{current:null},historyRunRef:{current:0},consultationRunRef:{current:0},consultationBusyRef:{current:false},consultationAbortRef:{current:null},pendingLotRead:{current:null},manualLotRead:{current:null},searchTriggerRef:{current:{focus(){states.focused=true;}}},
 request,captureLotRead:async()=>null,resolveLotRead:async()=>{},loadHistory:async()=>{},normalizeEan:v=>v,PRICE_CONTINUATION_TIMEOUT_MS:180000,PRICE_CONTINUATION_INTERVAL_MS:60000,requestAnimationFrame:fn=>fn()};
 for(const name of ['Loading','HistoryLoading','SearchIsLocal','PriceResearchFeedback','SearchCancelable','SearchNotice','Candidates','Error','ResultError','PendingInput','ManualRegistration','ResultFromCatalog','Result','ResultDetailsOpen','PricedProductsOpen','PricedProductsLoading'])env['set'+name]=value=>{const key=name[0].toLowerCase()+name.slice(1);states[key]=value;env[key]=value;if(name==='Result'&&value)updates.push(value);};
 // Extrai somente os controladores reais; não monta autenticação ou faz rede.
 const script=cancel+consult+refresh+'\nexports.consult=consult;exports.cancel=cancelPriceSearch;exports.refresh=refreshProductPrice;';
 vm.runInNewContext(ts.transpileModule(script,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,env);
 return{...exports,env,states,updates};
}
test('cancelar libera imediatamente e resposta antiga não altera resultado nem libera nova pesquisa',async()=>{
 const calls=[];const f=fixture((path,options)=>new Promise(resolve=>calls.push({path,options,resolve})));
 const first=f.consult({query:'Produto A'});await flush();assert.equal(calls.length,1);assert.equal(f.states.searchCancelable,true);
 f.cancel();assert.equal(calls[0].options.signal.aborted,true);assert.equal(f.env.consultationBusyRef.current,false);assert.equal(f.states.loading,false);assert.equal(f.states.searchCancelable,false);assert.equal(f.states.focused,true);
 const second=f.consult({query:'Produto B'});await flush();assert.equal(calls.length,2);
 calls[0].resolve({result:{status:'found',product:{name:'Antigo'}}});await first;
 assert.equal(f.updates.length,0);assert.equal(f.states.loading,true);assert.equal(f.env.consultationBusyRef.current,true);
 calls[1].resolve({result:{status:'found',product:{name:'Atual'}}});await second;
 assert.equal(f.updates.at(-1).product.name,'Atual');assert.equal(f.states.loading,false);
});
test('cancelamento durante intervalo encerra polling sem outra requisição nem mensagem de erro',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return{result:{status:'found',product:{name:'Produto'}},continuation:'same-task'};});
 const pending=f.consult({query:'Produto'});await flush();assert.equal(calls,1);f.cancel();await pending;
 assert.equal(calls,1);assert.equal(f.states.error,'');assert.equal(f.states.resultError,'');assert.equal(f.states.loading,false);
 const aborted=new AbortController();aborted.abort();assert.throws(()=>waitForPriceSearch(60000,aborted.signal),{name:'AbortError'});
});
test('atualização de referência também pode ser cancelada, sem reaplicar resposta tardia',async()=>{
 let resolve,signal;const f=fixture((_path,options)=>{signal=options.signal;return new Promise(done=>{resolve=done;});});
 const pending=f.refresh();assert.equal(f.states.searchCancelable,true);f.cancel();assert.equal(signal.aborted,true);
 resolve({result:{localProductId:'product',prices:{market:999}}});await pending;
 assert.equal(f.updates.length,0);assert.equal(f.states.loading,false);assert.equal(f.states.resultError,'');
});
test('AvantaPreços mostra retorno sem ofertas e falha no próprio produto; nunca termina em silêncio',async()=>{
 const f=fixture(async()=>({result:{localProductId:'product',product:{name:'Escova ER-10'},notice:'Sem preço'},research:{status:'no_offers',message:'Pesquisa concluída sem ofertas válidas.'}}));
 await f.refresh();assert.match(f.states.priceResearchFeedback.message,/sem ofertas/);assert.equal(f.states.loading,false);assert.equal(f.states.searchCancelable,false);
 const failed=fixture(async()=>{throw Error('Falha simulada');});await failed.refresh();assert.equal(failed.states.priceResearchFeedback.error,true);assert.match(failed.states.priceResearchFeedback.message,/Falha simulada/);assert.equal(failed.env.consultationBusyRef.current,false);
});
test('cancelar enquanto a sessão é obtida não dispara fetch posteriormente',async()=>{
 const controller=new AbortController();let release,calls=0;const exports={};
 const script=part('  const request =','  const lotCapture =')+'\nexports.request=request;';
 vm.runInNewContext(ts.transpileModule(script,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,useCallback:fn=>fn,boundedPriceRequest,supabase:{auth:{getSession:()=>new Promise(done=>{release=done;})}},fetch:()=>{calls++;},Error});
 const pending=exports.request('/api',{signal:controller.signal});controller.abort();release({data:{session:{access_token:'test-only'}}});
 await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,0);
});
test('cancelar enquanto o lote confirma a leitura impede iniciar pesquisa externa depois',async()=>{
 let release,calls=0;const f=fixture(async()=>{calls++;});
 f.env.captureLotRead=()=>new Promise(done=>{release=done;});
 const pending=f.consult({query:'Produto'});f.cancel();release(null);await pending;
 assert.equal(calls,0);assert.equal(f.states.loading,false);assert.equal(f.env.consultationBusyRef.current,false);
});
test('controle de cancelamento existe no início e no resultado sem depender de preço preenchido',()=>{
 assert.equal((source.match(/<PriceSearchProgress(?: local=\{searchIsLocal\})? onCancel=\{\(\) => cancelPriceSearch\(\)\}/g)||[]).length,2);
 assert.match(source,/signal: controller.signal/);assert.match(source,/waitForPriceSearch\(PRICE_CONTINUATION_INTERVAL_MS, controller.signal\)/);
 const ui=readFileSync('app/marketplaces/PriceSearchProgress.tsx','utf8');assert.match(ui,/BotaoAcaoCompacto aria-label="Cancelar pesquisa"/);assert.match(ui,/CarregamentoDadosModulo ativo variante="indicador"/);
});
