import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {sharedPublicationIdentity,sharedPublicationContent,existingDestination,commercialPublicationKey} from '../../app/modules/marketplaces/multi-publication.ts';
const company=crypto.randomUUID(),productId=crypto.randomUUID(),connectionId=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID();
const base={ean:'7899882311471',stock:2,localProductId:productId,price:100,description:'Descrição própria',warrantyType:'seller',warrantyTime:'3 meses',productId,categoryId:'MLB123',listingType:'gold_special',shippingMode:'custom',condition:'new',attributes:{}};
test('novo anúncio oferece Todos para selecionar somente as novas contas disponíveis',()=>{
 const source=readFileSync('app/marketplaces/MultiAccountPublication.tsx','utf8');
 assert.match(source,/const selectableAccounts=eligible\.filter\(account=>!existingDestination\(lockedLinks,account\.id\)&&!\['published','pending'\]\.includes\(reviews\[account\.id\]\?\.status\|\|''\)\);/);
 assert.match(source,/>Todos<small>Selecionar todas as novas contas<\/small>/);
 assert.match(source,/new Set\(\[\.\.\.current,\.\.\.selectableAccounts\.map\(account=>account\.id\)\]\)/);
 assert.match(source,/current\.filter\(id=>!selectableAccounts\.some\(account=>account\.id===id\)\)/);
});
test('cards individuais só aparecem ao escolher publicações distintas',()=>{
 const source=readFileSync('app/marketplaces/MultiAccountPublication.tsx','utf8');
 assert.match(source,/\[publicationMode,setPublicationMode\]=useState<'same'\|'different'\|''>\(''\)/);
 assert.match(source,/Como serão as publicações\?/);
 assert.match(source,/Publicações iguais/);
 assert.match(source,/Publicações distintas/);
 assert.match(source,/publicationMode==='different'&&selected\.filter/);
 assert.match(source,/publicationMode==='same'&&<>/);
});
test('EAN, estoque e conteúdo não variam por conta; somente preço é individual',()=>{
 const product={ean:base.ean,stock_quantity:2,description:base.description,pictures:['https://example.com/foto.jpg'],category_id:base.categoryId,publication_form:{listingType:base.listingType,shippingMode:base.shippingMode,condition:base.condition,warrantyType:base.warrantyType,warrantyTime:base.warrantyTime},attributes:[]};
 for(const patch of [{ean:'outro'},{stock:1},{stock:3},{attributes:{GTIN:'outro'}}])assert.throws(()=>sharedPublicationIdentity({...base,...patch},product));
 for(const patch of [{stock_quantity:null},{stock_quantity:0},{listing_stock_review_at:'2026-10-23'}])assert.throws(()=>sharedPublicationIdentity(base,{...product,...patch}));
 for(const patch of [{description:'Outra loja'},{pictureUrl:'https://example.com/outra.jpg'},{categoryId:'MLB999'},{warrantyTime:'1 ano'}])assert.throws(()=>sharedPublicationContent({...base,...patch},product));
 assert.doesNotThrow(()=>sharedPublicationIdentity({...base,price:50},product));
 assert.notEqual(commercialPublicationKey(base),commercialPublicationKey({...base,price:50}));
 assert.equal(existingDestination([{connectionId,listingId:'MLB123',status:'paused',provider:'mercado_livre'}],connectionId),true);
 assert.equal(existingDestination([{connectionId,listingId:'MLB123',status:'deleted',provider:'mercado_livre'}],connectionId),false);
});
test('migração aditiva protege tentativas entre abas sem expor tabela ou alterar saldo/histórico',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon;create role authenticated;create role service_role;create table empresas(id uuid primary key);create table marketplace_products(id uuid primary key,stock_quantity int);create table marketplace_connections(id uuid primary key);');
  await db.exec(readFileSync('supabase/migrations/20261023050000_marketplace_multi_publication_targets.sql','utf8'));
  await db.query('insert into empresas values($1)',[company]);await db.query('insert into marketplace_products values($1,2)',[productId]);await db.query('insert into marketplace_connections values($1),($2)',[connectionId,other]);
  const insert=()=>db.query('insert into marketplace_multi_publication_targets(empresa_id,product_id,connection_id) values($1,$2,$3) on conflict do nothing',[company,productId,connectionId]);
  await Promise.all([insert(),insert()]);assert.equal((await db.query('select * from marketplace_multi_publication_targets')).rows.length,1);
  const before=(await db.query('select request_key from marketplace_multi_publication_targets')).rows[0].request_key;await insert();assert.equal((await db.query('select request_key from marketplace_multi_publication_targets')).rows[0].request_key,before);
  assert.equal((await db.query('select stock_quantity from marketplace_products')).rows[0].stock_quantity,2);
  const access=(await db.query("select has_table_privilege('anon','marketplace_multi_publication_targets','select') anon,has_table_privilege('authenticated','marketplace_multi_publication_targets','insert') auth,has_table_privilege('service_role','marketplace_multi_publication_targets','insert') service")).rows[0];assert.deepEqual(access,{anon:false,auth:false,service:true});
  assert.equal((await db.query("select relrowsecurity from pg_class where relname='marketplace_multi_publication_targets'")).rows[0].relrowsecurity,true);
 }finally{await db.close();}
});
const mock=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('export{}');
 if(s==='./management-access')return mock('export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code}}');
 if(s==='./local-products')return mock('export const getLocalProduct=(...args)=>globalThis.multiFixture.product(...args)');
 if(s==='./mercadolivre-management')return mock('export const loadConnection=(...args)=>globalThis.multiFixture.connection(...args);export const mlRequest=(...args)=>globalThis.multiFixture.ml(...args);export const recordPublishedListing=async()=>({});');
 if(s==='./mercadolivre-publication')return mock('export const prepareMercadoLivrePublication=async()=>({status:"found",ean:"7899882311471",product:{id:"local",name:"Produto"},categoryId:"MLB123",listingTypes:[{id:"gold_special"}],shippingModes:[{id:"custom"}],conditions:[{id:"new"}],requiredAttributes:[],constraints:{maxDescriptionLength:50000}});export const publishMercadoLivreCatalog=(...args)=>globalThis.multiFixture.publish(...args);');
 if(s==='./mercadolivre-editor')return mock('export const readMercadoLivreEditor=async()=>({values:{price:10,description:"Anterior"},fields:{price:{editable:true},description:{editable:true}}});');
 const file=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&!/\.ts$/.test(file))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const service=await import('../../app/modules/marketplaces/services/multi-publication.ts');hooks.deregister();
function fixture(){
 const tables={marketplace_multi_publication_targets:[],marketplace_publications:[],marketplace_listing_actions:[],marketplace_inventory_settings:[{empresa_id:company,enabled:true}]},calls=[];
 const product={id:productId,ean:base.ean,stock_quantity:2,description:base.description,pictures:['https://example.com/foto.jpg'],category_id:base.categoryId,publication_form:{listingType:base.listingType,shippingMode:base.shippingMode,condition:base.condition,warrantyType:base.warrantyType,warrantyTime:base.warrantyTime},attributes:[],links:[],revision:1};
 Object.defineProperty(tables,'marketplace_product_links',{get:()=>product.links.map(link=>({...link,empresa_id:company,product_id:productId}))});
 const item={id:'MLB123456',seller_id:123,status:'active',price:10,title:'Produto',category_id:'MLB123',available_quantity:2,sub_status:[],attributes:[],sale_terms:[]};let description='Anterior';
 const db={from(table){let filters=[],verb='select',payload,single=false;const q={select(){return q;},eq(k,v){filters.push(row=>row[k]===v);return q;},contains(k,v){filters.push(row=>Object.entries(v).every(([key,value])=>row[k]?.[key]===value));return q;},in(k,v){filters.push(row=>v.includes(row[k]));return q;},upsert(value){verb='upsert';payload=value;return q;},insert(value){verb='insert';payload=value;return q;},update(value){verb='update';payload=value;return q;},single(){single=true;return q;},maybeSingle(){single=true;return q;},then(done){const rows=tables[table]||=[];if(verb==='upsert'&&!rows.some(row=>row.empresa_id===payload.empresa_id&&row.product_id===payload.product_id&&row.connection_id===payload.connection_id))rows.push({...payload,request_key:crypto.randomUUID()});if(verb==='insert')rows.push({...payload,id:crypto.randomUUID()});const found=rows.filter(row=>filters.every(filter=>filter(row)));if(verb==='update')for(const row of found)Object.assign(row,payload);return Promise.resolve({data:single?found.at(-1)||null:found,error:null}).then(done);}};return q;}};
 globalThis.multiFixture={product:async(_,c,id)=>{assert.equal(c,company);assert.equal(id,productId);return product;},connection:async(_,c,id)=>{assert.equal(c,company);assert.ok([connectionId,other].includes(id));return{id,empresa_id:c,seller_reference:'123'};},ml:async(_,c,path,method='GET',body)=>{calls.push({id:c.id,path,method,body});if(method==='PUT'&&path.includes('/description')){description=body.plain_text;return{};}if(method==='PUT'){Object.assign(item,body);return item;}return path.includes('/description')?{plain_text:description}:item;},publish:async(_,connection,a,key,form)=>{assert.equal(a,actor);if(tables.marketplace_publications.some(row=>row.idempotency_key===key))throw Error('Duplicate audit');tables.marketplace_publications.push({empresa_id:company,connection_id:connection.id,idempotency_key:key,status:'published',provider_listing_id:'MLB123456',response_summary:{local_product_id:productId}});calls.push({method:'CREATE',id:connection.id,form});return{status:'published',listing:{id:'MLB123456'}};}};
 return{db,product,tables,calls,item};
}
test('envio repetido usa mesma reserva; conta já anunciada nunca cria outro anúncio',async()=>{
 const f=fixture(),input={batchKey:crypto.randomUUID(),connectionId,form:base};
 await service.publishMultiDestination(f.db,company,actor,input);await service.publishMultiDestination(f.db,company,actor,input);
 assert.equal(f.calls.filter(call=>call.method==='CREATE').length,1);assert.equal(f.product.stock_quantity,2);
 f.product.links=[{connection_id:other,provider_listing_id:'MLB654321',provider:'mercado_livre',status:'paused'}];
 await assert.rejects(()=>service.publishMultiDestination(f.db,company,actor,{...input,connectionId:other}),{code:'already_announced'});assert.equal(f.calls.filter(call=>call.method==='CREATE').length,1);
});
test('atualização exige confirmação, vínculo e altera somente o preço',async()=>{
 const f=fixture();f.product.links=[{connection_id:connectionId,provider_listing_id:'MLB123456',provider:'mercado_livre',status:'active'}];
 const input={connectionId,listingId:'MLB123456',batchKey:crypto.randomUUID(),form:base,fields:['price'],confirmUpdate:true};
 await assert.rejects(()=>service.updateExistingDestination(f.db,company,actor,{...input,confirmUpdate:false}));
 await assert.rejects(()=>service.updateExistingDestination(f.db,company,actor,{...input,fields:['description']}));
 await service.updateExistingDestination(f.db,company,actor,input);
 const writes=f.calls.filter(call=>call.method==='PUT');assert.equal(writes.length,1);assert.equal(writes[0].body.price,100);
 assert.ok(writes.every(call=>!Object.hasOwn(call.body,'available_quantity')&&!Object.hasOwn(call.body,'status')&&!Object.hasOwn(call.body,'ean')));assert.equal(f.item.available_quantity,2);
});
test('sem sincronização ativa ou saldo divergente não há preparação enviável',async()=>{
 const f=fixture();await assert.rejects(()=>service.reviewMultiDestination(f.db,company,connectionId,{...base,stock:1}),{code:'shared_identity'});
 f.tables.marketplace_inventory_settings[0].enabled=false;await assert.rejects(()=>service.reviewMultiDestination(f.db,company,connectionId,base),{code:'inventory_disabled'});assert.equal(f.calls.length,0);
});

test('contas já anunciadas são lidas dos vínculos persistidos mesmo quando a ficha mínima não traz links',async()=>{
 const f=fixture();f.product.links=[{connection_id:connectionId,provider_listing_id:'MLB123456',provider:'mercado_livre',status:'active'},{connection_id:other,provider_listing_id:'MLB654321',provider:'mercado_livre',status:'paused'}];
 globalThis.multiFixture.product=async()=>({...f.product,links:[]});
 const result=await service.multiPublicationContext(f.db,company,productId);
 assert.equal(result.product.links.length,0);assert.equal(result.links.length,2);
 assert.ok(result.links.every(link=>existingDestination(result.links,link.connectionId)));
 await assert.rejects(()=>service.publishMultiDestination(f.db,company,actor,{connectionId:other,batchKey:crypto.randomUUID(),form:base}),{code:'already_announced'});
 assert.equal(f.calls.length,0);
});
