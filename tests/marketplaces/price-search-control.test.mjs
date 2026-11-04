import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
import {mockOriginModule,originFixture} from './price-origin-fixture.mjs';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./public-price-page')return{url:'data:text/javascript,'+encodeURIComponent(mockOriginModule),shortCircuit:true};
 if(s==='./management-access')return{url:'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}}',shortCircuit:true};
 const f=s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 if(f&&existsSync(f+'.ts'))return next(pathToFileURL(f+'.ts').href,c);return next(s,c);
}});
const {controlledPriceSearch,priceSearchHash,PRICE_SEARCH_MODEL}=await import('../../app/modules/marketplaces/services/price-search-control.ts');
const {consultOpenAIWebPrices}=await import('../../app/modules/marketplaces/services/openai-web-price-search.ts');
const {isProductOfferUrl,matchesPriceOffer,matchesPriceOfferSource,priceModelCodes,priceSearchQuery,priceSearchDetails}=await import('../../app/modules/marketplaces/price-offer-identity.ts');hooks.deregister();
test('vitrine de peças não comprova aparelho completo e preserva buscas de peças',()=>{
 assert.equal(matchesPriceOfferSource('https://lista.mercadolivre.com.br/pecas-escova-conair','Escova Conair 220V'),false);
 assert.equal(matchesPriceOfferSource('https://loja.com.br/busca?q=acessorios-calculadora','Calculadora Elgin'),false);
 assert.equal(matchesPriceOfferSource('https://lista.mercadolivre.com.br/pecas-escova-conair','Peças para escova Conair'),true);
 assert.equal(matchesPriceOfferSource('https://loja.com.br/escova-com-acessorios/p/123','Escova Conair 220V'),true);
});
const input={ean:null,productName:'Elgin MB7142 127V'};
test('fonte citada sem oferta com preço não gera referência nem baixa HTML para inventar preço',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';let calls=0;
 const offer={title:'Elgin MB7142 127V',seller:'Loja',price:350,url:'https://origem.example/produtos/elgin-mb7142'};
 globalThis.priceOriginFixtures=new Map([[offer.url,originFixture(offer)]]);
 try{
  globalThis.fetch=async()=>{calls++;return Response.json({output:[{type:'web_search_call',action:{sources:[{url:offer.url}]}},{content:[{type:'output_text',text:'{"offers":[],"product":null}'}]}]});};
  const result=await consultOpenAIWebPrices(input);
  assert.equal(calls,1);assert.equal(result.sample,null);
 }finally{globalThis.fetch=original;}
});
test('modelo fixo, identidade de variante e páginas diretas',()=>{
 assert.equal(PRICE_SEARCH_MODEL,'gpt-5.4-mini');
 assert.notEqual(priceSearchHash(input),priceSearchHash({...input,productName:'Elgin MB7142 220V'}));
 assert.equal(priceSearchHash(input),priceSearchHash({...input,productName:' ELGIN   MB7142 127V '}));
 for(const url of ['https://lista.mercadolivre.com.br/mb7142','https://amazon.com.br/s?k=mb7142','https://loja.com.br/busca/mb7142'])assert.equal(isProductOfferUrl(url),false);
 assert.equal(isProductOfferUrl('https://www.amazon.com.br/dp/B01234'),true);
 for(const title of ['Elgin MB7143 127V','Elgin MB7142 220V','Elgin MB7142 bivolt'])assert.equal(matchesPriceOffer(title,input.productName),false);
 assert.equal(matchesPriceOffer('Elgin MB 7142 127 V',input.productName),true);
 assert.equal(matchesPriceOffer('Air Fryer ARF1250 3L 127V','Air Fryer ARF1250 5L 127V'),false);
});
test('cache não chama provedor; bloqueios falham antes da cobrança',async()=>{
 for(const status of ['cached','busy','limited','cooldown']){
  const control={companyId:'company',actorId:'actor',db:{rpc:async()=>({data:{status,result:{status:'completed',sample:null},researchedAt:'2026-10-22T00:00:00Z'}})}};
  const run=()=>{throw Error('Não deve chamar provedor')};
  if(status==='cached')assert.equal((await controlledPriceSearch(input,control,run)).fromCache,true);
  else await assert.rejects(()=>controlledPriceSearch(input,control,run));
 }
 await assert.rejects(()=>controlledPriceSearch(input,{db:{rpc:async()=>({error:{}})}},()=>{throw Error('Não deve cobrar')}),{code:'price_controls_unavailable'});
});

test('filtro geral separa modelos de potência, voltagem e capacidade, sem exigir ordem do título',()=>{
 assert.deepEqual(priceModelCodes('Escova Diamond Rotating 900W Conair 220V'),[]);
 assert.deepEqual(priceModelCodes('Calculadora Elgin MB 7142 127V'),['mb7142']);
 assert.deepEqual(priceModelCodes('Conair 2735ABRB 900 W 220 V'),['2735abrb']);
 assert.equal(matchesPriceOffer('Conair Diamond Rotating 2735ABRB 900W 220V','Escova Secadora Rotativa Diamond Rotating 900W Preto e Prata Conair 220V'),true);
 assert.equal(matchesPriceOffer('Elgin Calculadora MB7142 127V','Calculadora Elgin MB 7142 127V'),true);
 assert.equal(matchesPriceOffer('Fritadeira ARF1250 5 litros 127V','Air Fryer ARF1250 5L 127V'),true);
 assert.equal(matchesPriceOffer('Escova Diamond Rotating','Escova Diamond Rotating 900W 220V','900 W; 220 V'),true);
 assert.equal(matchesPriceOffer('Escova Diamond Rotating 127V','Escova Diamond Rotating 900W 220V','900 W; 220 V'),false);
 assert.equal(matchesPriceOffer('Escova Diamond Rotating 1000W 220V','Escova Diamond Rotating 900W 220V','900 W; 220 V'),false);
 assert.equal(matchesPriceOffer('Escova Diamond Rotating 900W - 110','Escova Diamond Rotating 900W 220V','900W; 110V / 220V (não é bivolt)'),false);
 assert.equal(matchesPriceOffer('Escova Diamond Rotating 900W','Escova Diamond Rotating 900W 220V','900W; 110V / 220V'),false);
 assert.equal(matchesPriceOffer('Elgin MB7143 127V','Elgin MB7142 127V'),false);
 assert.doesNotMatch(priceSearchQuery('Escova Secadora Rotativa Diamond Rotating 900W Preto e Prata Conair 220V'),/900W|Preto|Prata/);
 assert.match(priceSearchQuery('Escova Secadora Rotativa Diamond Rotating 900W Preto e Prata Conair 220V'),/Conair 220V/);
});

test('vazio não inicia recuperação nem busca para preencher quantidade; registra somente a chamada feita',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';let calls=0,finish;
 const offer={title:'Calculadora Elgin',variant:'MB7142; 127V',seller:'Outra loja',price:100,currency:'BRL',availability:'in_stock',url:'https://outra.example/produto'};
 const control={companyId:'company',actorId:'actor',includeFacts:false,db:{rpc:async(name,args)=>{if(name.endsWith('claim'))return {data:{status:'claimed',id:'job'}};finish=args;return {data:null,error:null};}}};
 try{globalThis.fetch=async(_url,init)=>{const body=JSON.parse(init.body);calls++;assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.max_tool_calls,2);assert.equal(body.max_output_tokens,2500);if(calls===2)assert.match(body.input,/RECUPERAÇÃO|outras lojas/);return Response.json({usage:{input_tokens:100,output_tokens:20},output:[{type:'web_search_call',action:{sources:[{url:offer.url}]}},{content:[{type:'output_text',text:JSON.stringify({offers:calls===1?[]:[offer],product:null})}]}]});};
  const result=await consultOpenAIWebPrices(input,control);assert.equal(calls,1);assert.equal(result.sample,null);
  assert.equal(finish.p_usage.inputTokens,100);assert.equal(finish.p_usage.outputTokens,20);assert.equal(finish.p_usage.webCalls,1);assert.equal(finish.p_usage.attempts,1);assert.equal(finish.p_usage.usageKnown,true);
  calls=0;globalThis.fetch=async()=>{calls++;return Response.json({output:[{type:'web_search_call',action:{sources:[]}},{content:[{type:'output_text',text:'{"offers":[],"product":null}'}]}]});};
  assert.equal((await consultOpenAIWebPrices(input)).sample,null);assert.equal(calls,1,'não repete pesquisa vazia nem gera preço zero');
 }finally{globalThis.fetch=original;}
});
test('consumo é registrado mesmo com resposta inválida e cancelamento libera reserva',async()=>{
 const calls=[],abort=new AbortController();
 const control={companyId:'company',actorId:'actor',signal:abort.signal,db:{rpc:async(name,args)=>{calls.push({name,args});return{data:name.endsWith('claim')?{status:'claimed',id:'job'}:null,error:null};}}};
 await assert.rejects(()=>controlledPriceSearch(input,control,async record=>{record({inputTokens:1000,cachedTokens:100,outputTokens:200,webCalls:2});throw Error('Inválido')}),/Inválido/);
 assert.equal(calls[1].args.p_status,'failed');assert.equal(calls[1].args.p_usage.webCalls,2);assert.ok(calls[1].args.p_usage.estimatedUsd>0);
 calls.length=0;
 await assert.rejects(()=>controlledPriceSearch(input,control,async()=>{abort.abort();abort.signal.throwIfAborted()}));
 assert.equal(calls[1].args.p_status,'cancelled');
});
test('payload mini ignora override caro e rejeita preço sem fonte ou variante correta',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';process.env.OPENAI_PRICE_SEARCH_MODEL='gpt-5.5';
 const offers=[{title:'Elgin MB7142 127V',seller:'Loja',price:100,url:'https://loja.example/produto'}, {title:'Lista de calculadoras',seller:'Busca',price:1,url:'https://lista.mercadolivre.com.br/mb7142'}, {title:'Elgin MB7142 220V',seller:'Loja',price:2,url:'https://loja.example/outro'}, {title:'Elgin MB7142 127V',seller:'Sem fonte',price:3,url:'https://loja.example/inventado'}];
 globalThis.priceOriginFixtures=new Map(offers.map(offer=>[offer.url,originFixture(offer)]));
 try{
  globalThis.fetch=async(_url,init)=>{const body=JSON.parse(init.body);assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.max_tool_calls,2);assert.equal(body.max_output_tokens,2500);assert.equal(body.text.format.schema.properties.offers.maxItems,8);assert.ok(body.text.format.schema.properties.offers.items.required.includes('price'));return Response.json({status:'completed',output:[{type:'web_search_call',action:{sources:offers.slice(0,3).map(o=>({url:o.url}))}},{content:[{type:'output_text',text:JSON.stringify({offers:offers.map(o=>({...o,currency:'BRL',availability:'in_stock'})),product:null})}]}]});};
  const result=await consultOpenAIWebPrices(input);assert.equal(result.sample.offers.length,1);const {origin,...saved}=result.sample.offers[0];assert.deepEqual(saved,offers[0]);assert.equal(origin,undefined);
  globalThis.fetch=async()=>Response.json({error:{type:'insufficient_quota',code:'credit_balance_exhausted'}},{status:429});
  await assert.rejects(()=>consultOpenAIWebPrices(input),{code:'price_provider_quota'});
 }finally{globalThis.fetch=original;delete process.env.OPENAI_PRICE_SEARCH_MODEL;}
});

test('preço pesquisado vem da OpenAI com fonte; cache não depende de nova leitura HTML',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';
 const offer={title:'Elgin MB7142 127V',seller:'Loja',price:759.81,url:'https://loja.example/produto'};
 globalThis.priceOriginFixtures=new Map([[offer.url,originFixture(offer,{price:759.81})]]);
 try{
  globalThis.fetch=async url=>{assert.equal(String(url),'https://api.openai.com/v1/responses');return Response.json({output:[{type:'web_search_call',action:{sources:[{url:offer.url}]}},{content:[{type:'output_text',text:JSON.stringify({offers:[{...offer,currency:'BRL',availability:'in_stock'}],product:null})}]}]});};
  const live=await consultOpenAIWebPrices(input);assert.equal(live.sample.offers[0].price,759.81);
  globalThis.fetch=()=>{throw Error('Cache não pode chamar IA')};
  globalThis.priceOriginFixtures.set(offer.url,originFixture(offer,{availability:'https://schema.org/OutOfStock'}));
  const cached=await consultOpenAIWebPrices(input,{companyId:'company',actorId:'actor',db:{rpc:async()=>({data:{status:'cached',result:live,researchedAt:'2026-10-22T00:00:00Z'}})}});
  assert.equal(cached.fromCache,true);assert.equal(cached.sample.offers[0].price,759.81);
 }finally{globalThis.fetch=original;}
});

test('preço ausente, moeda diferente, indisponível, pausado ou sem disponibilidade não entram',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';
 const offer={title:input.productName,seller:'Loja',url:'https://loja.example/produto',price:100,currency:'BRL',availability:'in_stock'};
 try{for(const change of [{price:undefined},{price:0},{price:'100'},{currency:'USD'},{availability:'out_of_stock'},{availability:'paused'},{availability:'unknown'},{availability:undefined}]){
  globalThis.fetch=async()=>Response.json({output:[{type:'web_search_call',action:{sources:[{url:offer.url}]}},{content:[{type:'output_text',text:JSON.stringify({offers:[{...offer,...change}],product:null})}]}]});
  assert.equal((await consultOpenAIWebPrices(input)).sample,null,JSON.stringify(change));
 }}finally{globalThis.fetch=original;}
});

test('vitrine genérica não comprova preço nem disponibilidade e não gera nova pesquisa',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';
 const offer={title:'Escova Rotativa Mondial ER-10 Preto 127V',seller:'Loja da oferta',price:252.98,currency:'BRL',availability:'in_stock',url:'https://lista.mercadolivre.com.br/escova-rotativa-er-10-mondial'};
 try{globalThis.fetch=async url=>{assert.equal(String(url),'https://api.openai.com/v1/responses');return Response.json({output:[{type:'web_search_call',action:{sources:[{url:offer.url}]}},{content:[{type:'output_text',text:JSON.stringify({offers:[offer],product:null})}]}]});};
  const result=await consultOpenAIWebPrices({ean:'7899882311471',productName:'Escova Rotativa ER-10 Mondial Preto'});
  assert.equal(result.sample,null);
 }finally{globalThis.fetch=original;}
});
test('até oito preços retornados com fontes compõem a média; esgotados e duplicações não entram',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';let calls=0;
 const offers=Array.from({length:8},(_,i)=>({title:'Elgin MB7142 127V',seller:'Loja '+i,price:(i+1)*100,currency:'BRL',availability:'in_stock',url:'https://loja.example/item-'+i}));
 globalThis.priceOriginFixtures=new Map(offers.map((o,i)=>[o.url,originFixture(o,{price:(i+1)*100})]));
 try{
  globalThis.fetch=async()=>{calls++;return Response.json({output:[{type:'web_search_call',action:{sources:offers.map(o=>({url:o.url}))}},{content:[{type:'output_text',text:JSON.stringify({offers,product:null})}]}]});};
  const result=await consultOpenAIWebPrices(input);assert.equal(result.sample.count,8);assert.deepEqual(result.sample.pricesInCents,[10000,20000,30000,40000,50000,60000,70000,80000]);assert.ok(result.sample.offers.every(o=>o.url.startsWith('https://')&&o.price>0));assert.equal(calls,1);
  offers[0]={...offers[0],availability:'out_of_stock'};
  offers[7]={...offers[1],price:1,seller:'Nome diferente'};
  const reduced=await consultOpenAIWebPrices(input);assert.equal(reduced.sample.count,6);assert.equal(calls,2,'somente uma chamada por consulta, mesmo com menos ofertas');
 }finally{globalThis.fetch=original;}
});

test('SQL real: RLS, cache entre usuários da mesma empresa, limites e isolamento',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
   create table auth.users(id uuid primary key);create table empresas(id uuid primary key);
   create table usuarios_empresa(empresa_id uuid,user_id uuid,status text);create table marketplace_price_users(empresa_id uuid,user_id uuid,ativo boolean);
   create table empresa_modulos(empresa_id uuid,modulo_id text,ativo boolean,expira_em timestamptz);`);
  const company='00000000-0000-4000-8000-000000000001',actor='00000000-0000-4000-8000-000000000002',dedicated='00000000-0000-4000-8000-000000000003';
  await db.query('insert into empresas values($1)',[company]);await db.query('insert into auth.users values($1),($2)',[actor,dedicated]);
  await db.query("insert into usuarios_empresa values($1,$2,'ativo')",[company,actor]);await db.query('insert into marketplace_price_users values($1,$2,true)',[company,dedicated]);await db.query("insert into empresa_modulos values($1,'marketplaces',true,null)",[company]);
  await db.exec(readFileSync(resolve(root,'supabase/migrations/20261022200000_marketplace_price_ai_controls.sql'),'utf8'));
  const claim=async(hash=priceSearchHash(input),user=actor,facts=true)=>(await db.query('select marketplace_price_ai_claim($1,$2,$3,$4) result',[company,user,hash,facts])).rows[0].result;
  const job=await claim();assert.equal(job.status,'claimed');assert.equal((await claim()).status,'busy');
  const sample={status:'completed',sample:{count:1}};
  await db.query("select marketplace_price_ai_finish($1,$2,$3,'completed',$4,$5,null)",[company,actor,job.id,JSON.stringify(sample),JSON.stringify({model:PRICE_SEARCH_MODEL,inputTokens:100})]);
  assert.equal((await claim(undefined,dedicated,false)).status,'cached');
  for(let i=0;i<4;i++)assert.equal((await claim(String(i).padStart(64,'a'))).status,'claimed');
  assert.equal((await claim('f'.repeat(64))).status,'limited');
  await assert.rejects(()=>claim('a'.repeat(64),'00000000-0000-4000-8000-000000000099'));
  const access=await db.query("select relrowsecurity,has_table_privilege('authenticated','marketplace_price_ai_jobs','select') readable,has_function_privilege('anon','marketplace_price_ai_claim(uuid,uuid,text,boolean)','execute') callable from pg_class where oid='marketplace_price_ai_jobs'::regclass");
  assert.deepEqual(access.rows[0],{relrowsecurity:true,readable:false,callable:false});
 }finally{await db.close();}
});

test('todas as rotas pagas propagam controle autenticado e cancelamento',()=>{
 const api=readFileSync(resolve(root,'app/api/modulos/marketplaces/precos/route.ts'),'utf8');
 assert.match(api,/actorId: usuario.id, signal: request.signal/);assert.match(api,/actorId: actor, signal/);
 for(const file of ['precos/produto/route.ts','produtos/preco/route.ts'])assert.match(readFileSync(resolve(root,'app/api/modulos/marketplaces/'+file),'utf8'),/researchLocalProductPrice\(db, empresaId, usuario.id, body, request.signal\)/);
});

test('HTML inacessível não elimina preço citado válido; EAN, variante, condição e precisão continuam obrigatórios',async()=>{
 const original=globalThis.fetch;process.env.OPENAI_API_KEY='test';let calls=0;
 const base={title:'Mini Processador Lenoxx PMP435 Vermelho 127V',variant:'PMP435 127V',seller:'Loja',price:89.99,url:'https://loja.example/produto',ean:'7897181903311',currency:'BRL',availability:'in_stock'};
 const offers=[base,{...base,url:'https://loja.example/outra-variante',ean:'7897181903328'},{...base,url:'https://loja.example/tensao',title:base.title.replace('127V','220V'),variant:'220V'},{...base,url:'https://loja.example/reembalado',title:base.title+' Reembalado'},{...base,url:'https://loja.example/preco-invalido',price:0.011}];
 try{globalThis.fetch=async(url)=>{calls++;assert.equal(String(url),'https://api.openai.com/v1/responses','não depender de ler HTML da loja');return Response.json({output:[{type:'web_search_call',action:{sources:offers.map(o=>({url:o.url}))}},{content:[{type:'output_text',text:JSON.stringify({offers,product:null})}]}]});};
 const result=await consultOpenAIWebPrices({ean:base.ean,productName:'Mini Processador De Alimentos Pratic Red Lenoxx PMP435 Cor Vermelho',variant:'127V'});
 assert.equal(calls,1);assert.equal(result.sample.count,1);assert.equal(result.sample.offers[0].price,89.99);assert.equal(result.sample.offers[0].url,base.url);
 }finally{globalThis.fetch=original;}
});

test('modelo inválido do cadastro não contamina consulta e tensão continua separada no hash',()=>{
 const details=priceSearchDetails([{id:'BRAND',value:'Arno'},{id:'MODEL',value:'PARA SUA LAVADERIA'},{id:'VOLTAGE',value:'127V'}],'Ferro Arno Essentialgliss FMQ');
 assert.deepEqual(details,{brand:'Arno',variant:'127V'});
 assert.notEqual(priceSearchHash({...input,variant:'127V'}),priceSearchHash({...input,variant:'220V'}));
});
