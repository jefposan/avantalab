import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const root=resolve(import.meta.dirname,'../..');
const hook=registerHooks({resolve(s,c,next){
  if(s==='react'&&c.parentURL?.endsWith('/QualitySummary.tsx'))return{url:'data:text/javascript,'+encodeURIComponent(`export {createContext,useEffect,useState} from ${JSON.stringify(pathToFileURL(resolve(root,'node_modules/react/index.js')).href)};export const useContext=()=>globalThis.qualityVisualRecords||[];`),shortCircuit:true};
  if(s.endsWith('.module.css'))return{url:'data:text/javascript,export default new Proxy({}, {get:(_,k)=>k})',shortCircuit:true};
  if(s==='next/image')return{url:'data:text/javascript,'+encodeURIComponent(`import React from ${JSON.stringify(pathToFileURL(resolve(root,'node_modules/react/index.js')).href)}; export default function Image({src,alt,width,height}){return React.createElement('img',{src,alt,width,height});}`),shortCircuit:true};
  const f=s.startsWith('@/')?resolve(root,s.slice(2)):s.startsWith('.')&&c.parentURL?.startsWith('file:')?resolve(dirname(new URL(c.parentURL).pathname),s):null;
  if(f)for(const ext of ['.tsx','.ts'])if(existsSync(f+ext))return next(pathToFileURL(f+ext).href,c);
  return next(s,c);
},load(url,c,next){if(url.startsWith('file:')&&url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {default:Identity}=await import('../../app/marketplaces/ListingProductIdentity.tsx');
const {default:GroupHeader}=await import('../../app/marketplaces/ListingGroupHeader.tsx');
const {default:QualitySummary}=await import('../../app/marketplaces/QualitySummary.tsx');
hook.deregister();
const item={id:'MLB7764166726',title:'Purificador Soft',ean:'7898077620930',sku:'SKU-NAO-E-EAN',pictures:['https://http2.mlstatic.com/D_123.jpg']};

test('grupo renderiza identidade única, contas distintas, situações e faixa de preços acessível',()=>{
 const group={key:'product:1',productId:'1',title:item.title,ean:item.ean,pictures:item.pictures,stockQuantity:2,stockPending:false,listings:[{connectionId:'a',status:'active',snapshot:{...item,price:200,currency:'BRL'}},{connectionId:'b',status:'paused',snapshot:{...item,id:'MLB2',price:250,currency:'BRL'}}]};
 const html=renderToStaticMarkup(React.createElement(GroupHeader,{group,provider:'mercado_livre',open:false,disabled:false,onToggle(){},controlsId:'group-details'}));
 assert.equal((html.match(/<img /g)||[]).length,1);
 assert.match(html,/2 anúncios · 2 contas/);assert.match(html,/1 ativo · 1 pausado/);
 assert.match(html,/200,00 a R\$[^<]*250,00/);assert.match(html,/aria-expanded="false"/);assert.match(html,/aria-controls="group-details"/);assert.match(html,/Ver anúncios/);
 assert.match(html,/Preços dos anúncios/);assert.ok(html.indexOf('announcedGroupCounts')<html.indexOf('Ver no estoque'));assert.ok(html.indexOf('announcedGroupCounts')>html.indexOf('announcedGroupPrices'));
});

test('preço igual é identificado como anunciado; valores ausentes não viram referência pesquisada',()=>{
 assert.match(readFileSync('app/marketplaces/ListingGroupHeader.tsx','utf8'),/aria-hidden="true">Ⅱ - <\/span>/);
 for(const price of [783.07,null]){const group={productId:'1',title:item.title,ean:item.ean,pictures:[],listings:[{connectionId:'a',status:'paused',snapshot:{...item,price,currency:'BRL'}}]};const html=renderToStaticMarkup(React.createElement(GroupHeader,{group,provider:'mercado_livre',open:false,disabled:false,onToggle(){},controlsId:'details'}));assert.match(html,/Preço anunciado/);assert.match(html,/data-status="paused"/);assert.doesNotMatch(html,/Preço de referência|média pesquisada/);if(price==null)assert.match(html,/Preço indisponível/);else assert.match(html,/783,07/);}
});
test('qualidade mantém nota na unidade da barra, sem aviso redundante; desconhecido não tem ponteiro falso',()=>{
 const links=[{connectionId:'a',id:'one'},{connectionId:'b',id:'two'}];globalThis.qualityVisualRecords=links.map((l,i)=>({connection_id:l.connectionId,listing_id:l.id,score:i?62:58,checked_at:new Date().toISOString(),issue:null}));
 let html=renderToStaticMarkup(React.createElement(QualitySummary,{links,wide:true}));assert.match(html,/58\/100/);assert.match(html,/left:58%/);assert.match(html,/menor nota entre os anúncios/);assert.doesNotMatch(html,/abaixo de 70/);assert.match(html,/class="meter"/);
 globalThis.qualityVisualRecords=[];html=renderToStaticMarkup(React.createElement(QualitySummary,{links}));assert.match(html,/Sem avaliação/);assert.doesNotMatch(html,/class="marker"|0\/100/);
 const css=readFileSync('app/marketplaces/quality-summary.module.css','utf8');assert.match(css,/white-space:nowrap/);assert.match(css,/#e21b12/);assert.match(css,/#009653/);
});

test('anunciado mostra foto compartilhada, conta e EAN abaixo sem substituir por SKU',()=>{
  const html=renderToStaticMarkup(React.createElement(Identity,{item,accountName:'ADRIANO'}));
  assert.match(html,/alt="Foto de Purificador Soft"/);assert.match(html,/width="56"/);assert.match(html,/height="56"/);
  assert.match(html,/<small>ADRIANO · MLB7764166726<\/small><small>EAN: 7898077620930<\/small>/);
  assert.doesNotMatch(html,/SKU-NAO-E-EAN/);
  const source=readFileSync(resolve(root,'app/marketplaces/ProductsStock.tsx'),'utf8');
  assert.match(source,/import ProductThumbnail from '\.\/ProductThumbnail'/);
  assert.match(readFileSync(resolve(root,'app/marketplaces/Anunciados.tsx'),'utf8'),/<ListingGroupHeader group={group}/);
  assert.match(readFileSync(resolve(root,'app/marketplaces/ListingGroupHeader.tsx'),'utf8'),/<ProductThumbnail url=\{group.pictures\?\.\[0\]\}/);
});
test('ausências são explícitas e estado de edição permanece visível',()=>{
  const html=renderToStaticMarkup(React.createElement(Identity,{item:{...item,ean:null,pictures:undefined},accountName:'CONTA',editing:true}));
  assert.match(html,/Sem foto/);assert.match(html,/EAN: Não informado/);assert.match(html,/Em edição/);assert.doesNotMatch(html,/<img|SKU-NAO-E-EAN/);
  assert.ok(readFileSync(resolve(root,'app/marketplaces/ProductThumbnail.tsx'),'utf8').includes('onError={() => setFailed(true)}'));
});
test('mesma tarja em Anunciados, cadastrados e estoque, nunca em Vendas',()=>{
 for(const [status,label] of [['active','Anunciado'],['published','Anunciado'],['paused','Pausado'],['under_review','Em análise'],['inactive','Desativado']]){
  const html=renderToStaticMarkup(React.createElement(Identity,{item:{...item,status},provider:'mercado_livre',accountName:'CONTA'}));
  assert.match(html,new RegExp(`productPublicationRibbon[^>]*>\\s*${label}`));
 }
 for(const itemState of [{status:'deleted'},{status:'active',substatus:['deleted']}]){
  const html=renderToStaticMarkup(React.createElement(Identity,{item:{...item,...itemState},provider:'mercado_livre',accountName:'CONTA'}));
  assert.doesNotMatch(html,/productPublicationRibbon/);
 }
 assert.match(readFileSync(resolve(root,'app/marketplaces/Anunciados.tsx'),'utf8'),/provider=\{marketplace\}/);
 for(const file of ['Vendas.tsx','SaleItems.tsx','DirectSalesHistory.tsx'])assert.doesNotMatch(readFileSync(resolve(root,'app/marketplaces/'+file),'utf8'),/ProductPublicationRibbon|ListingProductIdentity/);
});
