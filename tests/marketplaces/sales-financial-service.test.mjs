import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as model from '../../app/modules/marketplaces/sales-financial.ts';
import {reportPeriod} from '../../app/modules/marketplaces/sales-report.ts';
class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const objectValue=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const compiled=ts.transpileModule(readFileSync('app/modules/marketplaces/services/sales-financial.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function fixture({seller='123',orderSeller='123',cost=12,missingCost=false,rowsCount=1,company='company-a',stored=new Map()}={}){
 const rows=Array.from({length:rowsCount},(_,i)=>({id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,provider:'mercado_livre',connection_id:'account-a',provider_order_id:String(2000000000000000+i),status:'paid',updated_at:'2026-10-10',snapshot:{soldAt:'2026-10-10T12:00:00Z',total:100,currency:'BRL',providerUpdatedAt:'2026-10-10'}}));
 const calls=[],db={rpc(name,args){return{abortSignal:async()=>{
   if(name==='marketplace_read_sale_financial'){
     const data=rows.filter(row=>args.p_sales.includes(row.id)).flatMap(row=>{
       const saved=stored.get(row.id);
       return saved?.source===row.snapshot.providerUpdatedAt?[{...saved,revision:row.updated_at}]:[];
     });
     return {data,error:null};
   }
   assert.equal(name,'marketplace_save_sale_financial');assert.equal(args.p_empresa,company);
   const row=rows.find(row=>row.id===args.p_sale);
   stored.set(args.p_sale,{sale_id:args.p_sale,source:row.snapshot.providerUpdatedAt,fees:args.p_fees,
     freight:args.p_freight,net:args.p_net,adjustments:args.p_adjustments,issue:args.p_issue,next_attempt_at:new Date(Date.now()+60000).toISOString()});
   return {data:true,error:null};
 }};},from(table){const filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},in(){return q;},gte(){return q;},lt(){return q;},gt(k,v){filters.push([k,v]);return q;},order(){return q;},limit(){return q;},abortSignal(){return q;},then(resolve,reject){assert.equal(table,'marketplace_sales');assert.ok(filters.some(([k,v])=>k==='empresa_id'&&v===company));return Promise.resolve({data:rows,error:null}).then(resolve,reject);}};return q;}};
 const mod={exports:{}};
 new Function('require','module','exports',compiled)(name=>{
  if(name==='server-only')return{};
  if(name==='../sales-financial')return model;
  if(name==='../sales-report')return{reportPeriod};
  if(name==='./management-access')return{MarketplaceError};
  if(name==='./listing-model')return{objectValue,uuidIsValid:v=>/^[a-f0-9-]{36}$/.test(v)};
  if(name==='./mercadolivre-management')return{loadConnection:async(_db,c,id)=>{assert.equal(c,company);assert.equal(id,'account-a');return{seller_reference:seller};},mlRequest:async(_db,_connection,path)=>{
   calls.push(path);
   if(path.startsWith('/orders/'))return{id:path.split('/').at(-1),seller:{id:orderSeller},currency_id:'BRL',status:'paid',total_amount:100,order_items:[{sale_fee:10,quantity:1}],shipping:{id:555}};
   if(path.endsWith('/costs'))return missingCost?{}:{gross_amount:40,receiver:{cost:20},senders:[{user_id:seller,cost}]};
   if(path.endsWith('/items'))return[{order_id:rows[0].provider_order_id}];
   throw Error('unexpected_path');
  }};
  return{};
 },mod,mod.exports);
 return{db,calls,load:()=>mod.exports.loadFinancialBatch(db,company,2026,{provider:'',accountId:'',warehouseId:''},''),rows};
}
test('consulta pedido, comissão e frete reais; reabre o relatório em nova instância sem repetir chamadas',async()=>{
 const stored=new Map(),f=fixture({stored}),a=await f.load();assert.equal(a.months[9].fees,1000);assert.equal(a.months[9].freight,1200);assert.equal(a.months[9].net,7800);assert.equal(a.months[9].netOrders,1);
 assert.equal(f.calls.length,3);const reopened=fixture({stored});assert.equal((await reopened.load()).months[9].net,7800);assert.equal(reopened.calls.length,0);
});
test('resposta de outro vendedor não entra nos valores nem libera frete',async()=>{
 const f=fixture({orderSeller:'foreign'}),a=await f.load();assert.equal(a.months[9].feeOrders,0);assert.equal(a.months[9].netOrders,0);assert.equal(f.calls.length,1);assert.ok(a.issues.length);
});
test('frete indisponível preserva comissão confirmada sem fabricar líquido',async()=>{
 const f=fixture({missingCost:true}),a=await f.load();assert.equal(a.months[9].fees,1000);assert.equal(a.months[9].feeOrders,1);assert.equal(a.months[9].freightOrders,0);assert.equal(a.months[9].netOrders,0);
});
test('cursor limita o lote a três pedidos; cache isolado por empresa',async()=>{
 const f=fixture({rowsCount:4}),a=await f.load();assert.equal(a.cursor,f.rows[2].id);assert.equal(a.months[9].feeOrders,3);
 const other=fixture({company:'company-b',cost:1}),b=await other.load();assert.equal(b.months[9].freight,100);assert.equal(other.calls.length,3);
});

test('regravação local sem alteração do pedido não invalida os custos reais em cache',async()=>{
 const f=fixture();await f.load();assert.equal(f.calls.length,3);
 f.rows[0].updated_at='2026-10-27T12:00:00Z';const result=await f.load();
 assert.equal(f.calls.length,3);assert.equal(result.months[9].net,7800);assert.equal(result.entries[0].revision,'2026-10-27T12:00:00Z');
 f.rows[0].snapshot.providerUpdatedAt='2026-10-27T12:01:00Z';await f.load();assert.equal(f.calls.length,6);
});
