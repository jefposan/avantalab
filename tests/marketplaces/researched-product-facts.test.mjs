import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {existsSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {createSearchRenderFixture} from './price-search-render-harness.mjs';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(specifier==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error { constructor(status,code,message){super(message);this.status=status;this.code=code;} }',shortCircuit:true};
 if(specifier==='./mercadolivre-management')return{url:'data:text/javascript,export async function mlRequest(db,connection,path){return globalThis.factsMlRequest(path)}',shortCircuit:true};
 if(specifier==='./profile-catalog')return{url:'data:text/javascript,export async function lookupProfileCatalogByEan(){return {status:"not_found"}}',shortCircuit:true};
 if(specifier==='./local-products')return{url:'data:text/javascript,export const getLocalProduct=()=>{};export const productCommand=()=>{}',shortCircuit:true};
 const file=specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?resolve(dirname(new URL(context.parentURL).pathname),specifier):null;
 if(file&&existsSync(file+'.ts'))return next(pathToFileURL(file+'.ts').href,context);return next(specifier,context);
}});
const {readWebProductFacts,canonicalProductAttributes,completeProductFacts}=await import('../../app/modules/marketplaces/services/web-product-facts.ts');
const {registerConsultedProduct}=await import('../../app/modules/marketplaces/services/price-product-stock.ts');
const {consultOpenAIWebPrices}=await import('../../app/modules/marketplaces/services/openai-web-price-search.ts');
const {identifyMercadoLivreCatalog}=await import('../../app/modules/marketplaces/services/mercadolivre-catalog.ts');
const {consultMercadoLivrePrice}=await import('../../app/modules/marketplaces/services/mercadolivre-price-consultation.ts');hooks.deregister();
const source='https://fabricante.example/calculadora-mb7142',ean='7891129598607';
const field=value=>({value,source_url:source});
const product=()=>({name:'Calculadora Elgin MB7142',exact_match:true,ean:field(ean),description:field('Descrição de teste, não é ficha real.'),image:field('https://cdn.example/foto.jpg'),attributes:[{id:'BRAND',name:'Marca',...field('Elgin')},{id:'MODEL',name:'Modelo',...field('MB7142')}]});
const input={ean:null,productName:'Calculadora Elgin MB7142'};
test('ficha exata com fonte consultada retorna EAN, descrição, foto e características',()=>{
 const facts=readWebProductFacts(product(),input,[source]);assert.equal(facts.ean,ean);assert.equal(facts.attributes.find(a=>a.id==='MODEL').value,'MB7142');assert.equal(facts.image,'https://cdn.example/foto.jpg');assert.deepEqual(facts.sources,[source]);
 assert.equal(readWebProductFacts(product(),input,[]),null);assert.equal(readWebProductFacts({...product(),name:'Calculadora Elgin MB7143'},input,[source]),null);assert.equal(readWebProductFacts({...product(),exact_match:false},input,[source]),null);
});
test('não deduz EAN: recusa dígito inválido, SKU e conflito de variante conhecida',()=>{
 for(const code of ['7891129598600','SKU-'+ean,'MB7142'])assert.equal(readWebProductFacts({...product(),ean:field(code)},input,[source]).ean,null);
 assert.equal(readWebProductFacts(product(),{...input,ean:'7908103790527'},[source]),null);
 const partial=readWebProductFacts({...product(),ean:{value:null,source_url:null}},input,[source]);assert.equal(partial.ean,null);assert.equal(partial.attributes.some(a=>a.id==='GTIN'),false);
});
test('normalização mantém value já canônico, aceita value_name ML e completa sem trocar manual',()=>{
 assert.deepEqual(canonicalProductAttributes([{id:'BRAND',name:'Marca',value:'Elgin'},{id:'MODEL',name:'Modelo',value_name:'MB7142'}]),[{id:'BRAND',name:'Marca',value:'Elgin'},{id:'MODEL',name:'Modelo',value:'MB7142'}]);
 const enriched=completeProductFacts({description:'Manual',image:'https://manual.example/foto.jpg',attributes:[{id:'BRAND',name:'Marca',value:'Manual'}]},readWebProductFacts(product(),input,[source]));
 assert.equal(enriched.description,'Manual');assert.equal(enriched.image,'https://manual.example/foto.jpg');assert.equal(enriched.attributes.find(a=>a.id==='BRAND').value,'Manual');assert.equal(enriched.attributes.find(a=>a.id==='MODEL').value,'MB7142');
});
test('registro automático transmite características canônicas e fonte para o cadastro',async()=>{
 let call;const id=crypto.randomUUID();const db={rpc:async(name,args)=>{call={name,args};return{data:id};}};
 assert.equal(await registerConsultedProduct(db,'empresa','ator',{id:'MLB1',name:'Teste',attributes:[{id:'MODEL',name:'Modelo',value:'MB7142'}],sources:[source]},ean),id);
 assert.equal(call.args.p_data.attributes[0].value,'MB7142');assert.deepEqual(call.args.p_data.sources,[source]);assert.equal(call.args.p_data.ean,ean);assert.equal(call.name,'marketplace_price_product_register');
});
test('consulta EAN conserva galeria do catálogo até o registro do produto, sem reduzir à capa',async()=>{
 const secret=process.env.MARKETPLACE_SECRETS_KEY;process.env.MARKETPLACE_SECRETS_KEY='test-only';
 const pictures=['a','b','c'].map(id=>({id:'photo-'+id,url:'https://http2.mlstatic.com/'+id+'.jpg'}));
 const row={id:'MLB123',name:input.productName,domain_id:'MLB-CALCULATORS',status:'active',attributes:[{id:'GTIN',value_name:ean}],pictures};
 globalThis.factsMlRequest=async path=>path.startsWith('/products/search')?{results:[row]}:row;
 try{
  const result=await consultMercadoLivrePrice({}, {empresa_id:'company'}, {ean,manualPrice:100});
  assert.equal(result.product.pictures.length,3);assert.equal(result.product.image,pictures[0].url);
  let saved;await registerConsultedProduct({rpc:async(name,args)=>{saved={name,args};return{data:crypto.randomUUID()};}},'company','actor',result.product,ean);
  assert.equal(saved.name,'marketplace_price_product_register_gallery');assert.deepEqual(saved.args.p_data.pictures,pictures.map(p=>p.url));
 }finally{delete globalThis.factsMlRequest;if(secret===undefined)delete process.env.MARKETPLACE_SECRETS_KEY;else process.env.MARKETPLACE_SECRETS_KEY=secret;}
});
test('Responses conserva preços e ficha opcional só com fonte real do web_search',async()=>{
 const fetch=globalThis.fetch;const key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';
 try{globalThis.fetch=async(_url,options)=>{const request=JSON.parse(options.body);assert.ok(request.text.format.schema.required.includes('product'));assert.ok(request.include.includes('web_search_call.action.sources'));return Response.json({output:[{type:'web_search_call',action:{sources:[{url:source}]}},{content:[{type:'output_text',text:JSON.stringify({offers:[],product:product()})}]}]});};
  const result=await consultOpenAIWebPrices(input);assert.equal(result.sample,null);assert.equal(result.product.ean,ean);
 }finally{globalThis.fetch=fetch;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}
});
test('consulta por descrição recupera GTIN único da ficha; múltiplos GTINs não escolhem EAN arbitrário',async()=>{
 const secret=process.env.MARKETPLACE_SECRETS_KEY;process.env.MARKETPLACE_SECRETS_KEY='test-only';let gtins=[ean];
 const row=()=>({id:'MLB123',name:input.productName,domain_id:'MLB-CALCULATORS',status:'active',attributes:[{id:'GTIN',value_name:gtins.join(',')} ]});
 globalThis.factsMlRequest=async path=>path.startsWith('/products/search')?{results:[row()]}:row();
 try{assert.equal((await identifyMercadoLivreCatalog({}, {}, {query:input.productName})).ean,ean);gtins=[ean,'7908103790527'];assert.equal((await identifyMercadoLivreCatalog({}, {}, {query:input.productName})).ean,undefined);}
 finally{delete globalThis.factsMlRequest;if(secret===undefined)delete process.env.MARKETPLACE_SECRETS_KEY;else process.env.MARKETPLACE_SECRETS_KEY=secret;}
});
test('fluxo real de consulta retorna ficha web mesmo sem preço: EAN e características vão ao registro',async()=>{
 const fetch=globalThis.fetch,key=process.env.OPENAI_API_KEY,secret=process.env.MARKETPLACE_SECRETS_KEY;process.env.OPENAI_API_KEY='test-only';process.env.MARKETPLACE_SECRETS_KEY='test-only';
 const row={id:'MLB123',name:input.productName,domain_id:'MLB-CALCULATORS',status:'active',attributes:[]};globalThis.factsMlRequest=async path=>path.startsWith('/products/search')?{results:[row]}:row;
 globalThis.fetch=async()=>Response.json({output:[{type:'web_search_call',action:{sources:[{url:source}]}},{content:[{type:'output_text',text:JSON.stringify({offers:[],product:product()})}]}]});
 try{const result=await consultMercadoLivrePrice({}, {empresa_id:'company'}, {query:input.productName});assert.equal(result.ean,ean);assert.equal(result.product.attributes.find(a=>a.id==='MODEL').value,'MB7142');assert.equal(result.product.description,'Descrição de teste, não é ficha real.');assert.deepEqual(result.product.sources,[source]);assert.equal(result.prices,undefined);}
 finally{globalThis.fetch=fetch;delete globalThis.factsMlRequest;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;if(secret===undefined)delete process.env.MARKETPLACE_SECRETS_KEY;else process.env.MARKETPLACE_SECRETS_KEY=secret;}
});
test('SQL real: completa campos por empresa sem duplicar, substituir manual ou alterar saldo/preço',async()=>{
 const db=new PGlite();try{
  await db.exec(`create schema auth;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table empresas(id uuid primary key);create table usuarios_empresa(user_id uuid,empresa_id uuid,status text,perfil text);create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);create table marketplace_connections(id uuid primary key,empresa_id uuid,provider text);`);
  await db.exec(readFileSync('tests/fixtures/sql-historico/20261011200000_marketplace_local_products.sql','utf8'));
  await db.exec(`create table marketplace_price_consultations(id uuid primary key default gen_random_uuid(),empresa_id uuid,created_by uuid,provider_product_id text,product_name text,ean text,product_description text,image_url text,market_price_cents bigint,created_at timestamptz default now());`);
  await db.exec(readFileSync('supabase/migrations/20261019020000_marketplace_price_products_stock.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20261021040000_marketplace_researched_product_facts.sql','utf8'));
  const company=crypto.randomUUID(),other=crypto.randomUUID(),actor=crypto.randomUUID();await db.query('insert into empresas values($1),($2)',[company,other]);await db.query('insert into auth.users values($1)',[actor]);
  const register=async(data,tenant=company,key='mercado_livre:MLB1')=>(await db.query('select marketplace_price_product_register($1,$2,$3,$4) id',[tenant,actor,key,JSON.stringify(data)])).rows[0].id;
  const id=await register({name:'Nome manual',description:'Manual',image:'https://manual.example/foto.jpg',price_cents:12300,attributes:[{id:'BRAND',name:'Marca',value:'Manual'}]});
  await db.query('update marketplace_products set stock_quantity=7,stock_confirmed_at=now(),stock_confirmed_by=$2 where id=$1',[id,actor]);
  const facts={name:'Não substituir',description:'Web',image:'https://web.example/foto.jpg',price_cents:999,ean,attributes:[{id:'BRAND',name:'Marca',value:'Elgin'},{id:'MODEL',name:'Modelo',value:'MB7142'}],sources:[source]};
  assert.equal(await register(facts),id);const read=async()=>(await db.query('select * from marketplace_products where id=$1',[id])).rows[0];let row=await read();
  assert.equal(row.name,'Nome manual');assert.equal(row.description,'Manual');assert.deepEqual(row.pictures,['https://manual.example/foto.jpg']);assert.equal(row.price_cents,12300);assert.equal(row.stock_quantity,7);assert.equal(row.ean,ean);assert.equal(row.attributes.find(a=>a.id==='BRAND').value,'Manual');assert.equal(row.attributes.find(a=>a.id==='MODEL').value,'MB7142');assert.deepEqual(row.publication_form.web_research_sources,[source]);
  const revision=row.revision;await register(facts);assert.equal((await read()).revision,revision);
  const manual=Array.from({length:85},(_,i)=>({id:'CUSTOM_'+i,name:'Manual '+i,value:'Valor '+i}));const merged=(await db.query('select marketplace_complete_product_attributes($1,$2) data',[JSON.stringify(manual),JSON.stringify([{id:'MODEL',name:'Modelo',value:'MB7142'}])])).rows[0].data;assert.equal(merged.length,86);assert.deepEqual(merged.slice(0,85),manual);
  await assert.rejects(register({...facts,ean:'7908103790527'}),/diverge/);assert.equal((await read()).ean,ean);
  assert.notEqual(await register(facts,other),id);assert.equal((await db.query('select count(*)::int n from marketplace_products')).rows[0].n,2);
  const rights=(await db.query("select has_function_privilege('authenticated','marketplace_price_product_register(uuid,uuid,text,jsonb)','EXECUTE') as client,has_function_privilege('service_role','marketplace_price_product_register(uuid,uuid,text,jsonb)','EXECUTE') as server")).rows[0];assert.deepEqual(rights,{client:false,server:true});
 }finally{await db.close();}
});
test('detalhes reais mostram características, EAN e fontes sem colocar características na tela inicial',()=>{
 const result={status:'found',ean,product:{name:'Produto fictício',description:'Teste',image:null,attributes:[{id:'MODEL',name:'Modelo',value:'MB7142'}],sources:[source]}};
 const detail=createSearchRenderFixture({resultDetailsOpen:true,result}).render().html;assert.match(detail,/Características/);assert.match(detail,/MB7142/);assert.ok(detail.includes(ean));assert.ok(detail.includes(source));assert.match(detail,/Fontes da ficha/);
 assert.doesNotMatch(createSearchRenderFixture({result}).render().html,/product-facts-title/);
});
