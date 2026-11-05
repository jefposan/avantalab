import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(s.endsWith('/management-access'))return {url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}',shortCircuit:true};
 const file=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {readPersistedReference,assertSavedPrices}=await import('../../app/modules/marketplaces/services/price-persistence.ts');
const {confirmConsultationReference}=await import('../../app/modules/marketplaces/services/confirmed-price-consultation.ts');hook.deregister();
const company='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
function fake(price){return {price,reads:0,from(table){assert.equal(table,'marketplace_products');const filters={},self=this,q={select(){return q},eq(k,v){filters[k]=v;return q},is(k,v){filters[k]=v;return q},async maybeSingle(){assert.deepEqual(filters,{empresa_id:company,id,archived_at:null});self.reads++;return self.failure?{error:{message:'unavailable'}}:{data:{id,price_cents:self.price,revision:3}};}};return q;}};}
const result={status:'found',localProductId:id,product:{id:'MLB1',name:'Produto',description:'',image:null,attributes:[]},ean:null,query:null};
const prices={market:100,minimum:50,medium:70,ideal:90};
test('sem preço é um cadastro confirmado com aviso claro, sem inventar valores',async()=>{
 const db=fake(null),saved=await confirmConsultationReference(db,company,result);
 assert.equal(saved.referenceStatus,'missing');assert.equal(saved.prices,undefined);assert.match(saved.notice,/Produto cadastrado sem preço/);assert.match(saved.notice,/referência manual/);assert.equal(db.reads,1);
});
test('preço só é confirmado após leitura; ausência e falha de gravação nunca retornam sucesso',async()=>{
 assert.equal((await confirmConsultationReference(fake(10000),company,{...result,prices})).referenceStatus,'saved');
 await assert.rejects(confirmConsultationReference(fake(null),company,{...result,prices}),{code:'reference_not_saved'});
 const db=fake(10000);db.failure=true;await assert.rejects(readPersistedReference(db,company,id),{code:'reference_not_confirmed'});
 await assert.rejects(readPersistedReference(fake(9000),company,id,10000),{code:'reference_not_confirmed'});
});
test('pesquisa sem ofertas ou com outro valor preserva referência canônica e recalcula sugestões sem fontes falsas',async()=>{
 for(const input of [result,{...result,prices,sample:{source:'openai_web_search',count:1,offers:[{price:100}]}}]){
  const saved=await confirmConsultationReference(fake(20000),company,input);
  assert.equal(saved.referenceStatus,'preserved');assert.deepEqual(saved.prices,{market:200,minimum:100,medium:140,ideal:180});assert.equal(saved.sample.source,'local_reference');assert.equal(saved.sample.offers,undefined);assert.match(saved.notice,/preservada/);
 }
});
test('confere os quatro valores do histórico; dado incompleto ou divergente é erro, não sucesso',()=>{
 const row={market_price_cents:10000,minimum_price_cents:5000,medium_price_cents:7000,ideal_price_cents:9000};
 assert.doesNotThrow(()=>assertSavedPrices(row,prices));
 for(const key of Object.keys(row))assert.throws(()=>assertSavedPrices({...row,[key]:null},prices),{code:'reference_not_confirmed'});
});
test('controlador real preserva referência ao editar com campo vazio e confere escrita explícita, mantendo revisão/chave',async()=>{
 const source=readFileSync('app/modules/marketplaces/services/local-products.ts','utf8');
 const code=source.slice(source.indexOf('export async function productCommand'),source.indexOf('export async function getLocalProduct'));
 const exports={},env={exports,readPersistedReference,uuidIsValid:v=>/^[a-f0-9-]{36}$/.test(v),objectValue:v=>v&&typeof v==='object'?v:{},MarketplaceError:class extends Error{}};
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,env);
 const db=fake(20000),key=crypto.randomUUID();let writes=0;
 db.rpc=async(name,args)=>{writes++;assert.equal(name,'marketplace_product_command');assert.equal(args.p_request_key,key);assert.equal(args.p_data.revision,3);assert.equal(args.p_data.price_cents,db.expected??20000);db.price=args.p_data.price_cents;return {data:{product_id:id,created:false}};};
 await exports.productCommand(db,company,'actor','update',{product_id:id,revision:3,price_cents:null},key);assert.equal(db.price,20000);assert.equal(writes,1);
 db.expected=25000;await exports.productCommand(db,company,'actor','update',{product_id:id,revision:3,price_cents:25000},key);assert.equal(db.price,25000);
 db.rpc=async()=>({data:{product_id:id,created:false}});
 await assert.rejects(exports.productCommand(db,company,'actor','update',{product_id:id,revision:3,price_cents:30000},key),{code:'reference_not_confirmed'});
});
