import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=resolve(import.meta.dirname,'..');
const hooks=registerHooks({resolve(s,c,next){if(s==='@/app/lib/formatters')return next(pathToFileURL(resolve(root,'app/lib/formatters.ts')).href,c);return next(s,c);},load(url,c,next){if(url.endsWith('/CampoMoeda.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}});
const {default:CampoMoeda,posicionarCursorMoeda}=await import('../app/components/CampoMoeda.tsx');hooks.deregister();
test('campo monetário usa milhares, vírgula, duas casas e preserva vazio, label e bloqueios',()=>{
 for(const [raw,expected]of [['',''],['1','0,01'],['123456','1.234,56'],['86,42','86,42'],['R$ 2.345,67','2.345,67']]){
  const element=CampoMoeda({value:raw,onChange(){},id:'preco','aria-label':'Preço médio',disabled:true,readOnly:true,required:true});
  assert.equal(element.props.value,expected);assert.equal(element.props.type,'text');assert.equal(element.props.inputMode,'numeric');assert.equal(element.props.style.textAlign,'right');
  const html=renderToStaticMarkup(element);assert.match(html,/aria-label="Preço médio"/);assert.match(html,/disabled=""/);assert.match(html,/readOnly=""/);assert.match(html,/required=""/);
 }
});
test('foco, clique, digitação, colagem e apagar mantêm valor mascarado e cursor no fim',()=>{
 const original=globalThis.requestAnimationFrame,frames=[],ranges=[],values=[];globalThis.requestAnimationFrame=callback=>frames.push(callback);
 const input={value:'86,42',isConnected:true,ownerDocument:{},setSelectionRange:(a,b)=>ranges.push([a,b])};input.ownerDocument.activeElement=input;
 try{
  let focused=0,clicked=0;const element=CampoMoeda({value:input.value,onChange:value=>values.push(value),onFocus:()=>focused++,onClick:()=>clicked++});
  element.props.onFocus({currentTarget:input});element.props.onClick({currentTarget:input});assert.equal(focused,1);assert.equal(clicked,1);assert.deepEqual(ranges.at(-1),[5,5]);
  for(const [raw,expected]of [['1','0,01'],['12','0,12'],['123456','1.234,56'],['R$ 9.876,54','9.876,54'],['','']]){input.value=raw;element.props.onChange({currentTarget:input});assert.equal(input.value,expected);assert.equal(values.at(-1),expected);assert.deepEqual(ranges.at(-1),[expected.length,expected.length]);}
  frames.splice(0).forEach(callback=>callback());assert.deepEqual(ranges.at(-1),[0,0]);
  posicionarCursorMoeda(input);const before=ranges.length;input.isConnected=false;frames.splice(0).forEach(callback=>callback());assert.equal(ranges.length,before);
 }finally{globalThis.requestAnimationFrame=original;}
});
test('ajuste de referência do AvantaPreços reutiliza campo oficial e mantém gravação explícita',()=>{
 const source=readFileSync(resolve(root,'app/marketplaces/consulta/MarketplaceMobileApp.tsx'),'utf8');
 assert.match(source,/<CampoMoeda id="history-market-price" value=\{marketPriceDraft\} onChange=\{setMarketPriceDraft\}/);
 assert.match(source,/setMarketPriceDraft\(result\?\.prices \? formatarMoedaDigitada/);
 assert.match(source,/onSubmit=\{updateHistoryPrice\}/);
 assert.doesNotMatch(source,/<input id="history-market-price"/);
});
