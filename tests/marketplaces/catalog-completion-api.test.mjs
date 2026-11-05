import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const mock=code=>({url:'data:text/javascript,'+encodeURIComponent(code),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s.endsWith('/management-access'))return mock(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export async function authorizeMarketplace(req,id,permission){if(permission!=='manage'||id!=='company'||req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Negado');return{db:globalThis.catalogDB,empresaId:id,usuario:{id:'actor'}}};export const managementFailure=e=>Response.json({message:e.message},{status:e.status||503})`);
 if(s.endsWith('/catalog-completion'))return mock('export async function catalogCompletionStatus(db,c){db.calls.push(["status",c]);return{pending:0}};export async function completeCatalogStep(db,c){db.calls.push(["step",c]);return{worked:true}}');return next(s,c);
}});
const {GET,POST}=await import('../../app/api/modulos/marketplaces/catalogo/completar/route.ts');hooks.deregister();
const req=(method,body,token='manager')=>new Request('http://local/?empresaId=company',{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
test('complementação exige gestão e empresa autorizada; não aceita valores arbitrários como conteúdo',async()=>{
 const calls=[];globalThis.catalogDB={calls,rpc:async(name,args)=>{calls.push([name,args]);return{error:null}},from(table){const filters=[];const q={update(value){calls.push(['retry',table,value,filters]);return q},eq(k,v){filters.push([k,v]);return q},then(done){return Promise.resolve({error:null}).then(done)}};return q;}};
 assert.equal((await POST(req('POST',{empresaId:'company',action:'seed'},'viewer'))).status,403);assert.equal((await POST(req('POST',{empresaId:'other',action:'next'}))).status,403);assert.equal(calls.length,0);
 assert.equal((await POST(req('POST',{empresaId:'company',action:'seed'}))).status,200);assert.deepEqual(calls[0],['marketplace_catalog_completion_seed',{p_company:'company',p_actor:'actor'}]);
 assert.deepEqual(calls[1][3],[['empresa_id','company'],['state','skipped'],['issue','O catálogo não confirmou o EAN exato.']]);
 assert.equal((await POST(req('POST',{empresaId:'company',action:'update',pictures:['arbitrário']}))).status,400);
 assert.equal((await POST(req('POST',{empresaId:'company',action:'next',price:1,stock:999}))).status,200);assert.deepEqual(calls.at(-1),['step','company']);assert.equal((await GET(req('GET'))).status,200);
});
