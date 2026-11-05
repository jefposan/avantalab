import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as model from '../../app/modules/marketplaces/sales-report.ts';
const source=readFileSync('app/modules/marketplaces/services/sales-report.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const mod={exports:{}};
new Function('require','module','exports',compiled)(name=>name==='server-only'?{}:name==='../sales-report'?model:{MarketplaceError},mod,mod.exports);
const {loadSalesReport}=mod.exports;
function database({online=[],direct=[],failPage=false}={}){
 const calls=[];
 return {calls,from(table){const call={table,filters:[],range:null};calls.push(call);const q={
  select(columns){call.columns=columns;return q;},eq(k,v){call.filters.push(['eq',k,v]);return q;},in(k,v){call.filters.push(['in',k,v]);return q;},gte(k,v){call.filters.push(['gte',k,v]);return q;},lt(k,v){call.filters.push(['lt',k,v]);return q;},order(){return q;},range(a,b){call.range=[a,b];return q;},abortSignal(){return q;},
  then(resolve,reject){let data=table==='marketplace_connections'?[{id:'account-a',provider:'mercado_livre',seller_name:'Adriano'}]:table==='marketplace_warehouses'?[{id:'stock-a',name:'Saldão'}]:table==='marketplace_sales'?online:direct;
   const offset=call.range?.[0]||0;if(call.range)data=data.slice(offset,call.range[1]+1);
   return Promise.resolve({data,error:failPage&&table==='marketplace_sales'&&offset>0?{message:'timeout'}:null}).then(resolve,reject);
  }};return q;}};
}
const row={id:'sale-a',provider:'mercado_livre',connection_id:'account-a',status:'paid',sold_at:'2026-10-20T12:00:00Z',total:100.11,currency:'BRL',items:[{quantity:2}]};
test('lê colunas mínimas por empresa, agrega no servidor e não consulta produtos/marketplaces',async()=>{
 const db=database({online:[row],direct:[{id:'direct-a',warehouse_id:'stock-a',sold_on:'2026-10-20',total_cents:20000,quantity:3,status:'confirmed'}]});
 const report=await loadSalesReport(db,'company-a',2026,{provider:'',accountId:'',warehouseId:''});
 assert.equal(report.months[9].gross,30011);assert.equal(report.months[9].orders,2);assert.equal(report.months[9].pendingCosts,2);
 assert.equal(report.accounts[0].label,'Adriano');assert.equal(report.warehouses.at(-1).value,'unassigned');
 for(const call of db.calls)assert.ok(call.filters.some(([op,k,v])=>op==='eq'&&k==='empresa_id'&&v==='company-a'));
 assert.equal(db.calls.length,4);assert.ok(db.calls.every(c=>!c.columns.includes('*')));
});
test('não retorna total parcial quando segunda página falha',async()=>{
 const db=database({online:Array.from({length:501},(_,i)=>({...row,id:String(i)})),failPage:true});
 await assert.rejects(loadSalesReport(db,'company-a',2026,{provider:'',accountId:'',warehouseId:''}),{code:'report_unavailable'});
 assert.deepEqual(db.calls.filter(c=>c.table==='marketplace_sales').map(c=>c.range),[[0,499],[500,999]]);
});
test('estoque histórico direto não é inferido para pedidos online',async()=>{
 const db=database({online:[row],direct:[{id:'direct-a',warehouse_id:'stock-a',sold_on:'2026-10-20',total_cents:100,quantity:1,status:'confirmed'}]});
 await loadSalesReport(db,'company-a',2026,{provider:'',accountId:'',warehouseId:'stock-a'});
 assert.ok(!db.calls.some(c=>c.table==='marketplace_sales'));
 assert.ok(db.calls.find(c=>c.table==='marketplace_direct_sales').filters.some(([,k,v])=>k==='warehouse_id'&&v==='stock-a'));
});
test('conta/estoque de outra empresa são rejeitados antes de ler vendas',async()=>{
 for(const filters of [{provider:'',accountId:'foreign-account',warehouseId:''},{provider:'',accountId:'',warehouseId:'foreign-stock'},{provider:'magalu',accountId:'account-a',warehouseId:''}]){
  const db=database();await assert.rejects(loadSalesReport(db,'company-a',2026,filters),{code:'invalid_filter'});assert.equal(db.calls.length,2);
 }
});
