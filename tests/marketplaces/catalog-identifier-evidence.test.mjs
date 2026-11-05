import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {existsSync} from 'node:fs';import {resolve,dirname} from 'node:path';import {pathToFileURL} from 'node:url';
const data=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return data('export{}');if(s==='./management-access')return data('export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}');
 if(s==='./mercadolivre-management')return data('export async function mlRequest(db,c,path){db.paths.push(path);return path.startsWith("/products/search")?structuredClone(db.search):structuredClone(db.detail)}');
 const f=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {identifyMercadoLivreCatalog}=await import('../../app/modules/marketplaces/services/mercadolivre-catalog.ts');hooks.deregister();
test('evidência vem da resposta ML a product_identifier único, não de eco do pedido ou pesquisa textual',async()=>{
 const before=process.env.MARKETPLACE_SECRETS_KEY;process.env.MARKETPLACE_SECRETS_KEY='test-only';try{
 const detail={id:'MLB123',name:'Liquidificador',domain_id:'MLB-BLENDERS',status:'active',attributes:[],pictures:[]};const db={paths:[],detail,search:{product_identifier:'7896347195829',paging:{total:1},results:[detail]}};
 let result=await identifyMercadoLivreCatalog(db,{}, {ean:'7896347195829'});assert.deepEqual(result.identifierEvidence,{ean:'7896347195829',productId:'MLB123'});assert.match(db.paths[0],/product_identifier=7896347195829/);assert.ok(!db.paths[0].includes('&q='));
 db.search.product_identifier='7896006214007';result=await identifyMercadoLivreCatalog(db,{}, {ean:'7896347195829'});assert.equal(result.identifierEvidence,undefined);
 delete db.search.product_identifier;result=await identifyMercadoLivreCatalog(db,{}, {ean:'7896347195829'});assert.equal(result.identifierEvidence,undefined);
 db.search.product_identifier='7896347195829';db.search.paging.total=2;result=await identifyMercadoLivreCatalog(db,{}, {ean:'7896347195829',productId:'MLB123'});assert.equal(result.identifierEvidence,undefined);
 db.search.paging.total=1;result=await identifyMercadoLivreCatalog(db,{}, {query:'Liquidificador'});assert.equal(result.identifierEvidence,undefined);
 }finally{if(before===undefined)delete process.env.MARKETPLACE_SECRETS_KEY;else process.env.MARKETPLACE_SECRETS_KEY=before;}
});
