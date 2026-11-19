import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
test('menu renderiza somente ícones e nomes mesmo com quantidades muito grandes',()=>{
 const jsx=source.match(/\{(managementContextReady && <nav aria-label="Navegação comercial">[\s\S]*?<\/nav>)\}/)[1];
 const context={exports:{},React,renderToStaticMarkup,Icon:()=>React.createElement('svg',{'aria-hidden':true}),managementContextReady:true,view:'fiscal',commercialReturnView:'vendas',serviceReturnView:'servicos',navigate:()=>{},managementCatalogBridge:{},salesRecordCount:999999999999,serviceRecordCount:999999999999,fiscalDocumentCount:999999999999,stockAttentionCount:999999999999,receivableOpenCount:999999999999,visibleNavGroups:[{label:'Operação',items:[['vendas','Vendas','sale','999999999999'],['fiscal','Notas Fiscais','fiscal','999999999999']]},{label:'Controle',items:[['estoque','Estoque','stock','999999999999']]}]};
 vm.runInNewContext(ts.transpileModule(`exports.html=renderToStaticMarkup(${jsx});`,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022},fileName:'menu.tsx'}).outputText,context);
 assert.doesNotMatch(context.exports.html,/<small|999999999999/);assert.match(context.exports.html,/aria-current="page"/);assert.match(context.exports.html,/>Notas Fiscais<\/b>/);assert.match(context.exports.html,/>Estoque<\/b>/);
});
test('indicadores continuam dentro da página fiscal e não existe cálculo só para o menu',()=>{
 assert.match(source,/<Metric label="Documentos"/);assert.match(source,/<Metric label="Para emitir"/);assert.doesNotMatch(source,/const displayCount|const fiscalDocumentCount|const stockAttentionCount/);
});
