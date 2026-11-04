import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {normalizedSaleItems,saleItemEan} from '../../app/modules/marketplaces/sale-items.ts';

const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
  if(s==='server-only')return{url:'data:text/javascript,export {}',shortCircuit:true};
  if(s.endsWith('.module.css'))return{url:'data:text/javascript,export default new Proxy({}, {get:(_,k)=>k})',shortCircuit:true};
  const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(f)for(const ext of ['.tsx','.ts'])if(existsSync(f+ext))return next(pathToFileURL(f+ext).href,c);
  return next(s,c);
},load(url,c,next){if(url.startsWith('file:')&&url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {withSaleItemEans}=await import('../../app/modules/marketplaces/services/sale-item-ean.ts');
const {default:SaleItems}=await import('../../app/marketplaces/SaleItems.tsx');
hook.deregister();
const raw=[{title:'Fritadeira',quantity:1,unitPrice:535,sku:'7908103790527'}];
const line={title:'Fritadeira',quantity:1,listingId:'MLB123456',variationId:''};
const sale=(connectionId='conta-a')=>({id:'sale',connectionId,items:normalizedSaleItems(raw,[line])});
function dbFixture(fail=false){const calls=[];return{calls,from(table){assert.equal(table,'marketplace_listings');const filters={};return{select(){return this},eq(k,v){filters[k]=v;return this},abortSignal(signal){assert.ok(signal instanceof AbortSignal);return this;},async in(k,ids){calls.push({filters,ids});assert.equal(k,'provider_listing_id');return fail?{error:Error('falha'),data:null}:{error:null,data:ids.map(id=>({provider_listing_id:id,snapshot:{ean:filters.connection_id==='conta-a'?'7908103790527':'7891129598607',variations:[]}}))};}}}};}

test('EAN em linha abaixo da descrição para cada item, sem preço/quantidade alterados ou SKU inferido',()=>{
  assert.equal(saleItemEan('8720389031151'),'8720389031151');
  assert.equal(saleItemEan('SKU 7908103790527'),null);assert.equal(normalizedSaleItems(raw,[])[0].ean,null);
  const html=renderToStaticMarkup(React.createElement(SaleItems,{items:[{...raw[0],ean:'7908103790527'},{...raw[0],title:'Outro produto',ean:null}]}));
  assert.match(html,/1× Fritadeira · R\$.*535,00<\/span><small class="saleItemEan">EAN: 7908103790527<\/small>/);
  assert.match(html,/EAN: Não informado/);assert.equal((html.match(/class="saleItem"/g)||[]).length,2);
});
test('legado alinha somente linhas exatas do próprio pedido, sem inferir por nome/ordem divergente',()=>{
  assert.equal(sale().items[0].listingId,'MLB123456');
  for(const lines of [[{...line,title:'Outro nome'}],[{...line,quantity:2}],[],[line,line]])assert.equal(normalizedSaleItems(raw,lines)[0].listingId,undefined);
});
test('leitura complementar isola empresa e conta; erro não esconde pedido e não altera snapshot recebido',async()=>{
  const db=dbFixture(),sales=[sale(),sale('conta-b')],before=structuredClone(sales);
  const result=await withSaleItemEans(db,'empresa',sales);assert.equal(result[0].items[0].ean,'7908103790527');assert.equal(result[1].items[0].ean,'7891129598607');assert.deepEqual(sales,before);
  assert.deepEqual(db.calls.map(c=>c.filters),[{empresa_id:'empresa',connection_id:'conta-a',provider:'mercado_livre'},{empresa_id:'empresa',connection_id:'conta-b',provider:'mercado_livre'}]);
  const failed=await withSaleItemEans(dbFixture(true),'empresa',[sale()]);assert.equal(failed[0].items[0].eanUnavailable,true);
  assert.match(renderToStaticMarkup(React.createElement(SaleItems,{items:failed[0].items})),/EAN: Indisponível no momento/);
  const limited=await withSaleItemEans({from(){assert.fail('Orçamento esgotado não inicia consulta')}},'empresa',[sale()],0);assert.equal(limited[0].items[0].eanUnavailable,true);
});
test('variação não usa EAN do produto pai; código já confirmado não consulta catálogo',async()=>{
  const db=dbFixture();db.from=()=>({select(){return this},eq(){return this},abortSignal(){return this},async in(){return{data:[{provider_listing_id:'MLB123456',snapshot:{ean:'7891129598607',variations:[{id:'1',ean:'7908103790527'}]}}]}}});
  const s=sale();s.items=[{...s.items[0],variationId:'1'},{...s.items[0],variationId:'2'},{...s.items[0],variationId:''}];
  const result=await withSaleItemEans(db,'empresa',[s]);assert.deepEqual(result[0].items.map(i=>i.ean),['7908103790527',null,null]);
  const known={...sale(),items:[{...raw[0],ean:'7908103790527'}]};await withSaleItemEans({from(){assert.fail('Sem consulta para código já conhecido')}},'empresa',[known]);
});
