import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const mock=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('export{}');
 if(s==='./management-access')return mock('export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.code=code;this.status=status}}');
 if(s==='./magalu-request')return mock('export const loadMagaluCatalogConnection=async(_,company,id)=>{if(company!=="company"||!["one","two"].includes(id))throw Error("account denied");return{id}}');
 if(s==='./multi-publication')return mock('export const multiPublicationContext=async()=>globalThis.magaluMulti.context;export const reserveDestinationKey=async(_,c,p,id)=>"reserved-"+id;export const destinationRequestKey=(b,c,a)=>b+c+a;');
 if(s==='./magalu-publication')return mock('export const magaluCategoryTemplate=async()=>({attributes:[],datasheet:[]});export const createMagaluPublication=async(...args)=>{globalThis.magaluMulti.calls.push(args);return{status:"publishing",requestKey:args[4]}};export const continueMagaluPublication=async(...args)=>{globalThis.magaluMulti.advanced=args;return{status:"publishing"}};');
 if(s==='./integration-adapters')return mock('export const integrationAdapter=async()=>({editor:async()=>({revision:"r",values:{price:1,description:"old"}}),saveEditor:async(_,input)=>{globalThis.magaluMulti.edits.push(input);return{pending:false}}});');
 const file=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(file&&!/\.ts$/.test(file))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {magaluMultiPublication}=await import('../../app/modules/marketplaces/services/magalu-multi-publication.ts');hooks.deregister();
const form={productId:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',revision:1,categoryId:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',sku:'DEMO',title:'Demo',brand:'Teste',description:'Nova descrição',ean:'7899882311471',imageUrl:'https://example.com/demo.jpg',condition:'NEW',priceCents:10000,stock:2,productHeight:1,productWidth:1,productLength:1,productWeight:1,packageHeight:1,packageWidth:1,packageLength:1,packageWeight:1,attributes:{},datasheet:{}};
function fixture(){
 const state={context:{product:{id:form.productId,revision:3,ean:form.ean,stock_quantity:2},links:[]},calls:[],edits:[],previous:null};globalThis.magaluMulti=state;
 const db={from(table){const q={select(){return q;},eq(){return q;},maybeSingle(){return q;},then(done){return Promise.resolve({error:null,data:table==='marketplace_inventory_settings'?{enabled:true}:state.previous}).then(done);}};return q;}};
 return{state,db};
}
test('Magalu usa reservas independentes, revisão atual e saldo único em cada conta',async()=>{
 const {state,db}=fixture();for(const id of ['one','two'])await magaluMultiPublication(db,'company','actor',{action:'publish_magalu',connectionId:id,form});
 assert.equal(state.calls.length,2);assert.deepEqual(state.calls.map(call=>call[4]),['reserved-one','reserved-two']);
 for(const call of state.calls){assert.equal(call[5].stock,2);assert.equal(call[5].revision,3);assert.equal(call[6].sharedStock,true);}
 await assert.rejects(()=>magaluMultiPublication(db,'company','actor',{action:'publish_magalu',connectionId:'one',form:{...form,stock:1}}),{code:'shared_identity'});
 state.context.links=[{connectionId:'one',listingId:'DEMO',provider:'magalu',status:'paused'}];
 await assert.rejects(()=>magaluMultiPublication(db,'company','actor',{action:'publish_magalu',connectionId:'one',form}),{code:'already_announced'});
});
test('Magalu retoma a tentativa exata e não cria outro anúncio em resposta incerta',async()=>{
 const {state,db}=fixture();state.previous={status:'publishing',idempotency_key:'reserved-one',provider_listing_id:'DEMO',response_summary:{stage:'sku_accepted',title:'Produto exato'}};
 const result=await magaluMultiPublication(db,'company','actor',{action:'publish_magalu',connectionId:'one',form});assert.equal(result.status,'pending');assert.equal(result.publication.title,'Produto exato');assert.equal(state.calls.length,0);
 await magaluMultiPublication(db,'company','actor',{action:'advance_magalu',connectionId:'one',form});assert.equal(state.advanced[3],'reserved-one');assert.equal(state.calls.length,0);
});
test('Magalu atualiza descrição e preço em operações separadas, sem EAN ou estoque',async()=>{
 const {state,db}=fixture();state.context.links=[{connectionId:'one',listingId:'DEMO',provider:'magalu',status:'active'}];
 const input={action:'update_magalu',connectionId:'one',listingId:'DEMO',form,fields:['description','price'],confirmUpdate:true,batchKey:'batch'};
 await assert.rejects(()=>magaluMultiPublication(db,'company','actor',{...input,confirmUpdate:false}),{code:'update_confirmation'});
 const result=await magaluMultiPublication(db,'company','actor',input);assert.equal(result.status,'updated');assert.deepEqual(state.edits.map(x=>x.changes),[{description:form.description},{price:100}]);
});
