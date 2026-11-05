import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message,fields){super(message);Object.assign(this,{status,code,fields})}}',shortCircuit:true};
 if(s==='./magalu-listings')return{url:'data:text/javascript,export async function readMagaluListing(db){return {listing:structuredClone(db.listing)}}export async function manageMagaluListing(db,c,a,input){db.calls.push(input);return{listing:db.listing,pending:true}}',shortCircuit:true};
 const p=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(p&&existsSync(p+'.ts'))return next(pathToFileURL(p+'.ts').href,c);return next(s,c);
}});
const {readMagaluEditor,saveMagaluEditor}=await import('../../app/modules/marketplaces/services/magalu-editor.ts');hook.deregister();
const connection={id:'22222222-2222-4222-8222-222222222222',empresa_id:'11111111-1111-4111-8111-111111111111',provider:'magalu',scopes:['open:portfolio-skus-seller:write','open:portfolio-prices-seller:write']};
function fixture(){const db={listing:{id:'SKU.1',title:'Produto',description:'',price:100,stock:3,status:'active',updatedAt:'2026-10-21T00:00:00Z'},calls:[],from(){return{select(){return this;},eq(){return this;},async maybeSingle(){return{data:db.receipt||null,error:null};}};}};return db;}
test('editor comum respeita escopos por recurso e nunca libera estoque direto',async()=>{
 const db=fixture(),editor=await readMagaluEditor(db,connection,'SKU.1');assert.equal(editor.provider,'magalu');assert.equal(editor.fields.title.editable,true);assert.equal(editor.fields.stock.editable,false);assert.equal(editor.fields.listingType.editable,false);
 const limited=await readMagaluEditor(db,{...connection,scopes:[]},'SKU.1');assert.equal(limited.fields.title.editable,false);assert.equal(limited.fields.price.editable,false);assert.notEqual(limited.revision,editor.revision);
});
test('título sem descrição não envia texto vazio; revisão e estoque bloqueados preservam campos',async()=>{
 const db=fixture(),editor=await readMagaluEditor(db,connection,'SKU.1'),input={id:'SKU.1',revision:editor.revision,requestKey:crypto.randomUUID(),changes:{title:'Novo título'}};
 const result=await saveMagaluEditor(db,connection,'actor',input);assert.equal(result.pending,true);assert.equal(db.calls.length,1);assert.equal(db.calls[0].description,undefined);assert.equal(db.calls[0].expectedRevision,editor.revision);
 db.listing.stock=2;await assert.rejects(saveMagaluEditor(db,connection,'actor',{...input,requestKey:crypto.randomUUID()}),e=>e.code==='edit_conflict');assert.equal(db.calls.length,1);
 const fresh=await readMagaluEditor(db,connection,'SKU.1');await assert.rejects(saveMagaluEditor(db,connection,'actor',{...input,revision:fresh.revision,changes:{stock:4}}),e=>e.code==='invalid_fields');assert.equal(db.calls.length,1);
});
test('preço é independente da ficha e repetição exige mesma conta, ator, SKU e conteúdo',async()=>{
 const db=fixture(),editor=await readMagaluEditor(db,connection,'SKU.1'),input={id:'SKU.1',revision:editor.revision,requestKey:crypto.randomUUID(),changes:{price:75}};
 await assert.rejects(saveMagaluEditor(db,connection,'actor',{...input,changes:{title:'Produto novo',price:75}}),e=>e.code==='magalu_separate_operations');assert.equal(db.calls.length,0);
 await saveMagaluEditor(db,connection,'actor',input);assert.equal(db.calls[0].priceCents,7500);
 db.receipt={actor_id:'other',connection_id:connection.id,provider_listing_id:'SKU.1',request_payload:{editorChanges:{price:75}}};await assert.rejects(saveMagaluEditor(db,connection,'actor',input),e=>e.code==='duplicate_edit');assert.equal(db.calls.length,1);
});
