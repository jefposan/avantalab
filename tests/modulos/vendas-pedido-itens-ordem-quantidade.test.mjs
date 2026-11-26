import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
test('produto novo fica no topo; adicionar novamente soma quantidade e traz a linha existente ao topo',()=>{
 const start=source.indexOf('  const addItem = (item: CatalogItem) => {');
 const end=source.indexOf('  const updateLine =',start);
 const code=ts.transpileModule(source.slice(start,end)+'\nreturn addItem;',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let lines=[];
 const add=new Function('setLines','setSubmitted','orderLineFromCatalog',code)(update=>{lines=update(lines);},()=>{},item=>({id:item.sku,sku:item.sku,quantity:1}));
 add({sku:'A'});add({sku:'B'});add({sku:'C'});
 assert.deepEqual(lines.map(line=>line.sku),['C','B','A']);
 add({sku:'A'});assert.deepEqual(lines.map(line=>line.sku),['A','C','B']);assert.equal(lines[0].quantity,2);assert.equal(lines.length,3);
});
test('controle reutilizado oferece menos à esquerda, edição manual e mais à direita, sem quantidade negativa',()=>{
 const start=source.indexOf('function LineNumberEditor(');const end=source.indexOf('\nconst ProductRegistration',start);
 const changed=[];
 const sandbox={exports:{},require:()=>({jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}),useState:initial=>[typeof initial==='function'?initial():initial,()=>{}],useEffect:()=>{},formatLineNumber:value=>String(value),fittedNumericFontSize:()=>12,parseCommercialNumber:value=>Number(value.replace(',','.'))};
 vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nexports.render=LineNumberEditor;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,sandbox);
 const render=(value,step=1,disabled=false)=>sandbox.exports.render({label:'Quantidade de Produto',value,step,compact:true,showSteppers:true,disabled,onChange:value=>changed.push(value)}).props.children[1].props.children;
 const children=render(2);const minus=children[1],input=children[2],plus=children[3];
 assert.equal(minus.type,'button');assert.equal(input.type,'input');assert.equal(plus.type,'button');
 minus.props.onClick();plus.props.onClick();input.props.onChange({target:{value:'2,5'}});assert.deepEqual(changed,[1,3,2.5]);
 assert.equal(render(0)[1].props.disabled,true);render(0.25)[1].props.onClick();assert.equal(changed.at(-1),0);
 render(1,0.5)[3].props.onClick();assert.equal(changed.at(-1),1.5);
 assert.equal(render(2,1,true)[1].props.disabled,true);assert.equal(render(2,1,true)[3].props.disabled,true);
});
