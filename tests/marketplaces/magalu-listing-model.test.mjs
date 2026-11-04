import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const hook=registerHooks({resolve(s,c,next){if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const p=resolve(dirname(new URL(c.parentURL).pathname),s);if(existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,c);}return next(s,c);}});
const {normalizeMagaluListing,magaluStock,magaluPrice,magaluListingPage}=await import('../../app/modules/marketplaces/magalu-listing-model.ts');
const {MAGALU_CHANNEL_ID:channel}=await import('../../app/modules/marketplaces/magalu-publication-model.ts');
const {marketplaceCapabilities}=await import('../../app/modules/marketplaces/integration-contract.ts');hook.deregister();
const raw={sku:'SKU.1',title:'Produto',active:true,status:'PUBLISHED',channels:[{id:channel}],images:[{reference:'https://images.example.invalid/photo.jpg'}],identifiers:[{type:'ean',value:'7898649372113'}],fulfillment:false};
const stock=quantity=>({results:[{channel:{id:channel},type:'AVAILABLE',quantity}]});
test('Magalu compartilha snapshot, foto, EAN e saldo; valores desconhecidos não viram zero',()=>{
 const listing=normalizeMagaluListing(raw,'SKU.1',stock(3),{results:[{channel:{id:channel},price:12345,normalizer:100,currency:'BRL'}]});
 assert.equal(listing.stock,3);assert.equal(listing.price,123.45);assert.equal(listing.status,'active');assert.equal(listing.ean,'7898649372113');assert.equal(listing.pictures.length,1);assert.equal(listing.feeEstimate,null);assert.equal(listing.sold,null);
 assert.equal(normalizeMagaluListing(raw,'SKU.1').stock,null);assert.equal(normalizeMagaluListing({...raw,active:false},'SKU.1',stock(2)).status,'paused');
 assert.throws(()=>normalizeMagaluListing({...raw,channels:[{id:'outro'}]},'SKU.1'),/identity/);assert.throws(()=>normalizeMagaluListing(raw,'SKU2'),/identity/);
});
test('AVAILABLE por canal não soma RESERVED, outros canais ou múltiplos depósitos',()=>{
 assert.equal(magaluStock({results:[...stock(2).results,{channel:{id:channel},type:'RESERVED',quantity:9},{channel:{id:'outro'},type:'AVAILABLE',quantity:8}]}),2);
 assert.throws(()=>magaluStock({results:[...stock(2).results,...stock(3).results]}),/origin/);
 assert.throws(()=>magaluStock({results:[{...stock(2).results[0],branch:{id:'deposito'}}]}),/origin/);
 for(const quantity of [null,-1,1.1,'2',100000])assert.throws(()=>magaluStock(stock(quantity)),/incomplete/);
 assert.equal(magaluPrice({results:[{channel:{id:channel},price:300,currency:'BRL'}]}),null);
});
test('paginação mantém URL no host/rota e não declara vazio em retorno inconsistente',()=>{
 const page={results:[raw],meta:{page:{offset:0,count:1},links:{next:'?_offset=1&_limit=5'}}};assert.equal(magaluListingPage(page,0,5).next,1);
 assert.throws(()=>magaluListingPage({...page,meta:{links:{next:'https://evil.invalid/seller/v1/portfolios/skus?_offset=1'}}},0,5),/page/);
 assert.throws(()=>magaluListingPage({results:[],meta:{page:{total:4}}},0),/page/);assert.deepEqual(magaluListingPage({results:[]},0),{rows:[],next:null});
});
test('todo novo conector começa pelo contrato, sem anunciar recurso ainda não homologado',()=>{
 const ml=marketplaceCapabilities('mercado_livre'),magalu=marketplaceCapabilities('magalu');assert.deepEqual(Object.keys(ml),Object.keys(magalu));assert.equal(magalu.stockWrite,'api');assert.equal(magalu.labels,'portal');assert.equal(magalu.fees,'unavailable');assert.ok(Object.values(marketplaceCapabilities('amazon')).every(x=>x==='unavailable'));
});
