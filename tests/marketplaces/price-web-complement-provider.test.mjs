import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {existsSync} from 'node:fs';
import {originFixture,mockOriginModule} from './price-origin-fixture.mjs';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(s,c,next){
 if(s==='server-only')return {url:'data:text/javascript,export {}',shortCircuit:true};
 if(s==='./mercadolivre-market-prices')return {url:'data:text/javascript,export async function consultMercadoLivreMarketPrices(){return globalThis.mlResearchFixture}',shortCircuit:true};
 if(s==='./public-price-page')return {url:'data:text/javascript,'+encodeURIComponent(mockOriginModule),shortCircuit:true};
 if(s==='./management-access')return {url:'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}',shortCircuit:true};
 const p=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
 return p&&existsSync(p+'.ts')?next(pathToFileURL(p+'.ts').href,c):next(s,c);
}});
const {consultMarketPricesWithComplement}=await import('../../app/modules/marketplaces/services/market-prices-with-complement.ts');
const {priceSearchHash}=await import('../../app/modules/marketplaces/services/price-search-control.ts');
const {analyzeMercadoLivreOffers}=await import('../../app/modules/marketplaces/market-price-research.ts');
hooks.deregister();
const input={ean:'7909569454787',productName:'Liquidificador Electrolux EBL1500 127V Cinza'},url='https://loja.example/produto',offer={title:input.productName,seller:'Loja',price:220,url,currency:'BRL',availability:'in_stock',ean:input.ean,variant:'127V Cinza'};
function setup(status='claimed',prices=[200]){
 process.env.OPENAI_API_KEY='test-only';let paid=0;const commands=[];
 globalThis.mlResearchFixture=analyzeMercadoLivreOffers({catalogId:'MLB123456',productName:input.productName,total:prices.length,rows:prices.map((price,i)=>({item_id:'MLB'+(1000+i),seller_id:2000+i,currency_id:'BRL',condition:'new',price})),complete:true,ownSellers:[]});
 globalThis.priceOriginFixtures=new Map([[url,originFixture(offer)]]);
 globalThis.fetch=async(request,init)=>{assert.equal(request,'https://api.openai.com/v1/responses');paid++;const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.max_tool_calls,2);assert.equal(body.tools[0].external_web_access,true);assert(body.input.includes('Google Shopping'));assert(body.input.includes('product deve ser null'));return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:100},output:[{type:'web_search_call',action:{sources:[{url}]}},{content:[{type:'output_text',text:JSON.stringify({offers:[offer],product:null})}]}]});};
 const db={async rpc(name,args){commands.push({name,args});if(name==='marketplace_price_ai_claim')return {data:{status,id:'job',...(status==='cached'?{result:{status:'completed',sample:{offers:[offer]}}}:{})}};if(name==='marketplace_price_ai_finish')return {data:null};throw Error(name);}};
 return {db,commands,paid:()=>paid};
}
test('provedor real com HTTP simulado: reserva custo, pesquisa uma vez, registra consumo e valida origem antes de compor',async()=>{
 const f=setup('claimed',[200,210]),r=await consultMarketPricesWithComplement(f.db,{},input,{db:f.db,companyId:'company',actorId:'actor'});assert.equal(f.paid(),1);assert.equal(r.count,3);assert.equal(r.mean,210);assert.equal(f.commands[0].name,'marketplace_price_ai_claim');assert.equal(f.commands[0].args.p_facts,false);assert.equal(f.commands[1].name,'marketplace_price_ai_finish');assert.equal(f.commands[1].args.p_usage.webCalls,1);assert.equal(f.commands[1].args.p_usage.estimatedUsd,.0112);assert.equal(r.offers[2].origin.method,'json_ld');
});
test('cache reutiliza resultado sem nova cobrança, mas reconfere a origem',async()=>{const f=setup('cached');globalThis.priceOriginFixtures.clear();const r=await consultMarketPricesWithComplement(f.db,{},input,{db:f.db,companyId:'company',actorId:'actor'});assert.equal(f.paid(),0);assert.equal(r.mean,200);assert.equal(r.complement.accepted,0);});
test('limite/cooldown/controle indisponível mantêm ML sem nenhuma chamada paga',async()=>{for(const status of ['limited','cooldown','busy','invalid']){const f=setup(status);const r=await consultMarketPricesWithComplement(f.db,{},input,{db:f.db,companyId:'company',actorId:'actor'});assert.equal(f.paid(),0);assert.equal(r.mean,200);assert.equal(r.complement.status,'unavailable');}});
test('cache complementar é separado da busca antiga e de outras variantes',()=>{assert.notEqual(priceSearchHash(input),priceSearchHash({...input,mode:'shopping_complement'}));assert.notEqual(priceSearchHash({...input,mode:'shopping_complement',variant:'127V'}),priceSearchHash({...input,mode:'shopping_complement',variant:'220V'}));});
test('provedor real com HTTP simulado: segunda rodada muda consulta e cache, registra consumo de cada rodada e não retorna domínio recusado',async()=>{
 const f=setup();globalThis.priceOriginFixtures.clear();const nextUrl='https://outra-loja.example/produto';const nextOffer={...offer,seller:'Outra',price:230,url:nextUrl};globalThis.priceOriginFixtures.set(nextUrl,originFixture(nextOffer));let calls=0;
 globalThis.fetch=async(_,init)=>{const payload=JSON.parse(init.body);calls++;if(calls===2){assert.match(payload.input,/Rodada 2/);assert.match(payload.input,/-site:loja.example/);assert(!payload.input.includes('não faça buscas extras apenas para completar a quantidade'));}const offers=calls===1?[offer]:[offer,nextOffer];return Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:100},output:[{type:'web_search_call',action:{sources:offers.map(o=>({url:o.url}))}},{content:[{type:'output_text',text:JSON.stringify({offers,product:null})}]}]});};
 const r=await consultMarketPricesWithComplement(f.db,{},input,{db:f.db,companyId:'company',actorId:'actor'});assert.equal(calls,2);assert.equal(r.mean,215);assert.equal(r.count,2);assert.equal(r.complement.accepted,1);const claims=f.commands.filter(c=>c.name==='marketplace_price_ai_claim'),finishes=f.commands.filter(c=>c.name==='marketplace_price_ai_finish');assert.equal(claims.length,2);assert.notEqual(claims[0].args.p_hash,claims[1].args.p_hash);assert.equal(finishes.length,2);assert.equal(finishes[0].args.p_usage.estimatedUsd,.0112);assert.equal(finishes[1].args.p_usage.estimatedUsd,.0112);
});
test('chave da continuação inclui rodada e domínios, com ordem estável',()=>{
 const a={...input,mode:'shopping_complement',searchRound:2,excludedDomains:['loja-b.example','loja-a.example']};assert.notEqual(priceSearchHash({...input,mode:'shopping_complement'}),priceSearchHash(a));assert.equal(priceSearchHash(a),priceSearchHash({...a,excludedDomains:['loja-a.example','loja-b.example']}));
});
test('provedor real: fontes citadas recuperam ofertas mesmo quando JSON retorna lista vazia',async()=>{
 const f=setup('claimed',[200,210]);globalThis.fetch=async()=>Response.json({status:'completed',usage:{input_tokens:1000,output_tokens:100},output:[{type:'web_search_call',action:{sources:[{url}]}},{content:[{type:'output_text',text:JSON.stringify({offers:[],product:null})}]}]});const r=await consultMarketPricesWithComplement(f.db,{},input,{db:f.db,companyId:'company',actorId:'actor'});assert.equal(r.count,3);assert.equal(r.mean,210);assert.equal(r.complement.rounds,1);assert.equal(r.offers[2].origin.price,220);
});
