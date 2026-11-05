import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(s,c,next){
  if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
  if(s.endsWith('/services/product-internal-notes'))return {url:'data:text/javascript,export async function readProductInternalNotes(db,company,ids){return new Map(ids.map(id=>[id,{internalNotes:"",internalNotesRevision:0,internalNotesAvailable:true}]))}',shortCircuit:true};
  if(s==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(v,o)=>Response.json(v,o)}',shortCircuit:true};
  if(s.endsWith('/management-access')||s==='./management-access')return {url:'data:text/javascript,'+encodeURIComponent(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({code:e.code},{status:e.status||503})};export async function authorizeMarketplace(req,id,p){if(p!=='manage'||req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.stockDb,usuario:{id:'actor'}}}`),shortCircuit:true};
  if(s.endsWith('/price-access'))return {url:'data:text/javascript,'+encodeURIComponent(`export async function authorizePriceConsultation(req,id){const token=req.headers.get('authorization');if(!['Bearer manager','Bearer reader','Bearer editor'].includes(token))throw Object.assign(Error('Negado'),{status:401});return {db:globalThis.stockDb,empresaId:id,usuario:{id:'actor'},stockPermission:token==='Bearer editor'&&globalThis.stockPermission===true,perfil:token==='Bearer manager'?'administrador':'consulta_precos'}}`),shortCircuit:true};
  if(s==='./local-products')return {url:'data:text/javascript,'+encodeURIComponent(`export async function getLocalProduct(db,company,id){return db.product(company,id)};export async function productCommand(db,c,a,action,data,key){return db.command(c,a,action,data,key)}`),shortCircuit:true};
  const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {POST}=await import('../../app/api/modulos/marketplaces/precos/estoque/route.ts');
const {registerConsultedProduct}=await import('../../app/modules/marketplaces/services/price-product-stock.ts');hooks.deregister();
const company='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',historyId='00000000-0000-4000-8000-000000000003';
test('API: consulta lê saldo da empresa, só gestão movimenta; inteiro, revisão e chave protegidos',async()=>{
  let quantity=null,revision=1,calls=0;
  globalThis.stockDb={async product(c,p){assert.equal(c,company);assert.equal(p,id);return {id,stock_quantity:quantity,stock_confirmed_at:quantity==null?null:'date',revision};},from(table){assert.equal(table,'marketplace_price_consultations');const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},async maybeSingle(){assert.deepEqual(filters,{empresa_id:company,id:historyId});return {data:{local_product_id:id}}}};return q;},async command(c,a,action,data,key){assert.equal(c,company);assert.equal(a,'actor');assert.equal(action,'confirm_stock');assert.equal(data.physical_confirmation,true);assert.equal(data.revision,revision);assert.match(key,/^[a-f0-9-]{36}$/);calls++;quantity=data.quantity;revision++;}};
  globalThis.stockDb.rpc=async(name,args)=>{assert.equal(name,'marketplace_enqueue_stock');assert.equal(args.p_empresa,company);assert.equal(args.p_product,id);assert.equal(args.p_increase,false);return {error:null};};
  const request=(body,role='manager')=>new Request('http://localhost/api',{method:'POST',headers:{authorization:'Bearer '+role,'content-type':'application/json'},body:JSON.stringify({empresaId:company,historyId,...body})});
  assert.equal((await POST(request({action:'context'},'none'))).status,401);
  let response=await POST(request({action:'context'},'reader'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).stock.canManage,false);
  assert.equal((await POST(request({action:'set',quantity:3,revision:1,requestKey:crypto.randomUUID()},'reader'))).status,403);assert.equal(calls,0);
  for(const value of [-1,1.5,'3',100000])assert.equal((await POST(request({action:'set',quantity:value,revision:1,requestKey:crypto.randomUUID()}))).status,400);
  response=await POST(request({action:'set',quantity:3,revision:1,requestKey:crypto.randomUUID()}));assert.equal(response.status,200);assert.equal((await response.json()).stock.quantity,3);assert.equal(calls,1);
  response=await POST(request({action:'set',quantity:0,revision:2,requestKey:crypto.randomUUID()}));assert.equal((await response.json()).stock.confirmed,true);assert.equal(quantity,0);
  assert.equal((await POST(request({action:'set',quantity:0,revision:3,requestKey:crypto.randomUUID()}))).status,200);assert.equal(calls,3,'Confirmar 0 → 0 registra a conferência sem adicionar unidades');
  response=await POST(request({action:'set',quantity:5,revision:4,requestKey:crypto.randomUUID()}));assert.equal((await response.json()).stock.quantity,5);assert.equal(calls,4,'repor saldo zero altera o mesmo cadastro');
  assert.equal((await POST(request({action:'other'}))).status,400);
  globalThis.stockPermission=true;
  response=await POST(request({action:'context'},'editor'));assert.equal((await response.json()).stock.canManage,true);
  response=await POST(request({action:'set',quantity:8,revision:5,requestKey:crypto.randomUUID()},'editor'));assert.equal(response.status,200);assert.equal((await response.json()).stock.quantity,8);
  globalThis.stockPermission=false;
  assert.equal((await POST(request({action:'set',quantity:9,revision:6,requestKey:crypto.randomUUID()},'editor'))).status,403);assert.equal(quantity,8);
  delete globalThis.stockPermission;
  delete globalThis.stockDb;
});
test('registro usa apenas campos de produto sanitizados e não passa estoque do navegador',async()=>{
  const db={async rpc(name,args){assert.equal(name,'marketplace_price_product_register');assert.equal(args.p_empresa_id,company);assert.equal(args.p_source_key,'mercado_livre:MLB1');assert.equal(args.p_data.name,'Produto');assert.equal(args.p_data.price_cents,10000);assert.equal(args.p_data.image,null);assert.equal(args.p_data.stock_quantity,undefined);return {data:id};}};
  assert.equal(await registerConsultedProduct(db,company,'actor',{id:'MLB1',name:'Produto',image:'javascript:bad',stock_quantity:500},'7908103790527',100),id);
});

test('repetir confirmação de zero com resposta perdida recupera recibo, sem nova movimentação',async()=>{
  const {setConsultedProductStock}=await import('../../app/modules/marketplaces/services/price-product-stock.ts');
  let quantity=4,revision=1,movements=0;const receipts=new Map();
  const db={async rpc(){return {error:null};},async product(){return {id,stock_quantity:quantity,stock_confirmed_at:'date',revision};},async command(c,a,action,data,key){
    const payload=JSON.stringify(data);
    if(receipts.has(key)){assert.equal(receipts.get(key),payload);return;}
    if(data.revision!==revision)throw Error('revisão obsoleta');
    receipts.set(key,payload);quantity=data.quantity;revision++;movements++;
  }};
  const input={productId:id,quantity:0,revision:1,requestKey:crypto.randomUUID()};
  assert.equal((await setConsultedProductStock(db,company,'actor',input)).quantity,0);
  assert.equal((await setConsultedProductStock(db,company,'actor',input)).quantity,0);
  assert.equal(movements,1);
  await assert.rejects(setConsultedProductStock(db,company,'actor',{...input,requestKey:crypto.randomUUID()}),/revisão obsoleta/);
  assert.equal((await setConsultedProductStock(db,company,'actor',{...input,revision:2,requestKey:crypto.randomUUID()})).quantity,0);
  assert.equal(movements,2);
  delete globalThis.stockDb;
});
test('reenfileira somente zero confirmado sem pendência e nunca autoriza reposição; falha da fila não declara pausa',async()=>{
 const {enqueueConfirmedZero}=await import('../../app/modules/marketplaces/services/zero-stock.ts');const calls=[],db={rpc:async(name,args)=>{calls.push({name,args});return {error:null};}};
 const p={id,stock_quantity:0,stock_confirmed_at:'date',listing_stock_review_at:null};
 for(const extra of [{stock_quantity:null},{stock_quantity:2},{stock_confirmed_at:null},{listing_stock_review_at:'review'}])await enqueueConfirmedZero(db,company,{...p,...extra});assert.equal(calls.length,0);
 await enqueueConfirmedZero(db,company,p);assert.deepEqual(calls,[{name:'marketplace_enqueue_stock',args:{p_empresa:company,p_product:id,p_increase:false}}]);
 await assert.rejects(enqueueConfirmedZero({rpc:async()=>({error:{code:'network'}})},company,p),e=>e.code==='zero_stock_queue_pending'&&/saldo zero foi confirmado/i.test(e.message));
});
