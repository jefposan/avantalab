import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks,createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'../..'),require=createRequire(import.meta.url);
const hook=registerHooks({resolve(s,c,next){const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);}});
const {loadProductListingLink}=await import('../../app/marketplaces/product-link-request.ts');
const {productListingUrl}=await import('../../app/modules/marketplaces/product-listing-update.ts');hook.deregister();
const link={id:'link',connection_id:'account',provider:'mercado_livre',provider_listing_id:'MLB123456',status:'paused',source_snapshot:{}};
const response={id:link.provider_listing_id,connectionId:'account',permalink:'https://produto.mercadolivre.com.br/MLB-123456-produto'};
test('consulta exclusiva valida conta, anúncio e endereço sem fallback ou mutação',async()=>{
 let calls=0;const request=async(path,body,signal,method)=>{calls++;assert.match(path,/^anunciados\/link\?/);assert.equal(body,undefined);assert.equal(method,undefined);assert.equal(signal.aborted,false);return response};
 assert.equal(await loadProductListingLink(request,'company',link,new AbortController().signal),response.permalink);assert.equal(calls,1);
 for(const patch of [{id:'MLB654321'},{connectionId:'other'},{permalink:'javascript:alert(1)'},{permalink:'https://malicioso.example'},{permalink:'https://x:senha@mercadolivre.com.br'}])await assert.rejects(loadProductListingLink(async()=>({...response,...patch}),'company',link,new AbortController().signal));
});
test('sessão/fetch pendurados têm prazo; aborto e resposta tardia não são sucesso nem causam reenvio',async()=>{
 let signal,release,calls=0;const request=async(_path,_body,s)=>{signal=s;calls++;return await new Promise(r=>release=r)};
 await assert.rejects(loadProductListingLink(request,'company',link,new AbortController().signal,8),/demorou/);assert.equal(signal.aborted,true);release(response);await new Promise(setImmediate);assert.equal(calls,1);
 const abort=new AbortController();abort.abort();await assert.rejects(loadProductListingLink(request,'company',link,abort.signal));assert.equal(calls,1);
});
function harness(){
 const state=[],requests=[],notified=[],busy=[],updates=[];let cursor=0,cleanup,mounted=false,tree;
 const exported={};const props={product:{id:'product',empresa_id:'company',name:'Produto',stock_quantity:1,links:[link]},accounts:[{id:'account',status:'connected',seller_name:'JEFF'}],canManage:true,busy:false,dark:false,brand:'#003e73',request:async(path,body,signal)=>new Promise((resolve,reject)=>requests.push({path,body,signal,resolve,reject})),onBusy:value=>busy.push(value),onUpdated:()=>updates.push(true)};
 vm.runInNewContext(ts.transpileModule(readFileSync(resolve(root,'app/marketplaces/ProductLinkedListings.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:exported,crypto,AbortController,AbortSignal,URLSearchParams,Error,require(n){
  if(n==='react')return {useState(v){const i=cursor++;if(!(i in state))state[i]=typeof v==='function'?v():v;return[state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useRef(v){const i=cursor++;return state[i]??={current:v}},useEffect(fn){if(!mounted){cleanup=fn();mounted=true}}};
  if(n.endsWith('.module.css'))return{default:{}};if(n.includes('BotaoAcaoCompacto'))return{default:'button'};if(n.includes('ModalConfirmacao'))return{default:'modal'};if(n==='./ListingQuality')return{default:'quality'};if(n==='./ListingEditor')return{default:'editor'};
  if(n==='./product-link-request')return{loadProductListingLink};if(n.endsWith('/live-feed'))return{providerName:p=>p};if(n.endsWith('/product-listing-actions'))return{productListingActions:()=>['close'],productListingActionNames:{close:'Encerrar'}};if(n.endsWith('/integration-contract'))return{marketplaceCapabilities:()=>({listingRead:'api'})};if(n==='./account-identification')return{accountDisplayName:()=> 'JEFF'};if(n.includes('product-stock-events'))return{notifyProductStockChanged:()=>notified.push(true)};if(n.includes('product-listing-update'))return{productListingUrl};return require(n);
 }});
 const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
 const render=()=>{cursor=0;tree=exported.default(props);return tree};const find=text=>all(tree).find(n=>n.props?.children===text);
 return {props,render,find,requests,busy,updates,notified,unmount:()=>cleanup?.()};
}
test('carregar link mostra espera, ignora clique duplo e não atualiza lista, status ou saldo',async()=>{
 const h=harness();h.render();const button=h.find('Carregar link do anúncio');const first=button.props.onClick();button.props.onClick();await new Promise(setImmediate);h.render();assert.equal(h.requests.length,1);assert.equal(h.find('Carregando link…').props['aria-busy'],true);assert.equal(h.find('Carregando link…').props.disabled,true);assert.deepEqual(h.busy,[]);
 h.requests[0].resolve(response);await first;await new Promise(setImmediate);h.render();assert.equal(h.find('Abrir anúncio no marketplace ↗').props.href,response.permalink);assert.deepEqual(h.updates,[]);assert.deepEqual(h.notified,[]);assert.deepEqual(h.busy,[]);h.unmount();
});
test('falha permite tentar novamente sem marcar alteração incerta; recolher cancela somente a leitura',async()=>{
 const h=harness();h.render();let task=h.find('Carregar link do anúncio').props.onClick();await new Promise(setImmediate);h.requests[0].reject(Error('Sem conexão'));await task;await new Promise(setImmediate);h.render();assert.equal(h.find('Carregar link do anúncio').props.disabled,false);assert.equal(h.find('Encerrar').props.disabled,false);task=h.find('Carregar link do anúncio').props.onClick();await new Promise(setImmediate);h.unmount();await task;await new Promise(setImmediate);assert.equal(h.requests[1].signal.aborted,true);assert.deepEqual(h.updates,[]);assert.deepEqual(h.notified,[]);
});
