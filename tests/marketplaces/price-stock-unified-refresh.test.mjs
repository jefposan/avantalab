import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as model from '../../app/modules/marketplaces/stock-reconciliation.ts';
import {priceStockState} from '../../app/modules/marketplaces/price-stock-state.ts';
const require=createRequire(import.meta.url);
function fixture(remote=2,fail=false,linked=1,refreshContainer=null){
 const states=[],refs=[],effects=[],calls=[];let cursor=0,refCursor=0,first=true;
 const stock={productId:'p',quantity:2,confirmed:true,revision:1,canManage:true,syncLinkedCount:linked};
 const hooks={useState(v){const i=cursor++;if(!(i in states))states[i]=v;return[states[i],v=>states[i]=typeof v==='function'?v(states[i]):v];},useRef(v){return refs[refCursor++]||=( {current:v});},useEffect(fn){if(first)effects.push(fn);},useCallback:fn=>fn};
 const exports={};vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/PriceProductStock.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,AbortController,AbortSignal,window:{addEventListener(){},removeEventListener(){}},require(n){
 if(n==='react-dom')return{createPortal:(children,target)=>({type:'portal',props:{children,target}})};if(n==='react')return hooks;if(n.includes('stock-reconciliation'))return model;if(n.includes('price-stock-state'))return{priceStockState};if(n.includes('StockSync'))return{StockSyncDialog:'sync-dialog'};if(n.includes('BotaoAcaoCompacto'))return{default:'button'};if(n.includes('product-stock-events'))return{notifyProductStockChanged(){}};if(n.includes('product-internal-notes'))return{PRODUCT_INTERNAL_NOTES_LIMIT:160};if(n.includes('direct-sales'))return{DIRECT_SALES_CHANGED:'changed'};if(n.endsWith('.module.css'))return{default:{}};if(n.startsWith('.')||n.startsWith('@/'))return{default:'mock'};return require(n);
 }});
 const request=async(path,options)=>{const body=JSON.parse(options.body);calls.push({path,...body});if(body.action==='review'){if(fail)throw Error('Falha na conta');return{productId:'p',localQuantity:2,revision:1,pending:false,sources:[{quantity:remote,eligible:true,status:'active'}]};}return{stock:{...stock}};};
 let tree;const render=()=>{cursor=refCursor=0;const node=exports.default({companyId:'c',productId:'p',compactSummary:true,refreshContainer,request});tree=node.type(node.props);first=false;};
 const all=n=>Array.isArray(n)?n.flatMap(all):n&&typeof n==='object'?[n,...all(n.props?.children)]:[];
 return{calls,render,all:()=>all(tree),async init(){render();effects.forEach(fn=>fn());await new Promise(r=>setImmediate(r));render();},async click(){await this.all().find(n=>n.props?.['aria-label']==='Sincronizar e atualizar saldos').props.onClick();await new Promise(r=>setImmediate(r));render();}};
}
test('botão único consulta marketplace e relê saldo sem aplicar quantidades quando iguais',async()=>{const f=fixture();await f.init();await f.click();assert.deepEqual(f.calls.map(c=>c.action),['context','review','context']);assert.ok(!f.all().some(n=>n.type==='sync-dialog'));assert.ok(f.all().some(n=>n.props?.role==='status'&&n.props.children==='Saldos atualizados.'));});
test('divergência abre confirmação e nenhuma quantidade é enviada automaticamente',async()=>{const f=fixture(1);await f.init();await f.click();assert.ok(f.all().some(n=>n.type==='sync-dialog'));assert.ok(!f.calls.some(c=>c.action==='apply'));});
test('falha remota preserva saldo e informa erro sem anunciar atualização concluída',async()=>{const f=fixture(2,true);await f.init();await f.click();assert.ok(f.all().some(n=>n.props?.role==='alert'));assert.ok(!f.all().some(n=>n.props?.children==='Saldos atualizados.'));assert.ok(!f.calls.some(c=>c.action==='apply'));});
test('produto sem anúncios atualiza somente saldo local',async()=>{const f=fixture(2,false,0);await f.init();await f.click();assert.ok(!f.calls.some(c=>c.action==='review'));});

test('controle único é renderizado no destino externo mantendo a ação de sincronizar',async()=>{const target={id:'navigation-refresh'};const f=fixture(2,false,1,target);await f.init();assert.equal(f.all().filter(n=>n.type==='portal').length,1);assert.equal(f.all().find(n=>n.type==='portal').props.target,target);assert.equal(f.all().filter(n=>n.props?.['aria-label']==='Sincronizar e atualizar saldos').length,1);await f.click();assert.deepEqual(f.calls.map(c=>c.action),['context','review','context']);});
