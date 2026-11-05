import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const hooks=registerHooks({resolve(s,c,next){if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const file=resolve(dirname(new URL(c.parentURL).pathname),s)+'.ts';if(existsSync(file))return next(pathToFileURL(file).href,c);}return next(s,c);}});
const {withListingPriceReferences}=await import('../../app/modules/marketplaces/services/listing-price-references.ts');hooks.deregister();
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
function database(result){const calls=[];return {calls,from(table){calls.push(['from',table]);const q={then(resolve){return Promise.resolve(result).then(resolve)}};for(const name of ['select','eq','in','is','abortSignal'])q[name]=(...args)=>{calls.push([name,...args]);return q;};return q;}};}
test('referências em lote respeitam empresa e IDs vinculados, sem alterar valores ou anúncios',async()=>{
 const db=database({data:[{id:a,price_cents:12360},{id:b,price_cents:0},{id:'foreign',price_cents:999999}],error:null}),groups=[{productId:a,title:'Prancha',price:111},{productId:a,title:'Duplicado'},{productId:b},{productId:null}];
 const before=JSON.stringify(groups),out=await withListingPriceReferences(db,'company',groups,new AbortController().signal);
 assert.deepEqual(out.map(g=>g.referencePriceCents),[12360,12360,null,null]);assert.equal(JSON.stringify(groups),before);assert.equal(out[0].price,111);
 assert.equal(db.calls.filter(c=>c[0]==='from').length,1);assert.deepEqual(db.calls.find(c=>c[0]==='eq'),['eq','empresa_id','company']);assert.deepEqual(db.calls.find(c=>c[0]==='in'),['in','id',[a,b]]);assert.deepEqual(db.calls.find(c=>c[0]==='is'),['is','archived_at',null]);
});
test('falha ou ausência de referência mantém anúncio e nunca inventa preço zero',async()=>{
 for(const result of [{error:{code:'fail'}},{data:[],error:null},{data:[{id:a,price_cents:-1}],error:null},{data:[{id:a,price_cents:123.5}],error:null}])assert.deepEqual(await withListingPriceReferences(database(result),'company',[{productId:a,price:111}]),[{productId:a,price:111,referencePriceCents:null}]);
 const db=database({data:[]});assert.deepEqual(await withListingPriceReferences(db,'company',[{productId:null},{productId:'bad-id'}]),[{productId:null,referencePriceCents:null},{productId:'bad-id',referencePriceCents:null}]);assert.equal(db.calls.length,0);
 assert.equal((await withListingPriceReferences({from(){throw Error('offline')}},'company',[{productId:a}]))[0].referencePriceCents,null);
});
