import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return{url:'data:text/javascript,export {};',shortCircuit:true};
 if(specifier==='./mercadolivre-management')return{url:'data:text/javascript,export async function mlRequest(db,c,path){return db.read(path);} export async function saveListing(db,c,item){if(!db.tables.marketplace_product_links.some(r=>r.provider_listing_id===item.id&&r.source_snapshot?.relationEvidence))throw Error("import_before_proof");db.saved.push(item.id);}',shortCircuit:true};
 if(specifier==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.code=code;}}',shortCircuit:true};
 if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:')){const file=resolve(dirname(new URL(context.parentURL).pathname),specifier);if(existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,context);}
 return next(specifier,context);
}});
const {resolveSaleListingLink,sameRemoteStockProduct}=await import('../../app/modules/marketplaces/services/sale-listing-link.ts');hooks.deregister();
const connection={id:'account',empresa_id:'company',seller_reference:'123'};
const item=(id)=>({id,seller_id:123,user_product_id:'MLBU123456',variations:[],status:'paused',available_quantity:0,title:'Panificadora'});
function fixture(){
 const db={saved:[],calls:[],inserts:0,items:{MLB123456:item('MLB123456'),MLB654321:item('MLB654321')},
  tables:{marketplace_product_links:[{empresa_id:'company',connection_id:'account',provider:'mercado_livre',provider_listing_id:'MLB123456',product_id:'product'}],marketplace_products:[{id:'product',empresa_id:'company',archived_at:null,stock_quantity:2}]},
  async read(path){this.calls.push(path);if(path.startsWith('/items/'))return this.items[path.slice(7)];return this.search||{results:['MLB123456','MLB654321'],paging:{total:2}};},
  from(table){const filters=[];let one=false,insert,update;const q={select(){return q;},update(v){update=v;return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},is(k,v){return q.eq(k,v);},in(k,v){filters.push(r=>v.includes(r[k]));return q;},maybeSingle(){one=true;return q;},upsert(row,opts){assert.equal(opts.ignoreDuplicates,true);insert=row;return q;},then(ok,bad){return Promise.resolve().then(()=>{
   if(db.fail===table)return{error:{},data:null};
   const rows=db.tables[table];if(insert){db.inserts++;if(db.race)rows.push({...insert,product_id:'other'});if(!rows.some(r=>r.connection_id===insert.connection_id&&r.provider_listing_id===insert.provider_listing_id))rows.push(insert);}
   const found=rows.filter(r=>filters.every(f=>f(r)));if(update)for(const row of found)Object.assign(row,update);return{error:null,data:one?found[0]||null:found};
  }).then(ok,bad);}};return q;}};return db;
}
test('vínculo por identidade ML preserva saldo e conserva evidência; repetição não duplica',async()=>{
 const db=fixture();assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),true);
 assert.equal(db.tables.marketplace_product_links.length,2);assert.equal(db.tables.marketplace_products[0].stock_quantity,2);
 assert.equal(db.tables.marketplace_product_links[1].source_snapshot.relationEvidence.anchorListingId,'MLB123456');
 const calls=db.calls.length;assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),true);assert.equal(db.calls.length,calls);assert.equal(db.inserts,1);
});
test('mesmo nome não basta: outra conta, UP distinto ou variações impedem vínculo',async()=>{
 for(const patch of [{seller_id:456},{user_product_id:'MLBU999999'},{variations:[{id:1}]},{variations:undefined}]){const db=fixture();Object.assign(db.items.MLB123456,patch);assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),false);assert.equal(db.inserts,0);}
 assert.equal(sameRemoteStockProduct(item('MLB123456'),item('MLB654321'),'123'),true);
});
test('busca incompleta, duplicada, inválida ou sem o anúncio não vincula',async()=>{
 for(const search of [{results:['MLB123456','MLB654321'],paging:{total:3}},{results:['MLB123456','MLB123456'],paging:{total:2}},{results:['bad','MLB654321'],paging:{total:2}},{results:['MLB123456'],paging:{total:1}}]){const db=fixture();db.search=search;assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),false);assert.equal(db.inserts,0);}
});
test('conflito entre cadastros e produto arquivado impedem vínculo',async()=>{
 const db=fixture();db.tables.marketplace_products[0].archived_at='now';assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),false);
 const other=fixture();other.search={results:['MLB123456','MLB654321','MLB999999'],paging:{total:3}};other.tables.marketplace_product_links.push({...other.tables.marketplace_product_links[0],provider_listing_id:'MLB999999',product_id:'other'});assert.equal(await resolveSaleListingLink(other,connection,'MLB654321'),false);assert.equal(other.inserts,0);
});
test('conflito concorrente não é sobrescrito e falha de banco não aparenta sucesso',async()=>{
 const db=fixture();db.race=true;assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),false);assert.equal(db.tables.marketplace_product_links[1].product_id,'other');
 const failed=fixture();failed.fail='marketplace_products';await assert.rejects(resolveSaleListingLink(failed,connection,'MLB654321'),/cadastro/);assert.equal(failed.inserts,0);
});
test('limite de tempo impede consultas e não cria vínculo',async()=>{const db=fixture();await assert.rejects(resolveSaleListingLink(db,connection,'MLB654321',Date.now()),/conferência/);assert.equal(db.inserts,0);assert.equal(db.calls.length,0);});
test('catálogo legado exige relação recíproca de estoque, sem variação',async()=>{
 const db=fixture();delete db.items.MLB123456.user_product_id;delete db.items.MLB654321.user_product_id;
 db.items.MLB123456.item_relations=[{id:'MLB654321',variation_id:null,stock_relation:1}];db.items.MLB654321.item_relations=[{id:'MLB123456',variation_id:null,stock_relation:1}];
 assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),true);assert.equal(db.tables.marketplace_product_links[1].source_snapshot.relationEvidence.model,'catalog_stock_relation');
 for(const patch of [{item_relations:[]},{item_relations:[{id:'MLB654321',stock_relation:0}]},{item_relations:[{id:'MLB654321',stock_relation:1,variation_id:42}]}]){const other=fixture();delete other.items.MLB654321.user_product_id;other.items.MLB654321.item_relations=[{id:'MLB123456',stock_relation:1}];Object.assign(other.items.MLB123456,patch);assert.equal(await resolveSaleListingLink(other,connection,'MLB654321'),false);}
});
test('vínculo importado é conferido sem remapear nem apagar metadados; prova precede trigger',async()=>{
 const db=fixture();db.tables.marketplace_product_links.push({...db.tables.marketplace_product_links[0],provider_listing_id:'MLB654321',source_snapshot:{local_registration_preserved:false,condition:'new'},updated_at:'stamp'});
 assert.equal(await resolveSaleListingLink(db,connection,'MLB654321'),true);
 const snapshot=db.tables.marketplace_product_links[1].source_snapshot;assert.equal(snapshot.condition,'new');assert.equal(snapshot.relationEvidence.anchorListingId,'MLB123456');assert.deepEqual(db.saved,['MLB654321']);assert.equal(db.tables.marketplace_products[0].stock_quantity,2);
});
