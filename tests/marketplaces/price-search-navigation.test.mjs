import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {boundedPriceRequest,waitForPriceSearch} from '../../app/modules/marketplaces/price-search-cancellation.ts';
import {createSearchRenderFixture} from './price-search-render-harness.mjs';
const source=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8');
const part=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const states={},calls=[],exports={};
 const env={exports,useEffect:()=>{},useCallback:fn=>fn,AbortController,AbortSignal,Date,Error,crypto,setTimeout,clearTimeout,waitForPriceSearch,
 company:{id:'company'},connectionId:'account',stockBusy:false,savingPrice:false,loading:false,query:'Air fryer',result:{historyId:'history'},marketPriceDraft:'10',
 historyRunRef:{current:0},priceSaveBusyRef:{current:false},catalogAbortRef:{current:null},consultationRunRef:{current:0},consultationBusyRef:{current:false},consultationAbortRef:{current:null},pendingLotRead:{current:null},manualLotRead:{current:null},searchTriggerRef:{current:null},requestAnimationFrame:fn=>fn(),
 request:(path,options)=>new Promise(resolve=>calls.push({path,options,resolve})),
 captureLotRead:async()=>null,resolveLotRead:async()=>{},loadHistory:async()=>{},normalizeEan:v=>v,PRICE_CONTINUATION_TIMEOUT_MS:180000,PRICE_CONTINUATION_INTERVAL_MS:2000,
 historyToConsultation:row=>({status:'found',historyId:row.id,prices:row.prices,sample:row.sample,consultedAt:row.consultedAt,product:{name:row.product_name}})};
 for(const name of ['Loading','HistoryLoading','SearchCancelable','SearchNotice','Candidates','Error','ResultError','PendingInput','ManualRegistration','ResultFromCatalog','Result','ResultDetailsOpen','HistorySearch','CatalogPage','CatalogRefresh','CatalogWarehouseId','PricedProductsOpen','PricedProductsLoading','PricedProducts','CatalogTotal','CatalogSearchRequested','CatalogError','SavingPrice'])env['set'+name]=value=>{const key=name[0].toLowerCase()+name.slice(1);states[key]=typeof value==='function'?value(states[key]||0):value;env[key]=states[key];};
 env.setHistorySort=value=>{states.historySort=value;env.historySort=value;};env.setSearchIsLocal=value=>{states.searchIsLocal=value;env.searchIsLocal=value;};
 const cancel=source.match(/const cancelPriceSearch = useCallback\(\(silent = false\) => \{[\s\S]*?\}, \[\]\);/)[0];
 const script=cancel+part('  const consult =','  const updateHistoryPrice =')+part('  const openPricedProducts =','  const logout =')+part('  const openCatalogProduct =','  useEffect(() => {\n    setMarketPriceDraft')+part('  const updateHistoryPrice =','  const refreshProductPrice =')+'\nObject.assign(exports,{consult,cancel:cancelPriceSearch,catalog:openPricedProducts,searchCatalog,history:openHistoryResult,open:openCatalogProduct,save:updateHistoryPrice,clear:clearCatalogResults,back:returnFromProduct});';
 vm.runInNewContext(ts.transpileModule(script,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,env);
 return{...exports,env,states,calls};
}
test('abrir todos os produtos cancela consulta anterior e descarta resposta tardia',async()=>{
 const f=fixture(),pending=f.consult({query:'Produto'});await flush();
 f.catalog();assert.equal(f.calls[0].options.signal.aborted,true);assert.equal(f.states.loading,false);assert.equal(f.states.pricedProductsOpen,true);
 f.calls[0].resolve({result:{status:'found',product:{name:'Antigo'}}});await pending;
 assert.equal(f.states.result,null);assert.equal(f.states.resultDetailsOpen,false);
});
test('busca local abre área própria e cancelar também aborta catálogo',()=>{
 const f=fixture();f.searchCatalog();assert.equal(f.states.historySearch,'Air fryer');assert.equal(f.states.pricedProductsOpen,true);
 const controller=new AbortController();f.env.catalogAbortRef.current=controller;f.cancel();assert.equal(controller.signal.aborted,true);assert.equal(f.states.pricedProductsOpen,false);
 assert.ok(!source.includes(': pricedProductsOpen ?'));
 assert.match(source,/searchCancelable \|\| pricedProductsOpen && catalogPending/);
 assert.match(source,/event.preventDefault\(\); searchCatalog\(\)/);
});
test('produto não localizado mantém pesquisa com aviso, sem cadastro manual; valor médio só nos detalhes',async()=>{
 const f=fixture(),pending=f.consult({query:'Produto inexistente'});await flush();f.calls[0].resolve({result:{status:'not_found'}});await pending;
 assert.equal(f.states.result,null);assert.match(f.states.error,/Produto não localizado/);assert.equal(f.states.loading,false);
 const home=createSearchRenderFixture({result:null,error:f.states.error}).render().html;
 assert.match(home,/Produto não localizado/);assert.doesNotMatch(home,/Registrar cálculo manual|Salvar cálculo|manual-product-price|Ajustar preço médio/);
 const found={status:'found',historyId:'history',product:{id:'known',name:'Produto localizado',description:'',image:null,attributes:[]},prices:{market:200,minimum:100,medium:140,ideal:180}};
 const detail=createSearchRenderFixture({result:found,resultDetailsOpen:true}).render().html;
 assert.match(detail,/Ajustar preço médio/);assert.match(detail,/Atualizar cálculos/);
 assert.doesNotMatch(source,/manualRegistration|saveManualRegistration/);
});
test('produto encontrado por descrição permanece na busca; detalhes abrem por seleção',async()=>{
 const f=fixture(),pending=f.consult({query:'Produto'});await flush();f.calls[0].resolve({result:{status:'found',product:{name:'Localizado'}}});await pending;
 assert.equal(f.states.result.product.name,'Localizado');assert.equal(f.states.resultDetailsOpen,false);
 assert.match(source,/resultDetailsOpen && result\?\.status === 'found'/);
 assert.match(source,/onClick=\{\(\) => setResultDetailsOpen\(true\)\}/);
});
test('EAN cadastrado abre diretamente o produto e preços sem pesquisar externamente',async()=>{
 const f=fixture(),pending=f.consult({ean:'7897013514166'});await flush();
 f.calls[0].resolve({result:{status:'found',ean:'7897013514166',product:{name:'Calculadora'},prices:{market:200,minimum:100,medium:140,ideal:180}}});await pending;
 assert.equal(f.states.resultDetailsOpen,true);assert.equal(f.states.result.prices.market,200);assert.equal(f.calls.length,1);assert.match(f.calls[0].path,/precos\/produto$/);
 const detail=createSearchRenderFixture({resultDetailsOpen:f.states.resultDetailsOpen,result:f.states.result}).render().html;assert.match(detail,/result-title/);assert.match(detail,/Preço mínimo/);assert.match(detail,/Voltar/);assert.doesNotMatch(detail,/manual-ean/);
});
test('EAN novo digitado ou recebido do leitor abre detalhes assim que identificado',async()=>{
 const f=fixture(),pending=f.consult({ean:'7897013514166'});await flush();f.calls[0].resolve({result:null});await flush();
 f.calls[1].resolve({result:{status:'found',ean:'7897013514166',product:{name:'Calculadora'},prices:{market:200}}});await pending;
 assert.equal(f.states.resultDetailsOpen,true);assert.equal(f.states.loading,false);assert.equal(f.states.result.product.name,'Calculadora');
 assert.match(source,/onConsult=\{\(value\) => \{ setEan\(value\); setScannerOpen\(false\); void consult\(\{ ean: value \}\); \}\}/);
});
test('EAN cancelado não abre resultado antigo; ausência e ambiguidade permanecem na pesquisa',async()=>{
 const f=fixture(),pending=f.consult({ean:'7897013514166'});await flush();f.cancel();f.calls[0].resolve({result:{status:'found',product:{name:'Antigo'}}});await pending;assert.equal(f.states.resultDetailsOpen,false);assert.equal(f.states.result,null);
 for(const result of [{status:'not_found'},{status:'choose',candidates:[{id:'MLB1',name:'Escolher variante'}]}]){
  const f=fixture(),pending=f.consult({ean:'7897013514166',productId:'MLB1'});await flush();f.calls[0].resolve({result});await pending;assert.equal(f.states.resultDetailsOpen,false);
 }
});
test('histórico tem Cancelar; cancelar impede resposta atrasada substituir produto',async()=>{
 const f=fixture();f.history({local_product_id:'local',product_name:'Histórico'});await flush();
 assert.equal(f.states.resultDetailsOpen,true);assert.equal(f.states.searchCancelable,true);
 const call=f.calls[0];assert.ok(call.options.signal);f.cancel();assert.equal(call.options.signal.aborted,true);
 call.resolve({result:{product:{name:'Antigo'}}});await flush();assert.equal(f.states.result.product.name,'Histórico');assert.equal(f.states.loading,false);
});
test('produto do catálogo tem cancelamento e não abre depois de cancelar',async()=>{
 const f=fixture(),pending=f.open({id:'local'});assert.equal(f.states.searchCancelable,true);f.cancel();
 f.calls[0].resolve({result:{status:'found',product:{name:'Antigo'}}});await pending;assert.notEqual(f.states.resultDetailsOpen,true);
});
test('abrir histórico preserva preços, amostra e data salvos ao conferir cadastro, sem pesquisa externa',async()=>{
 const f=fixture(),prices={market:200},sample={count:3,source:'openai_web_search'};
 f.history({id:'saved',local_product_id:'local',product_name:'Salvo',prices,sample,consultedAt:'2026-10-20'});await flush();
 assert.equal(f.states.result.prices.market,200);
 assert.match(f.calls[0].path,/precos\/produto$/);assert.equal(f.calls[0].options.method,'POST');
 assert.equal(JSON.parse(f.calls[0].options.body).action,undefined);
 f.calls[0].resolve({result:{localProductId:'local',localProductRevision:4,prices:{market:999},sample:{count:1}}});await flush();
 assert.equal(f.states.result.prices.market,200);assert.equal(f.states.result.sample.count,3);assert.equal(f.states.result.consultedAt,'2026-10-20');assert.equal(f.states.result.historyId,'saved');assert.equal(f.states.result.localProductRevision,4);assert.equal(f.calls.length,1);
});
test('atualização explícita de histórico autoriza nova pesquisa',async()=>{
 const f=fixture(),pending=f.consult({historyId:'saved'});await flush();
 assert.equal(JSON.parse(f.calls[0].options.body).refreshPrice,true);
 f.calls[0].resolve({result:{status:'found',prices:{market:250}}});await pending;
 assert.equal(f.states.result.prices.market,250);
});
test('salvar libera navegação sem esperar histórico e bloqueia submissão duplicada',async()=>{
 const f=fixture();let resolveHistory;f.env.loadHistory=()=>new Promise(resolve=>{resolveHistory=resolve;});
 const pending=f.save({preventDefault(){}});void f.save({preventDefault(){}});assert.equal(f.calls.length,1);
 f.calls[0].resolve({result:{status:'found'}});await pending;assert.equal(f.states.savingPrice,false);assert.equal(f.env.priceSaveBusyRef.current,false);resolveHistory();
});
test('timeout abrange sessão ou corpo que ignoram abort, sem manter interface aguardando',async()=>{
 let signal;await assert.rejects(boundedPriceRequest(value=>{signal=value;return new Promise(()=>{});},null,10),/demorou/);assert.equal(signal.aborted,true);
 const controller=new AbortController();const pending=boundedPriceRequest(()=>new Promise(()=>{}),controller.signal,60000);controller.abort();await assert.rejects(pending,{name:'AbortError'});
});
test('catálogo descarta resposta cancelada, possui limite e estado de erro/repetir',()=>{
 const effect=part('  useEffect(() => {\n    if (!pricedProductsOpen','  useEffect(() => {\n    if (access');
 assert.match(effect,/AbortSignal.timeout\(25_000\)/);assert.match(effect,/active && !controller.signal.aborted/);
 assert.match(source,/Tentar novamente/);assert.match(source,/clearTimeout\(timeout\)/);
});
test('render real separa catálogo da consulta externa, mantém retorno e cabeçalho fora da lista rolável',()=>{
 const item={id:'test',name:'Produto demonstração',ean:'7898649372113',pictures:[],allocations:[],price_cents:1000};
 const f=createSearchRenderFixture({query:'Produto',pricedProductsOpen:true,catalogSearchRequested:true,pricedProducts:[item],catalogTotal:1,loadedCatalogKey:JSON.stringify(['fictitious','',1,'alpha','all',0])});
 const html=f.render().html;assert.match(html,/Pesquisar na base da empresa/);assert.match(html,/Voltar/);assert.match(html,/Base da empresa/);assert.match(html,/Resultados da pesquisa/);assert.match(html,/Limpar resultados/);assert.match(html,/Ordenar produtos/);assert.match(html,/Produto demonstração/);assert.match(html,/aria-label="Lista de produtos da empresa"/);assert.doesNotMatch(html,/result-title|manual-ean|product-query|Pesquisar na internet|Ler EAN|Ler etiqueta|Criar Lote|Últimas consultas/);
 const waitingFixture=createSearchRenderFixture({pricedProductsOpen:true,catalogSearchRequested:true,pricedProductsLoading:true,loading:true});const waiting=waitingFixture.render();assert.match(waiting.html,/Cancelar pesquisa/);assert.doesNotMatch(waiting.html,/manual-ean/);
 const flatten=node=>Array.isArray(node)?node.flatMap(flatten):node&&typeof node==='object'?[node,...flatten(node.props?.children)]:[];
 const progress=flatten(waiting.tree).find(node=>node.type?.name==='PriceSearchProgress');assert.ok(progress);progress.props.onCancel({type:'click'});assert.equal(waitingFixture.state.pricedProductsOpen,true);
 const detail=createSearchRenderFixture({resultDetailsOpen:true,result:{status:'found',product:{name:'Selecionado'}}}).render().html;assert.match(detail,/result-title/);assert.match(detail,/Voltar/);assert.doesNotMatch(detail,/manual-ean/);
});
test('abrir carrega lista local A–Z sem termo; limpar restaura lista e voltar preserva termo/página',()=>{
 const f=fixture();f.env.historySort='date';f.catalog();assert.equal(f.calls.length,0);assert.equal(f.states.catalogSearchRequested,true);assert.equal(f.states.pricedProductsOpen,true);assert.equal(f.states.historySort,'alpha');
 const initial=createSearchRenderFixture({pricedProductsOpen:true,catalogSearchRequested:true}).render().html;assert.match(initial,/Base da empresa. Carregando produtos…/);assert.doesNotMatch(initial,/Consultar EAN/);
 f.searchCatalog();assert.equal(f.states.catalogSearchRequested,true);assert.equal(f.calls.length,0);
 f.env.resultFromCatalog=true;f.env.historySearch='Máquina';f.env.catalogPage=2;f.back();assert.equal(f.states.pricedProductsOpen,true);assert.equal(f.env.historySearch,'Máquina');assert.equal(f.env.catalogPage,2);
 f.clear();assert.equal(f.states.historySearch,'');assert.equal(f.states.catalogSearchRequested,true);assert.equal(f.states.pricedProductsOpen,true);assert.equal(f.calls.length,0);
 const effect=part('  useEffect(() => {\n    if (!pricedProductsOpen','  useEffect(() => {\n    if (!company?.id) return;');assert.match(effect,/!catalogSearchRequested/);assert.match(effect,/precos\/produto\?empresaId=/);assert.doesNotMatch(effect,/consult\(|research|openai|\/precos['"]/);
});

test('visualizar estoque mostra seleção e quantidade específica; voltar preserva filtro e abrir todos redefine',()=>{
 const scope='saldao';
 const renderFixture=createSearchRenderFixture({pricedProductsOpen:true,catalogSearchRequested:true,catalogWarehouseId:scope,catalogWarehouses:[{id:scope,name:'SALDÃO',is_online:false}],pricedProducts:[{id:'p',name:'Produto com saldo',ean:null,pictures:[],selected_stock_quantity:4,price_cents:1000}],catalogTotal:1,loadedCatalogKey:JSON.stringify(['fictitious','',1,'alpha',scope,0])});
 const html=renderFixture.render().html;assert.match(html,/Visualizar produtos/);assert.match(html,/SALDÃO: 4 un\./);assert.match(html,/Produto com saldo/);
 const f=fixture();f.env.resultFromCatalog=true;f.env.catalogWarehouseId=scope;f.back();assert.equal(f.env.catalogWarehouseId,scope);f.catalog();assert.equal(f.states.catalogWarehouseId,'all');
});
