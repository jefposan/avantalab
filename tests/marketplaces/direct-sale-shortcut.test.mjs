import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
test('atalho Venda usa o modal existente, preserva produto/estoque, permissão independente e não reabre após fechar/atualizar',()=>{
 const context={actorId:'actor',canSell:true,canWithdraw:false,warehousesReady:true,warehouses:[{id:'saldao',quantity:3}],product:{id:'product'}};
 const states=[context,'',''],refs=[],deps=[];let stateCursor=0,refCursor=0,effectCursor=0,ticket=0,tree;
 const pending=[],permissions=[],busy=[];
 const hooks={useState(initial){const i=stateCursor++;if(!(i in states))states[i]=initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useRef(initial){const i=refCursor++;return refs[i]??={current:initial};},useCallback(fn){return fn;},useEffect(fn,next){const i=effectCursor++;if(!deps[i]||next.some((v,j)=>v!==deps[i][j])){deps[i]=next;pending.push(fn);}}};
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/DirectSaleActions.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,AbortController,AbortSignal,queueMicrotask(fn){fn();},requestAnimationFrame(){return 1;},cancelAnimationFrame(){},window:{addEventListener(){},removeEventListener(){}},require(name){
  if(name==='react')return hooks;
  if(name.includes('BotaoAcaoCompacto'))return{default:'button'};
  if(name.endsWith('.module.css'))return{default:new Proxy({},{get:(_,k)=>k})};
  if(name.includes('direct-sales'))return{DIRECT_SALES_PATH:'/direct'};
  if(name.includes('product-stock-events'))return{PRODUCT_STOCK_CHANGED:'stock'};
  if(name.includes('cores-avanta'))return{corTextoSobreFundo(){return'#fff';}};
  if(name.includes('formatters'))return{};
  if(name.includes('price-settings'))return{};
  if(name.includes('CardExpandidoModal')||name.includes('CampoData')||name.includes('useDirectSaleCommand')||name.includes('DirectSalesHistory'))return{default:'mock'};
  return require(name);
 }});
 const report=allowed=>permissions.push(allowed),reportBusy=v=>busy.push(v),request=async()=>context,trigger={current:{isConnected:true,focus(){}}},acknowledge=()=>{ticket=0;};
 function render(){stateCursor=refCursor=effectCursor=0;tree=exports.default({companyId:'company',productId:'product',initialWarehouseId:'saldao',request,saleRequest:ticket,saleTriggerRef:trigger,onSaleAccessLoaded:report,onSaleRequestHandled:acknowledge,onBusyChange:reportBusy,compactSale:true});const queue=pending.splice(0);queue.forEach(fn=>fn());}
 function all(n){return Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];}
 const form=()=>all(tree).find(n=>typeof n.type==='function'&&n.type.name==='DirectSaleForm');
 render();assert.equal(form(),undefined);assert.equal(permissions.at(-1),true);
 ticket=1;render();render();assert.equal(ticket,0,'solicitação consumida não sobrevive à remontagem após atualizar saldo');assert.equal(form().props.context.product.id,'product');assert.equal(form().props.initialWarehouseId,'saldao');assert.equal(form().props.mode,'sell');
 form().props.onClose();render();assert.equal(form(),undefined);
 states[0]={...context};render();assert.equal(form(),undefined,'consulta de contexto não reabre venda encerrada');
 ticket=2;render();render();assert.ok(form());form().props.onClose();render();
 states[0]={...context,canSell:false};render();assert.equal(permissions.at(-1),false);
 ticket=3;render();render();assert.equal(form(),undefined);assert.match(states[1],/permissão/);
 states[0]=context;states[1]='';render();ticket=1;render();render();assert.ok(form(),'novo clique abre novamente após consumir o anterior');
 form().props.onClose();render();
 for(const quantity of [null,0]){
  states[0]={...context,warehouses:[{id:'saldao',quantity},{id:'online',quantity:0}]};states[1]='';render();
  assert.equal(permissions.at(-1),false,'sem saldo, a permissão não habilita o atalho');
  ticket=2;render();render();assert.equal(form(),undefined);assert.match(states[1],/sem saldo/);
 }
 states[0]={...context,warehouses:[{id:'saldao',quantity:1},{id:'online',quantity:0}]};states[1]='';render();
 assert.equal(permissions.at(-1),true);ticket=3;render();render();assert.ok(form(),'saldo somente offline também habilita venda');
 assert.ok(busy.includes(true));assert.ok(busy.includes(false));
});
