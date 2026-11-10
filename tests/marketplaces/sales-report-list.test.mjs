import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as model from '../../app/modules/marketplaces/sales-report.ts';
import {toCents} from '../../app/modules/marketplaces/sales-financial.ts';
import {monthlySaleStatus} from '../../app/modules/marketplaces/sales-report-list.ts';
const source=ts.transpileModule(readFileSync('app/modules/marketplaces/services/sales-report-list.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
const mod={exports:{}};
new Function('require','module','exports',source)(name=>{
 if(name==='server-only')return{};
 if(name==='../sales-report')return model;
 if(name==='../sales-financial')return{toCents};
 if(name==='./sales-financial')return{readStoredFinancial:async(_db,_company,ids)=>new Map(ids.map(id=>[id,{revision:'revision',value:{fees:100,freight:200,net:700,adjustments:0}}])),sameFinancialRevision:(stored,revision)=>stored?.revision===revision?stored:undefined};
 if(name==='./management-access')return{MarketplaceError};
 if(name==='./listing-model')return{objectValue:v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{}};
 if(name==='./sales-report')return{loadReportOptions:async(_db,company,filters)=>{assert.equal(company,'company');if(filters.accountId==='foreign')throw new MarketplaceError(400,'invalid_filter','Inválido');return{accounts:[{value:'account',label:'Adriano',provider:'mercado_livre'}],warehouses:[{value:'stock',label:'Saldão'}]};}};
 throw Error(name);
},mod,mod.exports);
const {loadMonthlySales}=mod.exports;
const filters={provider:'',accountId:'',warehouseId:''};
const online=(id,status='paid',date='2026-10-10T12:00:00Z')=>({id,empresa_id:'company',connection_id:'account',provider_order_id:id,provider:'mercado_livre',status,updated_at:'revision',snapshot:{soldAt:date,total:10,currency:'BRL',items:[{title:'Produto',quantity:1,unitPrice:10}],buyer:'Never expose'}});
const direct={id:'direct',empresa_id:'company',warehouse_id:'stock',warehouse_name:'Saldão',product_name:'Produto direto',quantity:2,total_cents:5000,unit_price_cents:2500,sold_on:'2026-10-20',status:'confirmed',updated_at:'revision'};
function database(onlineRows=[],directRows=[],fail=false){
 const calls=[];return{calls,from(table){const predicates=[],call={table,scope:false};calls.push(call);let range=[0,499];const value=(r,k)=>k==='snapshot->>soldAt'?r.snapshot.soldAt:r[k];
 const q={select(){return q;},eq(k,v){if(k==='empresa_id'&&v==='company')call.scope=true;predicates.push(r=>value(r,k)===v);return q;},in(k,values){predicates.push(r=>values.includes(value(r,k)));return q;},gte(k,v){predicates.push(r=>value(r,k)>=v);return q;},lt(k,v){predicates.push(r=>value(r,k)<v);return q;},order(){return q;},range(a,b){range=[a,b];return q;},abortSignal(){return q;},then(resolve,reject){assert.ok(call.scope);const all=table==='marketplace_sales'?onlineRows:directRows;return Promise.resolve({data:all.filter(r=>predicates.every(fn=>fn(r))).slice(range[0],range[1]+1),error:fail?{}:null}).then(resolve,reject);}};return q;}};
}
test('lista inclui canceladas/estornadas, totaliza só confirmadas e não revela comprador',async()=>{
 const db=database([online('1'),online('2','cancelled'),online('3','partially_refunded')],[direct]);
 const data=await loadMonthlySales(db,'company',2026,10,filters,1);
 assert.equal(data.total,4);assert.equal(data.confirmedOrders,2);assert.equal(data.confirmedGross,6000);
 assert.equal(data.rows.find(r=>r.id==='2').included,false);assert.equal(data.rows.find(r=>r.id==='2').financial,null);assert.equal(data.rows.find(r=>r.id==='1').financial.net,700);assert.equal(data.rows.find(r=>r.id==='direct').warehouse,'Saldão');
 assert.ok(!JSON.stringify(data).includes('Never expose'));assert.ok(!JSON.stringify(data).includes('snapshot'));
 assert.equal(monthlySaleStatus('cancelled'),'Cancelada');assert.equal(monthlySaleStatus('partially_refunded'),'Estorno parcial');
});
test('paginação não confunde subtotal da página com total do mês',async()=>{
 const db=database(Array.from({length:37},(_,i)=>online(String(i),i<30?'paid':'cancelled')));
 const data=await loadMonthlySales(db,'company',2026,10,filters,2);
 assert.equal(data.rows.length,12);assert.equal(data.total,37);assert.equal(data.confirmedOrders,30);assert.equal(data.confirmedGross,30000);assert.equal(data.pageSize,25);
});
test('mês segue São Paulo; filtros de origem, conta e marketplace continuam isolados',async()=>{
 const db=database([online('1','paid','2026-11-01T01:00:00Z'),online('2','paid','2026-11-01T03:00:00Z'),{...online('3'),empresa_id:'foreign'}],[direct]);
 const october=await loadMonthlySales(db,'company',2026,10,{...filters,warehouseId:'unassigned'},1);
 assert.deepEqual(october.rows.map(r=>r.id),['1']);assert.equal(db.calls.length,1);
 const physical=await loadMonthlySales(db,'company',2026,10,{...filters,warehouseId:'stock'},1);assert.deepEqual(physical.rows.map(r=>r.id),['direct']);
 const account=await loadMonthlySales(db,'company',2026,10,{...filters,accountId:'account'},1);assert.equal(account.rows.length,1);assert.equal(account.rows[0].account,'Adriano');
});
test('falha de consulta rejeita a lista e conta estrangeira não consulta vendas',async()=>{
 await assert.rejects(loadMonthlySales(database([],[],true),'company',2026,10,filters,1),{code:'report_list_unavailable'});
 const db=database();await assert.rejects(loadMonthlySales(db,'company',2026,10,{...filters,accountId:'foreign'},1),{code:'invalid_filter'});assert.equal(db.calls.length,0);
});
