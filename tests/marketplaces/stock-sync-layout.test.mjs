import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../../app/modules/marketplaces/stock-reconciliation.ts';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function harness(quantity=0){
 const values=[],calls=[];let index=0;
 const hooks={useState(initial){const i=index++;if(!(i in values))values[i]=initial;return[values[i],v=>values[i]=typeof v==='function'?v(values[i]):v];},useEffect(){},useRef:v=>({current:v})};
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/StockSync.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(n){
  if(n==='react')return hooks;
  if(n.endsWith('.module.css'))return{default:new Proxy({},{get:(_,k)=>k})};
  if(n.includes('BotaoAcaoCompacto'))return{default:'button'};
  if(n.includes('useDirectSaleCommand'))return{default:()=>({saving:false,pending:null,error:'',run:async payload=>{calls.push(payload);return false;}})};
  if(n.includes('stock-reconciliation'))return model;
  if(n==='./DirectSaleActions')return{DirectDialog:'dialog'};
  if(n.endsWith('/Icon'))return{Icon:'icon'};
  return require(n);
 }});
 const context={actorId:'actor',productId:'product',name:'Produto de teste',localQuantity:quantity,canManage:true,reviewId:'review',sources:Array.from({length:7},(_,i)=>({id:`link-${i}`,account:`Conta ${i}`,listingId:`MLB${i}`,provider:'mercado_livre',quantity:2,eligible:true,status:'active'}))};
 const render=()=>{index=0;return exports.StockSyncForm({companyId:'company',context,request(){throw Error('sem rede');},onClose(){},onReview(){}});};
 const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
 const find=(tree,fn)=>{const n=all(tree).find(fn);assert.ok(n);return n;};
 return{render,all,find,calls,context};
}
test('modal separa saldos e ajuste, pagina anúncios sem reduzir a validação e mantém opções na primeira etapa',()=>{
 const h=harness();let tree=h.render();
 assert.ok(h.find(tree,n=>n.props?.className==='layout'));
 assert.equal(h.all(tree).filter(n=>n.props?.className==='source').length,3);
 h.find(tree,n=>n.type==='button'&&n.props.children==='Próxima').props.onClick();tree=h.render();
 assert.ok(h.all(tree).some(n=>n.props?.children==='Conta 3'));
 assert.equal(h.context.sources.length,7);assert.equal(h.calls.length,0);
 h.find(tree,n=>n.type==='button'&&n.props.children==='Continuar').props.onClick();tree=h.render();
 assert.equal(h.all(tree).some(n=>n.type==='fieldset'),false);
 assert.ok(h.find(tree,n=>n.props?.['aria-label']==='Revisar alteração'));
 assert.equal(h.find(tree,n=>n.type==='button'&&n.props.children==='Confirmar sincronização').props.disabled,true);
 h.find(tree,n=>n.type==='button'&&n.props.children==='Alterar direção').props.onClick();tree=h.render();
 assert.ok(h.find(tree,n=>n.type==='fieldset'));assert.equal(h.calls.length,0);
});
test('confirmação zero mantém duas autorizações antes de qualquer gravação',()=>{
 const h=harness();let tree=h.render();h.find(tree,n=>n.props?.children==='Continuar').props.onClick();tree=h.render();
 const checks=h.all(tree).filter(n=>n.type==='input'&&n.props.type==='checkbox');assert.equal(checks.length,2);
 checks[0].props.onChange({target:{checked:true}});tree=h.render();
 assert.equal(h.find(tree,n=>n.props?.children==='Confirmar sincronização').props.disabled,true);
 checks[1].props.onChange({target:{checked:true}});tree=h.render();
 assert.equal(h.find(tree,n=>n.props?.children==='Confirmar sincronização').props.disabled,false);
 assert.equal(h.calls.length,0);
});
