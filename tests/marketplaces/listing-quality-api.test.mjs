import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const access=pathToFileURL(resolve(root,'app/modules/marketplaces/services/management-access.ts')).href;
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(v,o)=>Response.json(v,o)}',shortCircuit:true};
 if(s.endsWith('/management-access')||s==='./management-access')return {url:'data:text/javascript,'+encodeURIComponent(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message,code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,id,p){if(p!=='view'||id!=='company'||req.headers.get('authorization')!=='Bearer viewer')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.qualityDb,empresaId:id}}`),shortCircuit:true};
 if(s==='./mercadolivre-management')return {url:'data:text/javascript,'+encodeURIComponent(`import {MarketplaceError} from '${access}';export async function loadConnection(db,company,id){if(company!=='company'||id!=='account')throw new MarketplaceError(404,'account_not_found','Conta não encontrada');return {id,empresa_id:company,seller_reference:'123',token_sealed:'SECRET'}};export async function mlRequest(db,connection,path,method='GET',body){return db.read(path,method,body)}`),shortCircuit:true};
 const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {GET}=await import('../../app/api/modulos/marketplaces/anunciados/qualidade/route.ts');
const {MarketplaceError}=await import('data:text/javascript,'+encodeURIComponent(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message,code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,id,p){if(p!=='view'||id!=='company'||req.headers.get('authorization')!=='Bearer viewer')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.qualityDb,empresaId:id}}`));
hooks.deregister();
const item='MLB123456',up='MLBU456789';
test.beforeEach(()=>{globalThis.qualitySaved=[];});
const performance=(id,type)=>({entity_id:id,entity_type:type,score:72,level_wording:'Profissional',buckets:[]});
function request(params={},token='viewer'){if(globalThis.qualityDb&&!globalThis.qualityDb.rpc)globalThis.qualityDb.rpc=async(name,args)=>{assert.equal(name,'marketplace_quality_save');assert.equal(args.p_company,'company');assert.equal(args.p_connection,'account');assert.equal(args.p_listing,item);globalThis.qualitySaved.push(args);return {error:null};};return new Request('http://localhost/api?'+new URLSearchParams({empresaId:'company',connectionId:'account',id:item,...params}),{headers:{authorization:'Bearer '+token}});}
test('consulta autenticada valida conta/anúncio, lê ITEM e UP e não faz escritas nem expõe credenciais',async()=>{
 const calls=[];globalThis.qualityDb={read:async(path,method,body)=>{calls.push(path);assert.equal(method,'GET');assert.equal(body,undefined);if(path===`/items/${item}`)return {id:item,seller_id:123,title:'Produto',user_product_id:up,token:'SECRET'};return performance(path.includes('user-product')?up:item,path.includes('user-product')?'USER_PRODUCT':'ITEM');}};
 const res=await GET(request());assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');const data=await res.json();assert.equal(data.quality.length,2);assert.deepEqual(calls,[`/items/${item}`,`/item/${item}/performance`,`/user-product/${up}/performance`]);assert.doesNotMatch(JSON.stringify(data),/SECRET|token_sealed/);
 assert.equal(globalThis.qualitySaved.length,1);assert.equal(globalThis.qualitySaved[0].p_result.quality[0].score,72);
 assert.equal((await GET(request({},'other'))).status,403);assert.equal((await GET(request({empresaId:'other'}))).status,403);assert.equal((await GET(request({connectionId:'other'}))).status,404);
 assert.equal((await GET(request({id:'../../users/me'}))).status,400);
});
test('anúncio alheio é rejeitado antes de consultar performance',async()=>{
 const calls=[];globalThis.qualityDb={read:async path=>{calls.push(path);return {id:item,seller_id:'999',user_product_id:up};}};
 assert.equal((await GET(request())).status,403);assert.deepEqual(calls,[`/items/${item}`]);
});
test('avaliação ausente/parcial/negada não vira zero nem objetivos concluídos',async()=>{
 globalThis.qualityDb={read:async path=>{if(path===`/items/${item}`)return {id:item,seller_id:123,user_product_id:up};if(path.includes('user-product'))return performance(up,'USER_PRODUCT');throw new MarketplaceError(409,'provider_404','raw');}};
 let data=await (await GET(request())).json();assert.equal(data.quality.length,1);assert.match(data.notices[0],/ainda não gerou/);
 globalThis.qualityDb.read=async path=>{if(path===`/items/${item}`)return {id:item,seller_id:123};throw new MarketplaceError(403,'provider_403','raw SECRET');};
 data=await(await GET(request())).json();assert.equal(data.quality.length,0);assert.match(data.notices[0],/permissões/);assert.doesNotMatch(JSON.stringify(data),/SECRET/);
});
