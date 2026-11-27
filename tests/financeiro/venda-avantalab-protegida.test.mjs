import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const entry={id:'automatica',dia:30,mes:'NOVEMBRO',origem:'Venda Avantalab',valor:100,tipo:'vendas_servicos_sistema',status:'prevista'};
test('tabela real: Venda Avantalab aparece sem editar/apagar, mesmo com edição forçada',()=>{
 const source=readFileSync('app/components/TabelaEntradasFaturamento.tsx','utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',compiled)(name=>name==='./BotaoProximoScroll'?{default:()=>null}:require(name),module,module.exports);
 const props={entradas:[entry],mesAtivo:'NOVEMBRO',anoSelecionado:'2026',podeEditarEntradas:true,entradaEditandoId:entry.id};
 let html=renderToStaticMarkup(React.createElement(module.exports.default,props));
 assert.match(html,/Venda Avantalab/);assert.match(html,/Protegida/);assert.doesNotMatch(html,/<input|title="Editar"|title="Apagar"|Salvar edição/);
 html=renderToStaticMarkup(React.createElement(module.exports.default,{...props,entradaEditandoId:null,entradas:[{...entry,tipo:null,origem:'Manual'}]}));
 assert.match(html,/title="Editar"/);assert.match(html,/title="Apagar"/);
});
test('handlers reais da Gestão recusam editar, excluir e aceitar receita automática',async()=>{
 const source=readFileSync('app/gestao/page.tsx','utf8'),file=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const handlers=new Map();const names=['excluirEntradaFaturamento','iniciarEdicaoEntradaFaturamento','aceitarReceitaPrevistaHoje'];
 function visit(node){if(ts.isVariableDeclaration(node)&&names.includes(node.name.getText(file)))handlers.set(node.name.getText(file),node.initializer.getText(file));ts.forEachChild(node,visit);}visit(file);
 for(const name of names){let notices=0;const code=ts.transpileModule(`return (${handlers.get(name)});`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 const action=new Function('abrirAviso','empresaId','podeEditarLancamentos',code)(()=>notices++, 'empresa',true);await action(entry);assert.equal(notices,1,name);}
});
test('Gestão mobile também bloqueia a origem automática de Vendas',()=>{
 const source=readFileSync('public/mobile-app.js','utf8');const start=source.indexOf('function ehReceitaSincronizada(item)'),end=source.indexOf('\n  }',start)+4;
 const action=new Function(`return (${source.slice(start,end)});`)();
 assert.equal(action(entry),true);assert.equal(action({...entry,tipo:null}),false);
});
