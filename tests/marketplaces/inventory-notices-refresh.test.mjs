import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

test('monitor atualiza, agrupa clique durante consulta e não fica preso ao realtime nem aceita retorno após fechar',async()=>{
  const effects=[],requests=[],received=[],states=[],intervals=[];let now=100_000;
  const window=new EventTarget();window.setInterval=fn=>{intervals.push(fn);return intervals.length;};window.clearInterval=()=>{};window.setTimeout=setTimeout;
  const document=new EventTarget();document.visibilityState='visible';document.querySelectorAll=()=>[];document.body={};
  class CustomEvent extends Event {constructor(name,options){super(name);this.detail=options.detail;}}
  const supabase={auth:{getSession:()=>new Promise(()=>{}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},removeChannel(){}};
  const require=name=>{
    if(name==='react')return {useEffect:fn=>effects.push(fn),useRef:initial=>({current:initial}),useState:initial=>[initial,()=>{}]};
    if(name==='react/jsx-runtime')return {jsx(){},jsxs(){}};
    if(name==='react-dom')return {createPortal(){}};
    if(name.endsWith('/supabase'))return {supabase};
    if(name.endsWith('/Anunciados'))return {marketplaceClientRequest:(path,body,signal)=>new Promise((resolve,reject)=>requests.push({path,signal,resolve,reject}))};
    if(name.endsWith('/product-stock-events'))return {PRODUCT_STOCK_CHANGED:'avanta:marketplace-products-changed'};
    return {};
  };
  const module={exports:{}};
  const source=readFileSync(new URL('../../app/components/MarketplaceLiveMonitor.tsx',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  runInNewContext(compiled,{module,exports:module.exports,require,window,document,CustomEvent,AbortController,AbortSignal,Date:class extends Date{static now(){return now;}},MutationObserver:class{observe(){}disconnect(){}},console});
  window.addEventListener('avanta:marketplace-live-feed',event=>received.push(event.detail));
  window.addEventListener('avanta:marketplace-notices-refresh-state',event=>states.push(event.detail));
  module.exports.MarketplaceLiveMonitor({companyId:'company'});
  const stop=effects[1]();
  const tick=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
  const emit=(name,companyId='company')=>window.dispatchEvent(new CustomEvent(name,{detail:{companyId}}));
  assert.equal(requests.length,1);
  emit('avanta:marketplace-refresh-notices');emit('avanta:marketplace-refresh-notices');
  assert.equal(requests.length,1);assert.equal(states.at(-1).loading,true);
  requests[0].resolve({alerts:[],notices:[]});await tick();
  assert.equal(received.length,1);assert.equal(requests.length,2,'um refresh agrupado mesmo com getSession pendente');
  requests[1].resolve({alerts:[],notices:[]});await tick();assert.equal(states.at(-1).loading,false);
  emit('avanta:marketplace-refresh-notices','outra-empresa');assert.equal(requests.length,2);
  emit('avanta:marketplace-products-changed');assert.equal(requests.length,3);
  requests[2].reject(Error('rede'));await tick();assert.equal(states.at(-1).loading,false);assert.match(states.at(-1).error,/Não foi possível/);assert.equal(received.at(-1).unavailable,true);
  intervals[0]();assert.match(requests[3].path,/scope=sales/);requests[3].resolve({alerts:[]});await tick();
  now+=60_000;intervals[0]();assert.doesNotMatch(requests[4].path,/scope=sales/);requests[4].resolve({alerts:[],notices:[]});await tick();assert.equal(received.at(-1).refreshInventory,true,'reconsulta pendências após processamento em segundo plano');
  emit('avanta:marketplace-refresh-notices');assert.equal(requests.length,6);const count=received.length;
  stop();assert.equal(requests[5].signal.aborted,true);
  requests[5].resolve({alerts:[],notices:[]});await tick();assert.equal(received.length,count);
  emit('avanta:marketplace-refresh-notices');assert.equal(requests.length,6);
});
