import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const root=resolve(import.meta.dirname,'../..');
const access=`export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.message,code:e.code},{status:e.status||503,headers:{'Cache-Control':'no-store'}})};export async function authorizeMarketplace(req,id,permission){if(req.headers.get('authorization')!=='Bearer manager')throw new MarketplaceError(403,'forbidden','Sem permissão');if(permission!=='manage')throw Error('Permissão incorreta');return {db:globalThis.researchDb,empresaId:id,usuario:{id:'actor'}}}`;
const hooks=registerHooks({resolve(specifier,context,next){
  if(specifier==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
  if(specifier==='next/server')return {url:'data:text/javascript,export const NextResponse={json:(v,o)=>Response.json(v,o)}',shortCircuit:true};
  if(specifier.endsWith('/management-access')||specifier==='./management-access')return {url:'data:text/javascript,'+encodeURIComponent(access),shortCircuit:true};
  if(specifier==='./local-products')return {url:'data:text/javascript,'+encodeURIComponent(`export async function getLocalProduct(db,company,id){return db.product(company,id)};export const productCommand=()=>{throw Error('Não deve alterar saldo')}`),shortCircuit:true};
  if(specifier==='./openai-web-price-search')return {url:'data:text/javascript,export async function consultOpenAIWebPrices(input){return globalThis.researchLookup(input)}',shortCircuit:true};
  const file=specifier.startsWith('@/')?resolve(root,specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?resolve(dirname(new URL(context.parentURL).pathname),specifier):null;
  if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,context);return next(specifier,context);
}});
const {researchLocalProductPrice}=await import('../../app/modules/marketplaces/services/local-product-price-research.ts');
const {POST}=await import('../../app/api/modulos/marketplaces/produtos/preco/route.ts');hooks.deregister();
const productId='00000000-0000-4000-8000-000000000001',company='00000000-0000-4000-8000-000000000002';
const input=()=>({productId,revision:1,requestKey:crypto.randomUUID()});
const offers=[{title:'Produto exato',seller:'Loja A',price:100,url:'https://loja.example/a'},{title:'Produto exato',seller:'Loja B',price:120,url:'https://loja.example/b'}];
function mockDb(status){return {from(table){assert.equal(table,'marketplace_products');const filters={},q={select(){return q},eq(k,v){filters[k]=v;return q},is(k,v){filters[k]=v;return q},async maybeSingle(){assert.equal(filters.empresa_id,company);assert.equal(filters.id,productId);return {data:{id:productId,price_cents:11000,revision:2}}}};return q;},calls:[],async product(c,id){assert.equal(c,company);assert.equal(id,productId);return {id,ean:'7908103790527',name:'Produto salvo'};},async rpc(name,args){assert.equal(name,'marketplace_product_price_research');assert.equal(args.p_empresa_id,company);this.calls.push(args);return {data:status?{status,claimed:false}:{status:args.p_action==='claim'?'pending':args.p_action==='fail'?'failed':args.p_offers.length?'updated':'no_offers',claimed:args.p_action==='claim',price_cents:11000,offers_count:args.p_offers.length},error:null};}};}
test('pesquisa usa identidade salva, ignora preço/nome enviados e só conclui com ofertas atuais',async()=>{
  const db=mockDb();globalThis.researchLookup=async value=>{assert.deepEqual(value,{ean:'7908103790527',productName:'Produto salvo'});return {sample:{offers}};};
  const result=await researchLocalProductPrice(db,company,'actor',{...input(),price:1,name:'Outro produto'});
  assert.equal(result.status,'updated');assert.equal(result.priceCents,11000);assert.equal(db.calls.length,2);assert.deepEqual(db.calls[1].p_offers,offers);
  globalThis.researchLookup=async()=>({sample:null});
  assert.equal((await researchLocalProductPrice(mockDb(),company,'actor',input())).status,'no_offers');
});
test('repetição, operação em andamento, conflito e limite não disparam outra pesquisa',async()=>{
  let calls=0;globalThis.researchLookup=async()=>{calls++;return {sample:{offers}};};
  assert.equal((await researchLocalProductPrice(mockDb('updated'),company,'actor',input())).status,'updated');
  for(const [status,code] of [['pending','price_research_busy'],['busy','price_research_busy'],['limited','price_research_limited'],['conflict','price_research_conflict'],['failed','price_research_failed']])await assert.rejects(researchLocalProductPrice(mockDb(status),company,'actor',input()),{code});
  assert.equal(calls,0);
});
test('Atualizar preço também completa ficha no produto local, após confirmar resultado da pesquisa',async()=>{
 const db=mockDb(),rpc=db.rpc.bind(db);let saved;
 db.rpc=async(name,args)=>{if(name==='marketplace_price_product_register'){saved=args;return{data:productId};}return rpc(name,args);};
 globalThis.researchLookup=async()=>({sample:null,product:{ean:null,description:'Descrição confirmada',image:null,attributes:[{id:'MODEL',name:'Modelo',value:'MB7142'}],sources:['https://fabricante.example/modelo']}});
 assert.equal((await researchLocalProductPrice(db,company,'actor',input())).status,'no_offers');assert.equal(saved.p_source_key,`mercado_livre:LOCAL:${productId}`);assert.equal(saved.p_data.attributes[0].value,'MB7142');assert.equal(saved.p_data.description,'Descrição confirmada');assert.equal(saved.p_data.ean,'7908103790527');
});
test('falha registra apenas código seguro, não grava referência e entrada inválida é recusada',async()=>{
  const db=mockDb();globalThis.researchLookup=async()=>{throw Object.assign(Error('Falha segura'),{code:'x-secret-detail'});};
  await assert.rejects(researchLocalProductPrice(db,company,'actor',input()),/Falha segura/);
  assert.deepEqual(db.calls.map(c=>c.p_action),['claim','fail']);assert.equal(db.calls[1].p_error,'research_failed');
  await assert.rejects(researchLocalProductPrice(db,company,'actor',{...input(),revision:'1'}),{code:'invalid_price_research'});
});
test('API exige gestão da empresa e devolve resposta sem cache',async()=>{
  globalThis.researchDb=mockDb();globalThis.researchLookup=async()=>({sample:{offers}});
  const request=token=>new Request('http://localhost/api/modulos/marketplaces/produtos/preco',{method:'POST',headers:{authorization:token,'content-type':'application/json'},body:JSON.stringify({...input(),empresaId:company})});
  assert.equal((await POST(request('Bearer reader'))).status,403);assert.equal(globalThis.researchDb.calls.length,0);
  const result=await POST(request('Bearer manager'));assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal((await result.json()).status,'updated');
  delete globalThis.researchDb;delete globalThis.researchLookup;
});

test('SQL real: preço isolado, média auditada, repetição, corrida, falha, ofertas vazias e permissões',async()=>{
  const db=new PGlite();try{
    await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_products(id uuid primary key,empresa_id uuid,name text,ean text,pictures jsonb,stock_quantity integer,price_cents bigint,publication_form jsonb,revision bigint,archived_at timestamptz,updated_at timestamptz,unique(empresa_id,id));`);
    await db.exec(readFileSync(resolve(root,'supabase/migrations/20261019010000_marketplace_product_price_research.sql'),'utf8'));
    const other=crypto.randomUUID(),actor=crypto.randomUUID();
    await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[actor]);
    await db.query("insert into usuarios_empresa values($1,$2,'ativo','administrador')",[actor,company]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
    await db.query(`insert into marketplace_products values($1,$2,'Nome manual','7908103790527','["https://example.com/manual.jpg"]',7,20000,'{"price":200,"custom":"preservado"}',1,null,now())`,[productId,company]);
    const run=async(action,key,revision=1,data=[],tenant=company)=>(await db.query('select marketplace_product_price_research($1,$2,$3,$4,$5,$6,$7,$8) result',[tenant,actor,productId,revision,key,action,JSON.stringify(data),null])).rows[0].result;
    const current=async()=>(await db.query('select * from marketplace_products where id=$1',[productId])).rows[0];
    const rate=async()=>db.exec("update marketplace_product_price_researches set created_at=now()-interval '3 minutes' where status<>'pending'");
    const key=crypto.randomUUID();assert.equal((await run('claim',key)).claimed,true);
    assert.equal((await run('claim',key)).claimed,false);assert.equal((await run('claim',crypto.randomUUID())).status,'busy');
    const updated=await run('complete',key,1,offers);assert.equal(updated.price_cents,11000);assert.equal(updated.status,'updated');
    const saved=await current();assert.equal(saved.revision,2);assert.equal(saved.stock_quantity,7);assert.equal(saved.name,'Nome manual');assert.deepEqual(saved.pictures,['https://example.com/manual.jpg']);assert.equal(saved.publication_form.custom,'preservado');assert.equal(saved.publication_form.price,110);
    assert.equal((await run('complete',key,1,[{...offers[0],price:999}])).price_cents,11000);assert.equal((await current()).revision,2);
    await assert.rejects(run('claim',key,2),/dados diferentes/);await rate();
    const empty=crypto.randomUUID();await run('claim',empty,2);assert.equal((await run('complete',empty,2)).status,'no_offers');assert.equal((await current()).price_cents,11000);await rate();
    const failure=crypto.randomUUID();await run('claim',failure,2);assert.equal((await run('fail',failure,2)).status,'failed');assert.equal((await current()).revision,2);await rate();
    const conflict=crypto.randomUUID();await run('claim',conflict,2);await db.exec('update marketplace_products set price_cents=9999,revision=3');assert.equal((await run('complete',conflict,2,offers)).status,'conflict');assert.equal((await current()).price_cents,9999);await rate();
    const invalid=crypto.randomUUID();await run('claim',invalid,3);await assert.rejects(run('complete',invalid,3,[{...offers[0],price:-1}]),/Ofertas inválidas/);await run('fail',invalid,3);await rate();
    const expired=crypto.randomUUID();await run('claim',expired,3);await db.query("update marketplace_product_price_researches set created_at=now()-interval '3 minutes' where request_key=$1",[expired]);assert.equal((await run('complete',expired,3,offers)).status,'failed');assert.equal((await current()).price_cents,9999);
    await assert.rejects(run('claim',crypto.randomUUID(),3,[],other),/Sem permissão/);
    for(let i=0;i<5;i++){const k=crypto.randomUUID();assert.equal((await run('claim',k,3)).claimed,true);await run('fail',k,3);}
    assert.equal((await run('claim',crypto.randomUUID(),3)).status,'limited');
    const rights=(await db.query("select relrowsecurity as rls,has_table_privilege('anon','marketplace_product_price_researches','SELECT') as read,has_function_privilege('authenticated','marketplace_product_price_research(uuid,uuid,uuid,bigint,uuid,text,jsonb,text)','EXECUTE') as exec from pg_class where relname='marketplace_product_price_researches'")).rows[0];assert.deepEqual(rights,{rls:true,read:false,exec:false});
    await db.exec(readFileSync(resolve(root,'supabase/migrations/20261024030000_marketplace_price_eight_offers.sql'),'utf8'));
    await db.exec("update marketplace_product_price_researches set created_at=now()-interval '1 hour'");
    const eight=Array.from({length:8},(_,i)=>({...offers[0],price:(i+1)*100,url:'https://loja.example/'+i}));
    const eightKey=crypto.randomUUID();await run('claim',eightKey,3);
    const completedEight=await run('complete',eightKey,3,eight);assert.equal(completedEight.offers_count,8);assert.equal(completedEight.price_cents,45000);assert.equal((await current()).stock_quantity,7);
    const nineKey=crypto.randomUUID();await run('claim',nineKey,4);await assert.rejects(run('complete',nineKey,4,[...eight,offers[0]]),/Ofertas inválidas/);await run('fail',nineKey,4);
    await db.exec("update usuarios_empresa set perfil='operador_simples'");await assert.rejects(run('claim',crypto.randomUUID(),3),/Sem permissão/);
  }finally{await db.close();}
});
