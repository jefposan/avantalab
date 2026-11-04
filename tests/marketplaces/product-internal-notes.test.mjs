import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {validInternalNotes} from '../../app/modules/marketplaces/product-internal-notes.ts';
import {localProductData} from '../../app/modules/marketplaces/services/local-product-model.ts';
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};
 if(s==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code})}}',shortCircuit:true};
 return next(s,c);
}});
const {readProductInternalNotes}=await import('../../app/modules/marketplaces/services/product-internal-notes.ts');hooks.deregister();
test('leitura privada: empresa/IDs explícitos, ausência de tabela compatível e falha real não é vazio',async()=>{
 const reads=[];let error=null;
 const db={from(t){assert.equal(t,'marketplace_product_internal_notes');return{select(){return this;},eq(k,v){reads.push([k,v]);return this;},in(k,v){reads.push([k,v]);return this;},abortSignal(s){assert.ok(s instanceof AbortSignal);return Promise.resolve({data:error?null:[{product_id:'p',notes:'Sem caixa',revision:2}],error});}};}};
 assert.equal((await readProductInternalNotes(db,'company',['p'])).get('p').internalNotes,'Sem caixa');
 assert.deepEqual(reads,[['empresa_id','company'],['product_id',['p']]]);
 for(const code of ['42P01','PGRST205']){error={code};assert.deepEqual((await readProductInternalNotes(db,'company',['p'])).get('p'),{internalNotes:'',internalNotesRevision:0,internalNotesAvailable:false});}
 error={code:'503'};await assert.rejects(readProductInternalNotes(db,'company',['p']),e=>e.status===503);
 assert.equal((await readProductInternalNotes(db,'company',[])).size,0);
});
test('limite de notas e publicação não incorporam texto interno em descrição/atributos',()=>{
 assert.equal(validInternalNotes('Nota\ncom quebra'),true);assert.equal(validInternalNotes('x'.repeat(161)),false);assert.equal(validInternalNotes('a\u0001b'),false);assert.equal(validInternalNotes(null),false);
 const product=localProductData({name:'Produto',description:'Descrição pública',internalNotes:'Privado',internal_notes:'Privado',attributes:[],publication_form:{internalNotes:'Privado'}});
 assert.doesNotMatch(JSON.stringify(product),/Privado|internalNotes|internal_notes/);
 for(const file of ['mercadolivre-publication','magalu-editor','listing-edit-adapters'])assert.doesNotMatch(readFileSync(`app/modules/marketplaces/services/${file}.ts`,'utf8'),/product-internal-notes|internal_notes|internalNotes/);
 const post=readFileSync('app/marketplaces/ProductPost.tsx','utf8');assert.match(post,/\[details,setDetails\]=useState\(\(\)=>product.internalNotes \|\| ''\)/);assert.doesNotMatch(post,/setDetails\(product\.internalNotes/);
});
