import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./management-access'||s.endsWith('/management-access.ts'))return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code})}}',shortCircuit:true};
 if(s==='./mercadolivre-management')return{url:'data:text/javascript,export async function loadConnection(db,company,id){if(company!==db.company)throw Error("tenant");return db.connections.find(c=>c.id===id)}export async function mlRequest(db,c,path,method="GET"){if(method!=="GET")throw Error("write");db.calls.push({account:c.id,path});const value=db.remote[c.id+path];if(value instanceof Error)throw value;if(!value)throw Error("unexpected");return structuredClone(value)}',shortCircuit:true};
 const p=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(p&&existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,c);return next(s,c);
}});
const {readShippingLabel}=await import('../../app/modules/marketplaces/services/shipping-label.ts');
const {shippingLabelId}=await import('../../app/modules/marketplaces/shipping-label.ts');
const {MarketplaceError}=await import('../../app/modules/marketplaces/services/management-access.ts');hook.deregister();
const id='48300837943';
test('Ler etiqueta fica antes de Ler EAN no DOM e na navegação, inclusive na prévia',()=>{
 const app=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8');assert.match(app,/className=\{styles.scanActions\}><PriceLabelReader[^\n]+\/><button[^\n]+onClick=\{startEanReading\}/);
 const preview=readFileSync('app/marketplaces/consulta/validacao-etiqueta/preview.tsx','utf8');const actions=preview.slice(preview.indexOf('className={mobile.scanActions}'));assert.ok(actions.indexOf('<strong>Ler etiqueta</strong>')<actions.indexOf('<strong>Ler EAN</strong>'));
});
class Query{constructor(db,t){this.db=db;this.t=t;this.filters=[];}select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}limit(n){this.limitValue=n;return this;}maybeSingle(){this.single=true;return this;}then(ok,bad){return Promise.resolve().then(()=>{assert.ok(this.filters.some(f=>!f({empresa_id:'other'})),'consulta com isolamento');if(this.db.failure===this.t)return{data:null,error:Error('database')};const rows=(this.db.tables[this.t]||[]).filter(r=>this.filters.every(f=>f(r))).slice(0,this.limitValue);return{data:this.single?rows[0]||null:rows,error:null};}).then(ok,bad);}}
function fixture(){const c={id:'account',empresa_id:'company',provider:'mercado_livre',status:'connected',seller_reference:'123'};const db={company:'company',connections:[c],tables:{marketplace_connections:[c,{...c,id:'foreign',empresa_id:'other'}],marketplace_listings:[]},calls:[],remote:{['account/shipments/'+id]:{id,sender_id:123,receiver_address:{secret:'not-exported'}},['account/shipments/'+id+'/items']:[{item_id:'MLB123456',description:'Air Fryer Preto 127V',sender_id:123,quantity:1,order_id:200000000}],['account/items/MLB123456']:{id:'MLB123456',seller_id:123,pictures:[{secure_url:'https://http2.mlstatic.com/photo.jpg'}],price:999}},from(t){assert.ok(['marketplace_sales','marketplace_connections','marketplace_listings'].includes(t),'somente leitura de vendas, contas e anúncios');return new Query(this,t);}};return db;}
test('QR da foto é interpretado localmente sem depender de t nem abrir URLs',()=>{
 assert.equal(shippingLabelId('{"id":"48300837943","t":"opaque"}'),id);assert.equal(shippingLabelId('{"id":48300837943}'),id);
 for(const value of ['48300837943','7898649372113','https://evil.invalid','{"id":"/shipments/48300837943"}','{"id":9007199254740992}','{"id":0}','[]','{"id":"12345"}','x'.repeat(2049),null])assert.equal(shippingLabelId(value),null);
});
test('vendas registradas são encontradas em todas as contas do perfil sem OAuth ativo nem filtro de período',async()=>{
 const db=fixture();db.connections=[];db.tables.marketplace_connections=[];
 const row=(account,title)=>({id:account,empresa_id:'company',provider:'mercado_livre',shipment_id:id,connection_id:account,snapshot:{soldAt:'2025-01-01',shipmentId:id,items:[{title,quantity:1}],inventoryLines:[{title,quantity:1,listingId:'MLB123456'}]}});
 db.tables.marketplace_sales=[row('expired-a','Produto A'),row('expired-b','Produto B')];
 db.tables.marketplace_listings=[{empresa_id:'company',connection_id:'expired-a',provider:'mercado_livre',provider_listing_id:'MLB123456',snapshot:{pictures:['https://http2.mlstatic.com/a.jpg'],ean:'8720389031151'}},{empresa_id:'company',connection_id:'expired-b',provider:'mercado_livre',provider_listing_id:'MLB123456',snapshot:{pictures:['https://http2.mlstatic.com/b.jpg'],ean:'7898649372113'}}];
 db.from=t=>{assert.notEqual(t,'marketplace_connections','não depende da conta selecionada/conectada');return new Query(db,t);};
 assert.deepEqual(await readShippingLabel(db,'company',id),{shipmentId:id,products:[{description:'Produto A',image:'https://http2.mlstatic.com/a.jpg',ean:'8720389031151'},{description:'Produto B',image:'https://http2.mlstatic.com/b.jpg',ean:'7898649372113'}]});assert.equal(db.calls.length,0);
});
test('mesmo código em outro perfil, outro envio ou outra plataforma não revela a venda',async()=>{
 const db=fixture();db.connections=[];db.tables.marketplace_connections=[];const row={id:'sale',empresa_id:'other',provider:'mercado_livre',shipment_id:id,connection_id:'foreign',snapshot:{items:[{title:'Produto privado',quantity:1}]}};
 for(const value of [row,{...row,empresa_id:'company',shipment_id:'99999999999'},{...row,empresa_id:'company',provider:'magalu'}]){db.tables.marketplace_sales=[value];await assert.rejects(readShippingLabel(db,'company',id),e=>e.code==='connect_account');}assert.equal(db.calls.length,0);
});
test('falha da base local não é interpretada como ausência de venda nem dispara pesquisa remota',async()=>{
 const db=fixture();db.failure='marketplace_sales';await assert.rejects(readShippingLabel(db,'company',id),e=>e.code==='label_database');assert.equal(db.calls.length,0);
});
test('registro legado sem ID do anúncio mostra descrição, sem aproximar por nome',async()=>{
 const db=fixture();db.tables.marketplace_sales=[{id:'legacy',empresa_id:'company',provider:'mercado_livre',shipment_id:id,connection_id:'old',snapshot:{items:[{title:'Produto antigo',quantity:1}]}}];
 const result=await readShippingLabel(db,'company',id);assert.deepEqual(result,{shipmentId:id,products:[{description:'Produto antigo',image:null,ean:null}]});assert.equal(db.calls.length,0);
});
test('etiqueta entrega foto, descrição, EAN e código lido, sem preço, destinatário ou efeitos de escrita',async()=>{
 const db=fixture(),r=await readShippingLabel(db,'company',id);assert.deepEqual(r,{shipmentId:id,products:[{description:'Air Fryer Preto 127V',image:'https://http2.mlstatic.com/photo.jpg',ean:null}]});assert.ok(db.calls.every(c=>c.account==='account'));assert.doesNotMatch(JSON.stringify(r),/price|secret|order_id|quantity/);
});
test('EAN vem do GTIN da mesma ficha; SKU ou EAN inválido nunca substituem o código',async()=>{
 const db=fixture(),item=db.remote['account/items/MLB123456'];item.attributes=[{id:'GTIN',value_name:'8720389031151'}];assert.equal((await readShippingLabel(db,'company',id)).products[0].ean,'8720389031151');
 item.attributes=[{id:'SELLER_SKU',value_name:'8720389031151'},{id:'GTIN',value_name:'1234567890123'}];assert.equal((await readShippingLabel(db,'company',id)).products[0].ean,null);
});
test('variação sem GTIN não herda EAN do produto pai nem de outra variação',async()=>{
 const db=fixture(),item=db.remote['account/items/MLB123456'];db.remote['account/shipments/'+id+'/items'][0].variation_id=20;item.attributes=[{id:'GTIN',value_name:'8720389031151'}];item.variations=[{id:21,attributes:item.attributes},{id:20,attributes:[]}];assert.equal((await readShippingLabel(db,'company',id)).products[0].ean,null);
 item.variations[1].attributes=[{id:'GTIN',value_name:'7898649372113'}];assert.equal((await readShippingLabel(db,'company',id)).products[0].ean,'7898649372113');
});
test('etiqueta de outro vendedor não retorna dados; 403 é indisponibilidade, não ausência',async()=>{
 const db=fixture();db.remote['account/shipments/'+id].sender_id=456;await assert.rejects(readShippingLabel(db,'company',id),e=>e.code==='label_not_found');assert.equal(db.calls.length,1);
 db.remote['account/shipments/'+id]=new MarketplaceError(403,'provider_403','denied');await assert.rejects(readShippingLabel(db,'company',id),e=>e.code==='label_unavailable');
});
test('produtos do pacote são listados, repetições deduplicadas e conta divergente falha fechada',async()=>{
 const db=fixture(),items=db.remote['account/shipments/'+id+'/items'];items.push({...items[0]});items.push({...items[0],item_id:'MLB654321',description:'Outro produto'});const r=await readShippingLabel(db,'company',id);assert.equal(r.products.length,2);assert.equal(r.products[1].image,null);
 items[1].sender_id=456;await assert.rejects(readShippingLabel(db,'company',id),e=>e.code==='label_identity');
});
test('foto da variação nunca é substituída por foto de outra cor',async()=>{
 const db=fixture();db.remote['account/shipments/'+id+'/items'][0].variation_id=20;Object.assign(db.remote['account/items/MLB123456'],{pictures:[{id:'wrong',secure_url:'https://http2.mlstatic.com/wrong.jpg'},{id:'right',secure_url:'https://http2.mlstatic.com/right.jpg'}],variations:[{id:20,picture_ids:['right'],attribute_combinations:[{name:'Cor',value_name:'Preto'}]}]});const r=await readShippingLabel(db,'company',id);assert.equal(r.products[0].image,'https://http2.mlstatic.com/right.jpg');assert.match(r.products[0].description,/Cor: Preto/);
});
test('API e interface não invocam cadastro, preço, EAN de conferência ou comando de estoque',()=>{
 const route=readFileSync('app/api/modulos/marketplaces/precos/etiqueta/route.ts','utf8'),ui=readFileSync('app/marketplaces/PriceLabelReader.tsx','utf8');assert.match(route,/authorizePriceConsultation\(request,body.empresaId\)/);assert.match(route,/private, no-store/);assert.doesNotMatch(route,/productCommand|syncOrder|consultLocalPrice/);assert.match(ui,/possibleFormats=\[BarcodeFormat.QR_CODE\]/);assert.doesNotMatch(ui,/window\.open|location\.href|Consultar preço|Conferir EAN/);assert.match(ui,/generation.current/);assert.match(ui,/controller.current\?\.abort/);
});
