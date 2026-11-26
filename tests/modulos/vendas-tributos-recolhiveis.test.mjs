import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
test('tributos iniciam fechados por item, com botão nativo e indicador somente quando há pendência',()=>{
 const start=source.indexOf("{line.kind==='produto'&&<details");const end=source.indexOf('</details>}',start)+12;
 const jsx=source.slice(start,end);
 for(const pending of [false,true]){
  const sandbox={exports:{},require:()=>({jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}),line:{kind:'produto',id:'synthetic',name:'Produto sintético'},taxPending:pending,details:[['CFOP','5102'],['NCM','48202000']],fiscalEditor:null,Icon:'icon',Tooltip:'tooltip'};
  vm.runInNewContext(ts.transpileModule(`function Render(){return <>${jsx}</>} exports.render=Render;`,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
  const details=sandbox.exports.render().props.children;
  assert.equal(details.type,'details');assert.equal(details.props.open,undefined);
  const [summary,fields]=details.props.children;
  assert.equal(summary.type,'summary');assert.match(summary.props['aria-label'],/Produto sintético/);
  assert.equal(Boolean(summary.props.children.at(-1)),pending);
  assert.equal(fields.type,'dl');assert.equal(fields.props.children.length,2);
 }
});
test('pendência considera classificação existente e campos essenciais, sem exigir alíquota ICMS positiva',()=>{
 const line=source.split('\n').find(line=>line.includes('const taxPending ='));
 const evaluate=new Function('line','cfop','itemTax','tax','code',line+'\nreturn taxPending;');
 assert.equal(evaluate({sku:'x',fiscalStatus:'Completo'},'5102',{}, {ncm:'48202000'},()=> '99'),false);
 assert.equal(evaluate({sku:'x',fiscalStatus:'Completo'},'',{}, {ncm:'48202000'},()=> '99'),true);
 assert.equal(evaluate({sku:'x',fiscalStatus:'Revisar'},'5102',{}, {ncm:'48202000'},()=> '99'),true);
});
