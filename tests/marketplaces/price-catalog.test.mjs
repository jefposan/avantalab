import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
const mock=source=>({url:'data:text/javascript,'+encodeURIComponent(source),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
  if(s==='server-only')return mock('export {}');
  if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
  if(s.endsWith('/management-access')||s==='./management-access')return mock(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({code:e.code},{status:e.status||503})};export async function authorizeMarketplace(){throw Error('Sem gravações no catálogo')}`);
  if(s.endsWith('/price-access'))return mock(`export async function authorizePriceConsultation(req,id){if(req.headers.get('authorization')!=='Bearer valid'||id!=='company')throw Object.assign(Error('Negado'),{status:403});return {db:globalThis.catalogDb,empresaId:id}}`);
  if(s.endsWith('/local-price-consultation'))return mock(`export async function consultLocalPrice(){throw Error('Sem consulta ou gravação na listagem')};export async function editLocalReference(){throw Error('Sem edição')}`);
  if(s.endsWith('/local-product-price-research'))return mock(`export async function researchLocalProductPrice(){throw Error('Sem pesquisa externa')}`);
  if(s.startsWith('@/'))return next(new URL('../../'+s.slice(2)+'.ts',import.meta.url).href,c);
  if(s.startsWith('.')&&!s.endsWith('.ts')&&c.parentURL?.includes('/app/'))return next(new URL(s+'.ts',c.parentURL).href,c);
  return next(s,c);
}});
const {GET}=await import('../../app/api/modulos/marketplaces/precos/produto/route.ts');hooks.deregister();
function database(rows,fail=false){const calls=[];return{calls,from(table){assert.equal(table,'marketplace_products');const filters=[];let range,ids;const q={select(){return q;},eq(k,v){filters.push(p=>p[k]===v);return q;},is(k,v){filters.push(p=>p[k]===v);return q;},order(){return q;},range(a,b){range=[a,b];return q;},in(k,v){assert.ok(v.length<=25);ids=v;return q;},abortSignal(s){assert.ok(s instanceof AbortSignal);return q;},then(done){calls.push({range,ids});let data=rows.filter(p=>filters.every(f=>f(p))&&(!ids||ids.includes(p.id)));const count=data.length;if(range)data=data.slice(range[0],range[1]+1);return Promise.resolve(done({data,error:fail?{message:'Falha'}:null,count}));}};return q;}};}
const request=(q='',page=1,token='valid',company='company',sort='alpha')=>new Request(`http://localhost/api?empresaId=${company}&q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`,{headers:{authorization:'Bearer '+token}});
const row=(i,extra={})=>({id:String(i),empresa_id:'company',archived_at:null,name:'Produto '+i,sku:'',ean:null,description:'Hidratação intensa',price_cents:null,stock_quantity:0,stock_confirmed_at:null,...extra});
test('catálogo usa todos os cadastros do perfil, inclusive sem consulta/preço/saldo, pesquisa descrição e EAN além de mil itens',async()=>{
  const rows=Array.from({length:1125},(_,i)=>row(i));rows[1124].ean='7891129598607';rows.push(row('other',{empresa_id:'other'}),row('archived',{archived_at:'date'}));
  globalThis.catalogDb=database(rows);
  let response=await GET(request('hidratacao intensa',45));assert.equal(response.status,200);let body=await response.json();assert.equal(body.total,1125);assert.equal(body.products.length,25);assert.equal(body.products[0].id,'1100');assert.equal(body.products[0].price_cents,null);
  response=await GET(request('7891129598607'));body=await response.json();assert.equal(body.products[0].id,'1124');assert.equal(body.total,1);
  response=await GET(request('',46));body=await response.json();assert.equal(body.products.length,0);assert.equal(body.total,1125);
  for(const args of [['',1,'invalid'],['',1,'valid','other']])assert.equal((await GET(request(...args))).status,403);
  assert.equal((await GET(request('',0))).status,400);
  globalThis.catalogDb=database(rows,true);assert.equal((await GET(request('produto'))).status,503);delete globalThis.catalogDb;
});
test('PWA busca no servidor, descarta respostas antigas e mantém últimas consultas em dez sem transformar catálogo em histórico',()=>{
  const client=readFileSync('app/marketplaces/consulta/MarketplaceMobileApp.tsx','utf8');
  assert.match(client,/body.history.slice\(0, 10\)/);assert.match(client,/setLoadedCatalogKey\(catalogKey\)/);assert.match(client,/controller.abort\(\)/);
  assert.match(client,/productId: product.id/);assert.match(client,/openCatalogProduct\(item\)/);
  assert.doesNotMatch(client,/view=catalog/);assert.match(client,/Buscar todos os produtos da empresa/);
  const history=readFileSync('app/api/modulos/marketplaces/precos/historico/route.ts','utf8');assert.match(history,/catalog \? 1_000 : 10/);
});
test('ordenações e filtros são aplicados antes da paginação, em todas as contas/estoques da empresa',async()=>{
 for(const [sort,column,ascending]of [['alpha','name',true],['date','updated_at',false],['created','created_at',false],['advertised','name',true],['with_stock','name',true],['without_stock','name',true]]){
  const calls=[];
  globalThis.catalogDb={from(table){assert.equal(table,'marketplace_products');const q=new Proxy({then(done){return Promise.resolve(done({data:[],count:32,error:null}));}},{get(target,key){if(key==='then')return target.then;return (...args)=>{calls.push([key,...args]);return q;};}});return q;}};
  const r=await GET(request('',2,'valid','company',sort));assert.equal(r.status,200);assert.equal((await r.json()).total,32);
  assert.ok(calls.some(([method,key,options])=>method==='order'&&key===column&&options.ascending===ascending));
  const range=calls.findIndex(([method])=>method==='range');assert.deepEqual(calls[range],['range',25,49]);
  assert.ok(calls.some(([method,key,value])=>method==='eq'&&key==='empresa_id'&&value==='company'));
  if(sort==='advertised'){
   assert.ok(calls.some(([method,key,value])=>method==='eq'&&key==='publication_link.empresa_id'&&value==='company'));
   assert.ok(calls.some(([method,value,options])=>method==='or'&&value.includes('active,published')&&options.referencedTable==='publication_link'));
   assert.ok(calls.findIndex(([method,key])=>method==='not'&&key==='publication_link')<range);
  }
  if(sort.includes('stock')){
   assert.ok(calls.some(([method,key,value])=>method==='gt'&&key==='stock_balance.quantity'&&value===0));
   for(const key of ['stock_balance.empresa_id','stock_balance.warehouse.empresa_id'])assert.ok(calls.some(([method,k,value])=>method==='eq'&&k===key&&value==='company'));
   assert.ok(calls.some(([method,key,value])=>method==='is'&&key==='stock_balance.warehouse.archived_at'&&value===null));
   assert.ok(calls.findIndex(([method,key])=>method===(sort==='with_stock'?'not':'is')&&key==='stock_balance')<range);
   assert.ok(!calls.some(([method,key])=>method==='gt'&&key==='stock_quantity'),'considera saldos separados, não apenas o legado Online');
  }
 }
 assert.equal((await GET(request('',1,'valid','company','invalid'))).status,400);delete globalThis.catalogDb;
});

test('estoque selecionado filtra saldos positivos antes da contagem, pesquisa e paginação e informa quantidade exata',async()=>{
 const online='00000000-0000-4000-8000-000000000001',saldao='00000000-0000-4000-8000-000000000002';
 const source=Array.from({length:65},(_,i)=>row(i,{name:'Air Fryer '+i,stock_balance:[{warehouse_id:online,quantity:i<45?1:0},{warehouse_id:saldao,quantity:i<30?i+2:0}]}));
 const calls=[];
 globalThis.catalogDb={from(table){
  if(table==='marketplace_warehouses'){
   const filters={};const q={select(){return q},eq(k,v){filters[k]=v;return q},is(){return q},async maybeSingle(){assert.equal(filters.empresa_id,'company');return {data:[online,saldao].includes(filters.id)?{id:filters.id}:null}}};return q;
  }
  assert.equal(table,'marketplace_products');let range,ids,warehouse;
  const q=new Proxy({then(done){let rows=source.map(p=>({...p,stock_balance:p.stock_balance.filter(b=>b.warehouse_id===warehouse&&b.quantity>0)})).filter(p=>p.stock_balance.length&&(!ids||ids.includes(p.id)));const count=rows.length;if(range)rows=rows.slice(range[0],range[1]+1);return Promise.resolve(done({data:rows,count,error:null}));}},{get(t,key){if(key==='then')return t.then;return(...args)=>{calls.push([key,...args]);if(key==='range')range=args;if(key==='in'&&args[0]==='id')ids=args[1];if(key==='eq'&&args[0]==='stock_balance.warehouse_id')warehouse=args[1];return q;};}});return q;
 }};
 const get=(id,page=1,query='')=>GET(new Request(`http://local/api?empresaId=company&warehouseId=${id}&page=${page}&q=${encodeURIComponent(query)}`,{headers:{authorization:'Bearer valid'}}));
 let r=await get(saldao,2);assert.equal(r.status,200);let b=await r.json();assert.equal(b.total,30);assert.equal(b.products.length,5);assert.equal(b.products[0].selected_stock_quantity,27);assert.equal(b.products.at(-1).id,'29');
 assert.ok(calls.findIndex(([k,f,v])=>k==='eq'&&f==='stock_balance.warehouse_id'&&v===saldao)<calls.findIndex(([k])=>k==='range'));
 assert.ok(calls.some(([k,f,v])=>k==='gt'&&f==='stock_balance.quantity'&&v===0));
 b=await(await get(online,2)).json();assert.equal(b.total,45);assert.equal(b.products.length,20);assert.ok(b.products.every(p=>p.selected_stock_quantity===1));
 b=await(await get(saldao,1,'air fryer 29')).json();assert.equal(b.total,1);assert.equal(b.products[0].id,'29');assert.equal(b.products[0].selected_stock_quantity,31);
 assert.equal((await get('invalid')).status,400);assert.equal((await get('00000000-0000-4000-8000-000000000003')).status,404);
 delete globalThis.catalogDb;
});
