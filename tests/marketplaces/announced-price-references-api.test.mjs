import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..'),company='11111111-1111-4111-8111-111111111111',account='22222222-2222-4222-8222-222222222222',product='33333333-3333-4333-8333-333333333333';
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(v,o)=>Response.json(v,o)}',shortCircuit:true};
 if(s.endsWith('/management-access'))return {url:'data:text/javascript,'+encodeURIComponent(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export async function authorizeMarketplace(req,id){if(id!=='${company}'||req.headers.get('authorization')!=='Bearer viewer')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.priceGroupsDb,empresaId:id}};export function managementFailure(e){return Response.json({message:e.message},{status:e.status||503})}`),shortCircuit:true};
 const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {GET}=await import('../../app/api/modulos/marketplaces/anunciados/route.ts');hooks.deregister();
function db({referenceError=false}={}){const calls=[];return {calls,from(table){calls.push(['from',table]);const q={then(resolve){return Promise.resolve(table==='marketplace_connections'?{data:[{id:account,provider:'mercado_livre',status:'connected'}]}:referenceError?{error:{code:'fail'}}:{data:[{id:product,price_cents:12360}]}).then(resolve)}};for(const name of ['select','eq','in','is','abortSignal'])q[name]=(...args)=>{calls.push([table,name,...args]);return q};return q;},rpc(name,args){calls.push(['rpc',name,args]);return {abortSignal:async()=>({data:{groups:args.p_count_only?[]:[{productId:product,listings:[{connectionId:account,snapshot:{id:'MLB123456',price:111}}]}],total:1,listingTotal:1,page:1}})}}};}
const request=(params={},token='viewer')=>new Request('https://example.test/api?'+new URLSearchParams({empresaId:company,scope:'all',grouped:'1',...params}),{headers:{authorization:'Bearer '+token}});
test('API agrupada usa referência autorizada sem mudar o preço anunciado nem consultar o ML',async()=>{
 globalThis.priceGroupsDb=db();const res=await GET(request()),data=await res.json();assert.equal(res.status,200);assert.equal(data.groups[0].referencePriceCents,12360);assert.equal(data.listings[0].snapshot.price,111);assert.ok(globalThis.priceGroupsDb.calls.some(c=>c[0]==='marketplace_products'&&c[1]==='eq'&&c[2]==='empresa_id'&&c[3]===company));
});
test('contagem não lê referências e falha opcional preserva os anúncios',async()=>{
 globalThis.priceGroupsDb=db();let data=await(await GET(request({countOnly:'1'}))).json();assert.equal(data.total,1);assert.equal(globalThis.priceGroupsDb.calls.some(c=>c[0]==='from'&&c[1]==='marketplace_products'),false);
 globalThis.priceGroupsDb=db({referenceError:true});data=await(await GET(request())).json();assert.equal(data.groups[0].referencePriceCents,null);assert.equal(data.listings[0].snapshot.price,111);
});
test('empresa/sessão não autorizadas não alcançam a leitura da referência',async()=>{
 globalThis.priceGroupsDb=db();assert.equal((await GET(request({},'invalid'))).status,403);assert.equal((await GET(request({empresaId:product}))).status,403);assert.equal(globalThis.priceGroupsDb.calls.length,0);
});
