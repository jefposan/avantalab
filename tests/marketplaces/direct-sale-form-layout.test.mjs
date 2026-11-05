import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
test('formulário de venda separa nome do estoque e saldo, atualiza disponível ao trocar e mantém confirmação',async()=>{
 const context={actorId:'actor',canSell:true,warehousesReady:true,product:{id:'product',name:'Produto',ean:'123',referenceCents:20000},percentages:{minimum:50,medium:70,ideal:90},warehouses:[{id:'saldao',name:'Saldão',quantity:3,revision:1},{id:'online',name:'Online',quantity:7,revision:2}]};
 const states=[],refs=[],writes=[];let cursor=0,refCursor=0,tree;
 const hooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useRef(initial){return refs[refCursor++]??={current:initial};},useEffect(){}};
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/DirectSaleActions.tsx','utf8')+'\nexports.TestForm=DirectSaleForm;', {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,requestAnimationFrame(){},require(name){
  if(name==='react')return hooks;
  if(name.includes('useDirectSaleCommand'))return{default:()=>({pending:null,saving:false,error:'',run:async p=>{writes.push(p);return true;}})};
  if(name.includes('BotaoAcaoCompacto'))return{default:'button'};
  if(name.endsWith('.module.css'))return{default:new Proxy({},{get:(_,k)=>k})};
  if(name.includes('direct-sales'))return{saleToday:()=> '2026-10-20',validSoldOn:()=>true,WITHDRAW_REASONS:{damage:'Avaria'}};
  if(name.includes('price-settings'))return{suggestedPriceCents:()=>({minimum:10000,medium:14000,ideal:18000})};
  if(name.includes('formatters'))return{formatarMoedaDigitada:value=>value};
  if(name.includes('cores-avanta')||name.includes('product-stock-events'))return{};
  if(name.includes('CardExpandidoModal')||name.includes('CampoData')||name.includes('DirectSalesHistory'))return{default:'mock'};
  return require(name);
 }});
 const props={companyId:'company',context,initialWarehouseId:'saldao',mode:'sell',request(){},onClose(){},onSaved(){}};
 function render(){cursor=refCursor=0;tree=exports.TestForm(props);}
 function all(n){return Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];}
 const text=n=>typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(' '):n?.props?text(n.props.children):'';
 const find=fn=>{const n=all(tree).find(fn);assert.ok(n);return n;};
 render();
 assert.deepEqual(all(tree).filter(n=>n.type==='option').map(n=>n.props.children),['Saldão','Online']);
 const balance=()=>find(n=>n.props?.className==='availableBalance');
 assert.equal(text(balance()),'Saldo disponível 3 unidades');
 const select=()=>find(n=>n.type==='select');
 assert.equal(select().props['aria-describedby'],'direct-balance-product');
 select().props.onChange({target:{value:'online'}});render();assert.equal(text(balance()),'Saldo disponível 7 unidades');
 context.warehouses[1].quantity=null;render();assert.equal(text(balance()),'Saldo disponível 0 unidades');
 context.warehouses[1].quantity=0;render();assert.equal(text(balance()),'Saldo disponível 0 unidades');
 context.warehouses[1].quantity=7;
 find(n=>n.type==='input'&&n.props.inputMode==='decimal').props.onChange({target:{value:'14000'}});render();
 await find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(writes.length,1);assert.equal(writes[0].warehouseId,'online');assert.equal(writes[0].quantity,1);assert.equal(writes[0].unitPriceCents,14000);
 states.length=refs.length=0;context.warehouses[1].quantity=0;context.warehouses[1].is_online=true;props.initialWarehouseId='online';render();
 assert.equal(select().props.value,'saldao','abre no estoque com saldo quando o Online está zerado');
});
