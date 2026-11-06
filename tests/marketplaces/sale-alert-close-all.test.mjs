import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const company='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',user='authenticated-user';
let context;
const mock=source=>({url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true});
const hook=registerHooks({resolve(s,c,next){
 if(s==='server-only')return mock('');
 if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
 if(s.endsWith('/management-access'))return mock(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}};export function managementFailure(e){return Response.json({code:e.code,message:e.message},{status:e.status||503});};export async function authorizeMarketplace(request,company){return globalThis.alertTestAuthorize(company);}`);
 if(s.endsWith('/sale-alert-reads'))return next(new URL('../../app/modules/marketplaces/services/sale-alert-reads.ts',import.meta.url).href,c);
 if(s.endsWith('/listing-model'))return mock('export const uuidIsValid=v=>typeof v===\'string\'&&v.length===36;');
 if(s.endsWith('/inventory-notices'))return mock('export async function readInventoryNotices(){return [];}');
 return next(s,c);
}});
const {POST}=await import('../../app/api/modulos/marketplaces/avisos/route.ts');hook.deregister();
function setup(){
 const alerts=Array.from({length:425},(_,i)=>({id:String(i+1).padStart(6,'0'),empresa_id:company,created_at:'2026-01-01T00:00:00Z'}));alerts.push({id:'999999',empresa_id:company,created_at:'2999-01-01T00:00:00Z'},{id:'000000',empresa_id:other,created_at:'2026-01-01T00:00:00Z'});
 const reads=new Map([[`${user}:000001`,{original:true}]]);let writes=0,pages=0,failPage=0;
 const db={from(table){assert.ok(['marketplace_sale_alerts','marketplace_sale_alert_reads'].includes(table),'não altera pedido, estoque ou outras tabelas');
  if(table==='marketplace_sale_alert_reads')return {async upsert(rows,options){writes++;if(failPage===writes)return {error:{message:'network'}};for(const row of rows){assert.equal(row.empresa_id,company);assert.equal(row.user_id,user);const key=`${row.user_id}:${row.alert_id}`;if(!options.ignoreDuplicates||!reads.has(key))reads.set(key,row);}return {error:null};}};
  const filters={};return {select(){return this;},eq(k,v){filters[k]=v;return this;},lte(k,v){filters.before=v;return this;},gt(k,v){filters.after=v;return this;},order(){return this;},limit(n){filters.limit=n;return this;},then(resolve){pages++;return Promise.resolve({data:alerts.filter(a=>a.empresa_id===filters.empresa_id&&a.created_at<=filters.before&&(!filters.after||a.id>filters.after)).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,filters.limit),error:null}).then(resolve);}};
 }};
 context={db,alerts,reads,get pages(){return pages;},get writes(){return writes;},set failPage(n){failPage=n;},denied:false};
 globalThis.alertTestAuthorize=async requested=>{if(context.denied||requested!==company)throw Object.assign(Error('Sem acesso'),{status:403,code:'forbidden'});return {db,empresaId:company,usuario:{id:user}};};return context;
}
const request=(extra={})=>new Request('http://localhost/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({empresaId:company,action:'acknowledge_all',...extra})});
test('Fechar todos persiste além das 20 notificações, com paginação, sem tocar outra empresa/usuário ou vendas futuras',async()=>{
 const c=setup();let result=await POST(request({userId:'outro-usuario',acknowledgedBefore:'2999-12-31'}));assert.equal(result.status,200);assert.equal(c.pages,3);assert.equal(c.reads.size,425);assert.deepEqual(c.reads.get(`${user}:000001`),{original:true});assert.equal(c.reads.has(`${user}:999999`),false);assert.equal(c.reads.has(`${user}:000000`),false);
 result=await POST(request());assert.equal(result.status,200);assert.equal(c.reads.size,425,'repetir após reload não duplica leituras');
});
test('falha parcial mantém erro visível e nova tentativa completa sem duplicar nem perder avisos novos',async()=>{
 const c=setup();c.failPage=2;assert.equal((await POST(request())).status,503);assert.equal(c.reads.size,200);c.failPage=0;assert.equal((await POST(request())).status,200);assert.equal(c.reads.size,425);assert.equal(c.reads.has(`${user}:999999`),false);
});
test('autorização é exigida antes de qualquer leitura/gravação em lote',async()=>{
 const c=setup();c.denied=true;assert.equal((await POST(request())).status,403);assert.equal(c.writes,0);assert.equal(c.pages,0);c.denied=false;assert.equal((await POST(request({empresaId:other}))).status,403);assert.equal(c.writes,0);
 delete globalThis.alertTestAuthorize;
});
