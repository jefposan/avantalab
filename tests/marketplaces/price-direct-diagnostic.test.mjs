import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
class MarketplaceError extends Error { constructor(status,code,message){super(message);this.status=status;this.code=code;} }
const source=readFileSync('app/modules/marketplaces/services/mercadolivre-price-diagnostic.ts','utf8');
const module={exports:{}};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:module.exports,URLSearchParams,Date,require(name){if(name==='server-only')return{};if(name==='./management-access')return{MarketplaceError};if(name==='./catalog-publication')return{validEan:value=>value==='7897181903311'?value:null};throw Error('Unexpected dependency');}});
const {priceDiagnosticInput,diagnoseMercadoLivrePrices}=module.exports;
test('valida entrada e impede caminhos arbitrários de catálogo',()=>{
 for(const input of [{},{ean:'123'},{query:'aa'},{query:'valid',catalogId:'../../users/me'},{query:'valid',catalogId:'https://example.com'}])assert.throws(()=>priceDiagnosticInput(input),e=>e.status===400);
 assert.equal(priceDiagnosticInput({ean:'7897181903311'}).ean,'7897181903311');
});
test('consulta caminhos limitados sem repassar tokens ou dados pessoais e não salva a amostra',async()=>{
 const paths=[];const result=await diagnoseMercadoLivrePrices(priceDiagnosticInput({ean:'7897181903311',query:'Lenoxx PMP435'}),async path=>{
  paths.push(path);
  if(path==='/users/me')return{id:123,email:'hidden',access_token:'secret'};
  if(path.startsWith('/products/search'))return{results:[{id:'MLB12345',name:'Lenoxx',access_token:'secret'},{id:'../../bad'}]};
  if(path.endsWith('/items?limit=20')||path.startsWith('/sites/'))return{paging:{total:5},results:[{id:'MLB1',price:100,currency_id:'BRL',token:'secret'},{id:'MLB2',price:120,currency_id:'BRL'},{id:'MLB3',price:999,currency_id:'USD'},{id:'MLB4',price:-1,currency_id:'BRL'}]};
  return{name:'Lenoxx',status:'active',buy_box_winner:{item_id:'MLB99',price:95,currency_id:'BRL',token:'secret'}};
 });
 assert.equal(paths.length,5);assert.ok(paths.every(path=>path.startsWith('/')));assert.equal(result.authenticated,true);
 assert.equal(result.catalogs[0].sample.sampleMean,110);assert.equal(result.catalogs[0].sample.priceCount,2);assert.equal(result.catalogs[0].sample.identityValidated,false);
 assert.equal(result.openaiCalls,0);assert.equal(result.advertisementsChanged,false);assert.equal(result.referenceSaved,false);
 assert.doesNotMatch(JSON.stringify(result),/secret|hidden|access_token|email/);
});
test('preserva 403 e 404 de permissões sem divulgar detalhes de erro',async()=>{
 const result=await diagnoseMercadoLivrePrices(priceDiagnosticInput({query:'Lenoxx PMP435'}),async path=>{throw new MarketplaceError(path==='/users/me'?409:403,path==='/users/me'?'provider_404':'provider_403','Bearer secret');});
 assert.equal(result.authenticated,false);assert.deepEqual(Array.from(result.probes,p=>p.status),[404,403,403]);assert.doesNotMatch(JSON.stringify(result),/Bearer|secret/);
});
test('limita catálogo a duas fichas e oferta a vinte mesmo com resposta excessiva',async()=>{
 const result=await diagnoseMercadoLivrePrices(priceDiagnosticInput({query:'Lenoxx PMP435'}),async path=>path.startsWith('/products/search')?{results:Array.from({length:50},(_,i)=>({id:'MLB'+(1000+i)}))}:path.endsWith('/items?limit=20')?{results:Array.from({length:100},()=>({id:'MLB999',price:100,currency_id:'BRL'}))}:{});
 assert.equal(result.catalogs.length,2);assert.equal(result.catalogs[0].sample.offers.length,20);
});
test('rota exige administração e isola conexão na empresa antes de qualquer GET ao provedor',()=>{
 const route=readFileSync('app/api/modulos/marketplaces/diagnostico-precos/route.ts','utf8');
 assert.match(route,/authorizeMarketplace\(request, body.empresaId, 'connections'\)/);assert.match(route,/loadConnection\(db, empresaId, body.connectionId\)/);
 assert.ok(route.indexOf('await authorizeMarketplace')<route.indexOf('await loadConnection'));assert.ok(route.indexOf('await loadConnection')<route.indexOf('await diagnoseMercadoLivrePrices'));
 assert.match(route,/mlRequest\(db, connection, path, 'GET'\)/);assert.match(route,/'Cache-Control': 'no-store'/);
 assert.doesNotMatch(source+route,/consultOpenAI|fetch\(|\.rpc\(|\.update\(|\.insert\(|\.delete\(/);
});
