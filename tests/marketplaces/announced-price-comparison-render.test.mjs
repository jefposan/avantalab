import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {listingGroupSummary} from '../../app/modules/marketplaces/listing-groups.ts';
import {productPublicationState} from '../../app/modules/marketplaces/local-product-publications.ts';
import {suggestedPriceCents} from '../../app/modules/marketplaces/price-settings.ts';
const styles=new Proxy({},{get:(_,k)=>String(k)}),formatarMoeda=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
function component(file,name,scope){const text=readFileSync(file,'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name),exports={};vm.runInNewContext(ts.transpileModule(fn.getText(ast).replace('export default','export'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:createRequire(import.meta.url),styles,...scope});return exports[name];}
const ProductSalePrices=component('app/marketplaces/LocalProductPricing.tsx','ProductSalePrices',{suggestedPriceCents,formatarMoeda});
const Header=component('app/marketplaces/ListingGroupHeader.tsx','ListingGroupHeader',{listingGroupSummary,productPublicationState,formatarMoeda,ProductSalePrices,ProductThumbnail:()=>null,ProductPublicationRibbon:()=>null,QualitySummary:({label})=>React.createElement('div',{'data-quality':'bar'},label),BotaoAcaoCompacto:({children,disabled})=>React.createElement('button',{disabled},children)});
const group=(prices=[111],reference=12360)=>({key:'p',productId:'p',title:'Prancha Philco',ean:'7891356090271',pictures:[],referencePriceCents:reference,listings:prices.map((price,i)=>({connectionId:'account-'+i,status:'active',snapshot:{id:'MLB'+i,currency:'BRL',price,substatus:[]}}))});
const render=(g,percentages={minimum:50,medium:70,ideal:90})=>renderToStaticMarkup(React.createElement(Header,{group:g,percentages,provider:'mercado_livre',onToggle(){},open:false,disabled:false,controlsId:'list'}));
const plain=html=>html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
test('cabeçalho compara valor anunciado com a referência cadastrada e põe situação abaixo da qualidade',()=>{
 const html=render(group()),text=plain(html);assert.match(text,/Preço anunciado R\$ 111,00/);assert.match(text,/Mínimo · 50% R\$ 61,80/);assert.match(text,/Médio · 70% R\$ 86,52/);assert.match(text,/Ideal · 90% R\$ 111,24/);
 assert.ok(html.indexOf('data-quality="bar"')<html.indexOf('announcedGroupStatuses'));assert.match(html,/Qualidade do anúncio/);
});
test('preços distintos continuam como faixa; percentuais são os configurados e ausências não viram zero',()=>{
 const text=plain(render(group([90,111]),{minimum:25,medium:50,ideal:100}));assert.match(text,/Preços dos anúncios R\$ 90,00 a R\$ 111,00/);assert.match(text,/Mínimo · 25% R\$ 30,90/);assert.match(text,/Ideal · 100% R\$ 123,60/);
 const absent=plain(render(group([111],null)));assert.match(absent,/Preço anunciado R\$ 111,00/);assert.doesNotMatch(absent,/R\$ 0,00|R\$ 61,80/);assert.match(absent,/Mínimo · 50% —/);
 const noSettings=plain(render(group(),null));assert.match(noSettings,/Indisponível/);assert.doesNotMatch(noSettings,/R\$ 61,80/);
});
test('referência salva atualiza o comparativo só do produto da mesma empresa, sem alterar preço anunciado',()=>{
 const source=readFileSync('app/marketplaces/Anunciados.tsx','utf8'),ast=ts.createSourceFile('Anunciados.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
 const visit=n=>{if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes('PRODUCT_REFERENCE_CHANGED'))effect=n.arguments[0];ts.forEachChild(n,visit)};visit(ast);assert.ok(effect);
 let listener,groups=[{productId:'p',referencePriceCents:10000,listings:[{price:111}]}];
 vm.runInNewContext(ts.transpileModule(`(${effect.getText(ast)})()`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{companyId:'company',PRODUCT_REFERENCE_CHANGED:'reference',window:{addEventListener(_,fn){listener=fn},removeEventListener(){}},setListingGroups:fn=>{groups=fn(groups)}});
 listener({detail:{companyId:'other',product:{id:'p',empresa_id:'other',price_cents:99999}}});assert.equal(groups[0].referencePriceCents,10000);
 listener({detail:{companyId:'company',product:{id:'p',empresa_id:'company',price_cents:12360}}});assert.equal(groups[0].referencePriceCents,12360);assert.equal(groups[0].listings[0].price,111);
});
