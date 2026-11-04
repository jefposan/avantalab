import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const root=resolve(import.meta.dirname,'../..'),mock=src=>({url:'data:text/javascript,'+encodeURIComponent(src),shortCircuit:true});
const hooks=registerHooks({resolve(s,c,next){
  if(s==='server-only')return mock('export {}');
  if(s==='next/server')return mock('export const NextResponse={json:(v,o)=>Response.json(v,o)}');
  if(s.endsWith('/management-access')||s==='./management-access')return mock(`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message},{status:e.status||503})};export async function authorizeMarketplace(req,id,mode){if(mode!=='manage'||req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Negado');return {db:globalThis.localPriceDb,empresaId:id,usuario:{id:'actor'}}}`);
  if(s.endsWith('/price-access'))return mock(`export async function authorizePriceConsultation(req,id){if(!req.headers.get('authorization'))throw Object.assign(Error('Negado'),{status:401});return {db:globalThis.localPriceDb,empresaId:id,usuario:{id:'actor'}}}`);
  if(s.endsWith('/price-settings')||s==='./price-settings')return mock(`export async function readPriceSettings(){return {percentages:{minimum:50,medium:70,ideal:90}}}`);
  if(s==='./mercadolivre-price-consultation')return mock(`export function calculatePriceSuggestions(p){return {market:p[0]/100,minimum:p[0]/200,medium:p[0]*.007,ideal:p[0]*.009}}`);
  if(s==='./local-products')return mock(`export async function getLocalProduct(db,c,id){return db.product(c,id)};export async function productCommand(db,c,a,action,data,key){return db.command(c,a,action,data,key)}`);
  if(s.endsWith('/local-product-price-research'))return mock(`export async function researchLocalProductPrice(db,c,a,body){globalThis.explicitResearches++;return {status:'no_offers',message:'Sem ofertas; referência mantida.'}}`);
  const file=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,c);return next(s,c);
}});
const {consultLocalPrice,editLocalReference}=await import('../../app/modules/marketplaces/services/local-price-consultation.ts');
const {POST,PATCH}=await import('../../app/api/modulos/marketplaces/precos/produto/route.ts');hooks.deregister();
const company='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
function dbFake(){const product={id,name:'Nome manual',ean:'7908103790527',description:'Texto manual',pictures:['https://loja.example/manual.jpg'],attributes:[],category_id:'',revision:3,price_cents:20000,stock_quantity:7};return {current:product,writes:0,snapshots:0,matches:[{id}],filters:[],async product(c,p){assert.equal(c,company);assert.equal(p,id);return {...this.current};},async rpc(name,args){assert.equal(name,'marketplace_price_reference_edit');assert.deepEqual(Object.keys(args).sort(),['p_actor_id','p_empresa_id','p_price_cents','p_product_id','p_request_key','p_revision']);const c=args.p_empresa_id,a=args.p_actor_id,data={revision:args.p_revision,price_cents:args.p_price_cents,pictures:product.pictures,name:product.name},key=args.p_request_key,action='update';assert.equal(c,company);assert.equal(a,'actor');assert.equal(action,'update');assert.equal(data.stock_quantity,undefined);assert.deepEqual(data.pictures,product.pictures);assert.equal(data.name,product.name);assert.equal(data.revision,this.current.revision);assert.match(key,/^[a-f0-9-]{36}$/);this.writes++;this.current.price_cents=data.price_cents;this.current.revision++;return {data:{}};},from(table){const filters={};const self=this,q={select(){return q},eq(k,v){filters[k]=v;return q},is(k,v){filters[k]=v;return q},in(k,v){filters[k]=v;return q},limit(){return q},order(){return q},then(done){self.filters.push(filters);done({data:self.matches});},async maybeSingle(){assert.equal(filters.empresa_id,company);if(table==='marketplace_products'){assert.equal(filters.id,id);assert.equal(filters.archived_at,null);return {data:{...self.current}};}assert.equal(filters.local_product_id,id);return {data:{id:'snapshot',product_name:product.name,product_description:product.description,image_url:product.pictures[0],ean:product.ean,minimum_price_cents:10000,medium_price_cents:14000,ideal_price_cents:18000}}},insert(data){self.snapshots++;assert.equal(data.sample_source,'local_reference');assert.equal(data.provider_product_id,`LOCAL:${id}`);assert.equal(data.stock_quantity,undefined);return {select(){return {async single(){return {data:{id:'new-snapshot'}}}}}}}};assert.ok(['marketplace_products','marketplace_price_consultations'].includes(table));return q;}};}
test('EAN existente exibe cadastro/saldo preservados sem nova pesquisa, inserção ou alteração do produto',async()=>{
  const db=dbFake();const result=await consultLocalPrice(db,company,'actor',{ean:'07908103790527'});
  assert.equal(result.localProductId,id);assert.equal(result.localProductRevision,3);assert.equal(result.historyId,'snapshot');assert.equal(result.prices.market,200);assert.equal(result.sample.source,'local_reference');assert.equal(db.current.stock_quantity,7);assert.equal(db.writes,0);assert.equal(db.snapshots,0);assert.ok(db.filters[0].ean.includes('7908103790527'));
  db.current.price_cents=null;const empty=await consultLocalPrice(db,company,'actor',{productId:id});assert.equal(empty.prices,undefined);assert.equal(db.writes,0);assert.equal(db.snapshots,0);
  db.matches=[];assert.equal(await consultLocalPrice(db,company,'actor',{ean:'7908103790527'}),null);
  db.matches=[{id},{id:'other'}];await assert.rejects(consultLocalPrice(db,company,'actor',{ean:'7908103790527'}),{code:'ambiguous_product'});
});
test('edição explícita grava só referência do mesmo produto e preserva estoque/fotos; revisão protege concorrência',async()=>{
  const db=dbFake(),body={productId:id,revision:3,marketPrice:'250,00',requestKey:crypto.randomUUID()};
  assert.equal(await editLocalReference(db,company,'actor',body),id);assert.equal(db.current.price_cents,25000);assert.equal(db.current.stock_quantity,7);assert.equal(db.writes,1);
  await assert.rejects(editLocalReference(db,company,'actor',{...body,marketPrice:300}),{code:'product_conflict'});
  await editLocalReference(db,company,'actor',{...body,revision:4});assert.equal(db.writes,1,'valor igual não grava de novo');
  for(const amount of [-1,0,'texto','10,999'])await assert.rejects(editLocalReference(db,company,'actor',{...body,revision:4,marketPrice:amount}),{code:'invalid_reference'});
});
test('API permite edição e pesquisa a usuários de consulta; pesquisa só na ação explícita',async()=>{
  globalThis.localPriceDb=dbFake();globalThis.explicitResearches=0;
  const request=(body,role='reader')=>new Request('http://localhost/api',{method:'POST',headers:role?{authorization:'Bearer '+role}:{},body:JSON.stringify({empresaId:company,productId:id,...body})});
  assert.equal((await POST(request({},''))).status,401);let response=await POST(request({}));assert.equal(response.status,200);assert.equal(globalThis.explicitResearches,0);assert.equal(globalThis.localPriceDb.writes,0);
  assert.equal((await PATCH(request({action:'research',revision:3,requestKey:crypto.randomUUID()},''))).status,401);assert.equal(globalThis.explicitResearches,0);
  response=await PATCH(request({action:'edit',revision:3,marketPrice:'250,00',requestKey:crypto.randomUUID()}));assert.equal(response.status,200);assert.equal(globalThis.localPriceDb.current.price_cents,25000);assert.equal(globalThis.localPriceDb.current.stock_quantity,7);
  response=await PATCH(request({action:'research',revision:4,requestKey:crypto.randomUUID()},'reader'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(globalThis.explicitResearches,1);
  delete globalThis.localPriceDb;delete globalThis.explicitResearches;
});
test('SQL real: snapshot LOCAL nunca duplica produto, nem sem EAN, e não confirma/soma unidades',async()=>{
  const db=new PGlite();try{
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);create table modulos(id text,superficies text[]);`);
    for(const file of ['20261011200000_marketplace_local_products.sql','20261005213000_marketplace_price_consultations.sql','20261005221000_marketplace_price_manual_reference.sql','20261006162000_marketplace_price_history_reuse.sql','20261007114000_marketplace_price_openai_sources.sql','20261019020000_marketplace_price_products_stock.sql','20261019030000_marketplace_local_reference.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
    const actor=crypto.randomUUID(),other=crypto.randomUUID();await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[actor]);
    await db.query(`insert into marketplace_products(id,empresa_id,name,price_cents,stock_quantity,stock_confirmed_at,pictures) values($1,$2,'Nome manual',20000,7,now(),'["https://loja.example/manual.jpg"]')`,[id,company]);
    const insert=async tenant=>db.query(`insert into marketplace_price_consultations(empresa_id,created_by,input_type,input_value,provider_product_id,product_name,market_price_cents,minimum_price_cents,medium_price_cents,ideal_price_cents,sample_count,sample_min_cents,sample_max_cents,sample_source) values($1,$2,'text','Nome manual',$3,'Nome manual',20000,10000,14000,18000,1,20000,20000,'local_reference') returning local_product_id`,[tenant,actor,'LOCAL:'+id]);
    for(let n=0;n<3;n++)assert.equal((await insert(company)).rows[0].local_product_id,id);
    assert.equal((await db.query('select count(*)::int n from marketplace_products')).rows[0].n,1);const p=(await db.query('select * from marketplace_products')).rows[0];assert.equal(p.stock_quantity,7);assert.equal(p.price_cents,20000);assert.equal(p.revision,1);assert.deepEqual(p.pictures,['https://loja.example/manual.jpg']);
    assert.equal((await db.query('select count(*)::int n from marketplace_stock_movements')).rows[0].n,0);await assert.rejects(insert(other),/não encontrado/);
  }finally{await db.close();}
});
