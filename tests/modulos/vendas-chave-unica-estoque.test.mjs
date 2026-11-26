import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
test('Ajustes apresenta somente a chave oficial; aguarda confirmação e mantém erro em caso de falha',async()=>{
 const start=source.indexOf("      {section === 'estoque' &&");const end=source.indexOf("      {section === 'fiscal' &&",start);
 for(const ok of [true,false]){
  const calls=[],busy=[],errors=[];
  const sandbox={exports:{},require:()=>({jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}),section:'estoque',stockControlContext:{enabled:true,canEdit:true,save:async enabled=>{calls.push(enabled);return {ok,message:ok?'Salvo':'Consulta local bloqueada'};}},stockControlBusy:false,stockControlError:'',setStockControlBusy:value=>busy.push(value),setStockControlError:value=>errors.push(value),ChaveAtivacao:'official-switch',AvisoFormulario:'error'};
  vm.runInNewContext(ts.transpileModule('function Render(){return <>'+source.slice(start,end)+'</>} exports.render=Render;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
  const find=(node)=>node&&typeof node==='object'?[node,...Object.values(node.props||{}).flatMap(value=>Array.isArray(value)?value.flatMap(find):find(value))]:[];
  const switches=find(sandbox.exports.render()).filter(node=>node.type==='official-switch');assert.equal(switches.length,1);
  assert.equal(calls.length,0);await switches[0].props.onChange(false);assert.deepEqual(calls,[false]);assert.deepEqual(busy,[true,false]);
  assert.equal(switches[0].props.checked,true,'sem sucesso otimista antes do retrato confirmado');
  if(!ok)assert.equal(errors.at(-1),'Consulta local bloqueada');
 }
});
test('não existem chaves paralelas por pedido/produto nem seletores visíveis de locais',()=>{
 assert.doesNotMatch(source,/Controlar estoque neste pedido|onSelect:onControl|Locais e rastreabilidade/);
 assert.match(source,/managementContextReady&&stockControls.enabled&&can\('stock.view'\)/);
 assert.match(source,/view === 'estoque' && stockControls.enabled/);
 assert.match(source,/id !== 'estoque' \|\| stockControls.enabled/);
 const block=source.slice(source.indexOf("      {section === 'estoque' &&"),source.indexOf("      {section === 'fiscal' &&",source.indexOf("      {section === 'estoque' &&")));
 assert.doesNotMatch(block,/Locais|textarea|select/);
});
