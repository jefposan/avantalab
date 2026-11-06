import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function setup(){
 const values=[],effects=[],requests=[],intervals=[];let index=0,first=true;
 const window=new EventTarget();window.setInterval=fn=>{intervals.push(fn);return 1;};window.clearInterval=()=>{};window.setTimeout=setTimeout;
 const document=new EventTarget();document.visibilityState='visible';document.querySelectorAll=()=>[];document.body={};
 class CustomEvent extends Event{constructor(name,options){super(name);this.detail=options.detail;}}
 const hooks={useEffect(fn){if(first)effects.push(fn);},useState(initial){const i=index++;if(!(i in values))values[i]=initial;return[values[i],v=>values[i]=v];},useRef(initial){const i=index++;return values[i]??=( {current:initial} );}};
 const exports={};runInNewContext(ts.transpileModule(readFileSync('app/components/MarketplaceLiveMonitor.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,window,document,CustomEvent,AbortController,AbortSignal,MutationObserver:class{observe(){}disconnect(){}},console,require(name){
  if(name==='react')return hooks;if(name==='react-dom')return{createPortal:node=>node};if(name==='react/jsx-runtime')return require(name);
  if(name.endsWith('/supabase'))return {supabase:{auth:{getSession:()=>new Promise(()=>{}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},removeChannel(){}}};
  if(name.endsWith('/Anunciados'))return {marketplaceClientRequest:(path,body)=>new Promise((resolve,reject)=>requests.push({path,body,resolve,reject}))};
  if(name.endsWith('/product-stock-events'))return {PRODUCT_STOCK_CHANGED:'stock'};return {};
 }});
 const render=()=>{index=0;const tree=exports.MarketplaceLiveMonitor({companyId:'company',onOpenSale(){}});first=false;return tree;};render();effects.forEach(fn=>fn());
 return {render,requests,poll:()=>intervals[0](),stop:()=>effects.at(-1)()};
}
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const a={id:'a',title:'Primeira venda'},b={id:'b',title:'Segunda venda'};
test('fechar todos limpa fila somente após confirmação, evita clique duplo e descarta polling antigo; nova venda volta a avisar',async()=>{
 const c=setup();c.requests[0].resolve({alerts:[a,b],notices:[]});await tick();let tree=c.render();assert.equal(tree.props.alert.id,'a');
 c.poll();assert.equal(c.requests.length,2);const pending=tree.props.onCloseAll();tree.props.onCloseAll();assert.equal(c.requests.length,3);assert.equal(c.requests[2].body.action,'acknowledge_all');assert.equal(c.render().props.busy,true);
 c.requests[2].resolve({ok:true});await pending;assert.equal(c.render(),null);
 c.requests[1].resolve({alerts:[a,b]});await tick();assert.equal(c.render(),null,'retorno iniciado antes do fechamento não reabre a fila');
 c.poll();c.requests[3].resolve({alerts:[]});await tick();assert.equal(c.render(),null);
 c.poll();c.requests[4].resolve({alerts:[{id:'nova',title:'Venda após fechamento'}]});await tick();assert.equal(c.render().props.alert.id,'nova');c.stop();
});
test('falha mantém aviso e mensagem recuperável; Entendi continua sendo individual',async()=>{
 const c=setup();c.requests[0].resolve({alerts:[a,b],notices:[]});await tick();let tree=c.render();const close=tree.props.onCloseAll();c.requests[1].reject(Error('rede'));await close;tree=c.render();assert.equal(tree.props.alert.id,'a');assert.match(tree.props.message,/Não foi possível fechar todos/);assert.equal(tree.props.busy,false);
 c.requests[2].resolve({alerts:[a,b]});await tick();const one=c.render().props.onAcknowledge();assert.equal(c.requests[3].body.action,'acknowledge');assert.equal(c.requests[3].body.alertId,'a');c.requests[3].resolve({ok:true});await one;c.stop();
});
