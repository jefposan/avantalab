import test from 'node:test';import assert from 'node:assert/strict';import{registerHooks}from'node:module';import{resolve,dirname}from'node:path';import{pathToFileURL}from'node:url';import{existsSync}from'node:fs';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
 if(s==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{}',shortCircuit:true};
 if(s==='./local-products')return{url:'data:text/javascript,export const getLocalProduct=()=>{throw Error("not used")}',shortCircuit:true};
 if(s==='./mercadolivre-management')return{url:'data:text/javascript,export async function loadConnection(db,company,id){if(company!==db.company||id!==db.connection.id)throw Error("Conta incorreta");return db.connection;} export async function mlRequest(db,c,path){return db.read(path)}',shortCircuit:true};
 let p;if(s.startsWith('@/'))p=resolve(root,s.slice(2));else if(s.startsWith('.')&&c.parentURL?.startsWith('file:'))p=resolve(dirname(new URL(c.parentURL).pathname),s);if(p&&existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,c);return next(s,c);
}});
const{readStockSource}=await import('../../app/modules/marketplaces/services/stock-reconciliation.ts');hooks.deregister();
function fixture(){
 const db={company:'company',connection:{id:'account',seller_reference:'123',seller_name:'Conta A'},item:{id:'MLB123456',seller_id:123,user_product_id:'MLBU123',available_quantity:2,status:'active',sub_status:[],variations:[],shipping:{}},stock:{user_id:123,locations:[{type:'selling_address',quantity:2}]},associated:{results:['MLB123456'],paging:{total:1}},rows:[{empresa_id:'company',connection_id:'account',provider_listing_id:'MLB123456',product_id:'product'}],calls:[],from(){const filters=[];const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,v){filters.push(r=>v.includes(r[k]));return q},limit(){return q},then(ok,bad){return Promise.resolve({data:db.rows.filter(r=>filters.every(f=>f(r))),error:db.failDatabase?{}:null}).then(ok,bad)}};return q},async read(path){db.calls.push(path);if(db.fail)throw Error('Consulta negada');if(path==='/items/MLB123456')return db.item;if(path==='/users/123')return{id:123,tags:db.tags||[]};if(path==='/user-products/MLBU123/stock')return db.stock;if(path.startsWith('/users/123/items/search?'))return db.associated;throw Error('unexpected request')}};
 const link={id:'link',product_id:'product',connection_id:'account',provider:'mercado_livre',provider_listing_id:'MLB123456'};return{db,link,read:()=>readStockSource(db,'company',link)};
}
test('User Product de origem única é elegível; contas vinculadas não são bloqueadas apenas pelo modelo',async()=>{
 const f=fixture();const s=await f.read();assert.equal(s.eligible,true);assert.equal(s.quantity,2);assert.equal(s.account,'Conta A');assert.equal(s.issue,undefined);assert.equal(f.db.calls.length,4);
 f.db.associated={results:['MLB123456','MLB654321'],paging:{total:2}};f.db.rows.push({...f.db.rows[0],provider_listing_id:'MLB654321'});assert.equal((await f.read()).eligible,true);
 f.db.item.status='paused';f.db.item.sub_status=['paused_by_seller'];assert.equal((await f.read()).eligible,true,'saldo pode ser sincronizado sem reativação');
});
test('bloqueia compartilhamento sem vínculo, outra conta, outro cadastro, paginação incompleta e saldo desconhecido',async()=>{
 for(const mutate of [f=>f.db.rows=[],f=>f.db.rows[0].product_id='other',f=>f.db.rows[0].empresa_id='other',f=>f.db.rows[0].connection_id='other',f=>f.db.associated.paging.total=2,f=>f.db.associated.results=['MLB654321'],f=>f.db.associated={results:['MLB123456','MLB123456'],paging:{total:2}},f=>f.db.associated.seller_id=999,f=>f.db.item.available_quantity=null]){const f=fixture();mutate(f);const r=await f.read();assert.equal(r.eligible,false);assert.ok(r.issue);}
});
test('Full, multiorigem, variação, kit, moderação e falhas continuam bloqueados com motivo',async()=>{
 for(const mutate of [f=>f.db.stock.locations=[{type:'seller_warehouse'}],f=>f.db.stock.user_id=999,f=>f.db.item.shipping={logistic_type:'fulfillment'},f=>f.db.item.variations=[{id:1}],f=>f.db.item.tags=['bundle'],f=>{f.db.item.status='paused';f.db.item.sub_status=['held']},f=>f.db.fail=true,f=>f.db.failDatabase=true]){const f=fixture();mutate(f);const r=await f.read();assert.equal(r.eligible,false);assert.ok(r.issue);assert.equal(r.account,'Conta A');}
});
test('anúncio tradicional permanece elegível sem consultas de User Products',async()=>{const f=fixture();delete f.db.item.user_product_id;assert.equal((await f.read()).eligible,true);assert.equal(f.db.calls.length,2);});
