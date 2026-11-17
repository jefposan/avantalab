import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {fiscalOriginLabel} from '../../app/vendas/lib/fiscal-origin-presentation.mjs';
const uuid='4e4233ae-2f5a-4c17-adf0-123456789abc';
const cases=[['Nota avulsa',uuid,'Nota avulsa'],['Pedido','2026/123','Pedido nº 2026/123'],['Pedido','PED-001','Pedido nº 001'],['Ordem de serviço','OS-123','OS nº 123'],['Ordem de serviço','123','OS nº 123'],['Ordem de serviço',uuid,'OS'],['Pedido',uuid,'Pedido'],['Venda rápida',uuid,'Venda rápida']];
test('origem apresenta tipo e número comercial sem expor UUID nem modificar vínculos',()=>{
 for(const [sourceLabel,originId,expected]of cases){const value={sourceLabel,originId};assert.equal(fiscalOriginLabel(value),expected);assert.deepEqual(value,{sourceLabel,originId});}
});
test('colunas de origem das duas listas fiscais usam a apresentação legível',()=>{
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
 const ast=ts.createSourceFile('screen.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),cells=[];
 const visit=node=>{if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(ast)==='td'&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(ast)==='data-label'&&p.initializer?.text==='Origem'))cells.push(node.getText(ast));ts.forEachChild(node,visit);};visit(ast);
 assert.equal(cells.length,2);
 for(const cell of cells){const node=(type,props)=>({type,props}),scope={exports:{},fiscalOriginLabel,require:()=>({jsx:node,jsxs:node})};vm.runInNewContext(ts.transpileModule(`exports.render=(draft)=>(${cell});`,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,scope);
  for(const [sourceLabel,originId,expected]of cases){const rendered=scope.exports.render({sourceLabel,originId});assert.equal(rendered.props.children.props.children,expected);}
 }
});
