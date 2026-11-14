import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const company='baa8c115-634a-41d3-9e2a-8666dce11454',connection='d9267ba0-232b-4dd3-a606-0ce3eadf5313';
const access=`export class MarketplaceError extends Error{constructor(status,code,message){super(message);Object.assign(this,{status,code})}};export async function authorizeMarketplace(req,id,permission){globalThis.__diagRouteTrace.push('authorize');if(req.headers.get('authorization')!=='Bearer admin'||id!=='${company}'||permission!=='connections')throw new MarketplaceError(403,'forbidden','Sem permissão');return {db:{},empresaId:id}};export function managementFailure(e){return Response.json({code:e.code},{status:e.status||503,headers:{'Cache-Control':'no-store'}})}`;
const mock=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
 if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s.endsWith('/management-access'))return mock(access);
 if(s.endsWith('/mercadolivre-management'))return mock(`export async function loadConnection(db,id,connection){globalThis.__diagRouteTrace.push('load');if(id!=='${company}'||connection!=='${connection}')throw Object.assign(Error('Conta fora da empresa'),{status:404,code:'account_not_found'});return {id:connection,empresa_id:id,seller_reference:'230210240',seller_name:'JEFF'}}`);
 if(s.endsWith('/mercadolivre-price-diagnostic'))return mock('export function priceDiagnosticInput(v){return {ean:v.ean,query:"",catalogId:null}}');
 if(s.endsWith('/mercadolivre-access-diagnostic'))return mock('export async function diagnoseMercadoLivreAccess(db,c,input){globalThis.__diagRouteTrace.push("diagnose");globalThis.__diagRouteInput=input;return {accessAudit:{readOnly:true,stockChanged:false,advertisementsChanged:false}}}');
 return next(s,c);
}});
const {POST}=await import('../../app/api/modulos/marketplaces/diagnostico-precos/route.ts');hooks.deregister();
function request(token='admin',extra={}){return new Request('https://avantalab.com.br/api/modulos/marketplaces/diagnostico-precos',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({empresaId:company,connectionId:connection,ean:'7898649372113',...extra})});}
test('diagnóstico recusa anônimo/operador e empresa alheia antes de consultar conta ou provedor',async()=>{
 for(const [token,extra] of [['reader',{}],['admin',{empresaId:crypto.randomUUID()}]]){
  globalThis.__diagRouteTrace=[];const r=await POST(request(token,extra));assert.equal(r.status,403);assert.deepEqual(globalThis.__diagRouteTrace,['authorize']);
 }
});
test('conta fora da empresa não alcança diagnóstico; corpo não pode conferir a si mesmo administração',async()=>{
 globalThis.__diagRouteTrace=[];const r=await POST(request('admin',{connectionId:crypto.randomUUID(),admin:true,role:'administrador'}));assert.equal(r.status,404);assert.deepEqual(globalThis.__diagRouteTrace,['authorize','load']);
});
test('administrador usa conexão da empresa e entrada limitada, com resposta sem cache ou mudança comercial',async()=>{
 globalThis.__diagRouteTrace=[];const r=await POST(request('admin',{path:'https://evil.example',method:'PUT',price:1,stock:0,appId:'999'}));assert.equal(r.status,200);assert.deepEqual(globalThis.__diagRouteTrace,['authorize','load','diagnose']);assert.deepEqual(globalThis.__diagRouteInput,{ean:'7898649372113',query:'',catalogId:null});assert.equal(r.headers.get('cache-control'),'no-store');const j=await r.json();assert.equal(j.account.name,'JEFF');assert.equal(j.result.accessAudit.readOnly,true);assert.equal(j.result.accessAudit.stockChanged,false);assert.equal(j.result.accessAudit.advertisementsChanged,false);
 delete globalThis.__diagRouteTrace;delete globalThis.__diagRouteInput;
});
