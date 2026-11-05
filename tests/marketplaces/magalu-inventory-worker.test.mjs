import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}',shortCircuit:true};
 if(s==='./magalu-listings')return{url:'data:text/javascript,export async function loadMagaluConnection(db,company,id){if(company!==db.company||id!=="account")throw Error("tenant");return {empresa_id:company,id};}export async function readMagaluListing(db){return structuredClone(db.remote)}export async function saveMagaluListing(db,c,l){db.saved.push(l)}',shortCircuit:true};
 if(s==='./magalu-request')return{url:'data:text/javascript,export async function magaluCatalogRequest(db,c,method,path,body){db.writes.push({method,path,body});if(!db.delayed){if(body.quantity!==undefined)db.remote.listing.stock=body.quantity;if(body.active!==undefined){db.remote.raw.active=body.active;db.remote.listing.status=body.active?"active":"paused";}}return {status:202,data:{trace_id:"test"}};}',shortCircuit:true};
 if(s==='./inventory-product-guard')return{url:'data:text/javascript,export async function stockIncreaseBlocker(db){return db.blocker||null}',shortCircuit:true};
 const p=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(p&&existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,c);return next(s,c);
}});
const {deliverMagaluStockJob}=await import('../../app/modules/marketplaces/services/magalu-inventory.ts');hook.deregister();
class Query{constructor(db,t){this.db=db;this.t=t;this.filters=[];}select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}is(k,v){return this.eq(k,v);}maybeSingle(){this.single=true;return this;}update(v){this.change=v;return this;}upsert(v){this.insert=v;return this;}then(ok,bad){return Promise.resolve().then(()=>{const rows=this.db.tables[this.t]||[];if(this.insert){const old=rows.find(r=>r.link_id===this.insert.link_id);if(old)Object.assign(old,this.insert);else rows.push(this.insert);this.db.tables[this.t]=rows;}const found=rows.filter(r=>this.filters.every(f=>f(r)));if(this.change)for(const row of found)Object.assign(row,this.change);return{data:this.single?structuredClone(found[0]||null):structuredClone(found),error:null};}).then(ok,bad);}}
function fixture(desired=0){const job={link_id:'link',empresa_id:'company',product_id:'product',desired_quantity:desired,revision:2,generation:'generation',allow_increase:true,attempts:0};const out={...job,state:'pending'};const db={company:'company',writes:[],saved:[],remote:{raw:{active:true,fulfillment:false},listing:{id:'SKU1',stock:2,status:'active'}},tables:{marketplace_products:[{id:'product',empresa_id:'company',stock_quantity:desired,revision:2,archived_at:null}],marketplace_inventory_outbox:[out]},from(t){return new Query(this,t);}};return{db,job,out,link:{id:'link',connection_id:'account',provider_listing_id:'SKU1'}};}
test('Magalu não recebe saldo ou pausa enquanto importação aguarda conferência física',async()=>{
 for(const quantity of [0,3]){const f=fixture(quantity);f.db.tables.marketplace_products[0].listing_stock_review_at=new Date().toISOString();await deliverMagaluStockJob(f.db,f.job,f.link);assert.equal(f.out.issue,'import_stock_review');assert.equal(f.db.writes.length,0);}
});
test('202 não confirma saldo nem pausa; releitura confirma os dois sem reativar',async()=>{
 const f=fixture();await deliverMagaluStockJob(f.db,f.job,f.link);assert.equal(f.out.state,'pending');assert.equal(f.out.issue,'magalu_stock_processing');assert.deepEqual(f.db.writes[0].body.quantity,0);
 await deliverMagaluStockJob(f.db,f.job,f.link);assert.equal(f.out.issue,'magalu_pause_processing');assert.equal(f.db.writes[1].body.active,false);
 await deliverMagaluStockJob(f.db,f.job,f.link);assert.equal(f.out.state,'synced');assert.equal(f.db.writes.length,2);assert.equal(f.db.tables.marketplace_listing_stock_control[0].paused_by_system,true);
});
test('saldo indisponível, Fulfillment, revisão alterada ou venda pendente não permitem escrita',async()=>{
 for(const setup of [f=>{f.db.remote.listing.stock=null;},f=>{f.db.remote.raw.fulfillment=true;},f=>{f.db.tables.marketplace_products[0].revision=3;},f=>{f.db.blocker='pending_product_sales';f.job.desired_quantity=4;f.db.tables.marketplace_products[0].stock_quantity=4;}]){const f=fixture();setup(f);await deliverMagaluStockJob(f.db,f.job,f.link);assert.equal(f.out.state,'pending');assert.equal(f.db.writes.length,0);}
});
test('reposição preserva pausa manual e o job de outra geração não é concluído',async()=>{
 const f=fixture(3);f.db.remote.raw.active=false;f.db.remote.listing.status='paused';await deliverMagaluStockJob(f.db,f.job,f.link);await deliverMagaluStockJob(f.db,f.job,f.link);assert.equal(f.out.state,'synced');assert.ok(f.db.writes.every(w=>w.body.active!==true));assert.equal(f.db.tables.marketplace_listing_stock_control,undefined);
 const g=fixture(2);g.out.generation='newer';await deliverMagaluStockJob(g.db,g.job,g.link);assert.equal(g.out.state,'pending');
});
