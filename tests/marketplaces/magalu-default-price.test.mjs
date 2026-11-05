import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {suggestedPriceCents} from '../../app/modules/marketplaces/price-settings.ts';
const source=ts.createSourceFile('MagaluListing.tsx',readFileSync('app/marketplaces/MagaluListing.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='loadProduct')callback=node.initializer.arguments[0].getText(source);ts.forEachChild(node,visit);}
visit(source);
for(const [reference,percentages,expected] of [[100000,{minimum:50,medium:70,ideal:90},90000],[100000,{minimum:50,medium:75,ideal:95},95000],[null,{minimum:50,medium:70,ideal:90},0],[100000,null,0]])test(`Magalu prepara Ideal do perfil, sem escrever referência: ${reference}/${percentages?.ideal}`,async()=>{
 const local={id:'product',revision:2,sku:'P1',name:'Produto',description:'Descrição',pictures:[],attributes:[],publication_form:{},stock_quantity:1,price_cents:reference};
 const original=structuredClone(local),state={},requests=[];
 const context={URLSearchParams,pricePercentages:percentages,suggestedPriceCents,companyId:'company',crypto,emptyForm:()=>({}),formatarMoedaDigitada:value=>String(value),marketplaceClientRequest:async path=>{requests.push(path);return{product:local};}};
 for(const key of ['Preparing','Busy','Message','Errors','Product','Template','Categories','Confirmed','Progress','RequestKey','Form','PriceText'])context['set'+key]=value=>{state[key]=value;};
 const load=vm.runInNewContext(ts.transpileModule(`(${callback})`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 await load('product');assert.equal(state.Form.priceCents,expected);assert.equal(state.PriceText,expected?String(expected):'');assert.equal(state.Busy,false);assert.deepEqual(local,original);assert.equal(requests.length,1);assert.match(requests[0],/empresaId=company&productId=product/);
});
