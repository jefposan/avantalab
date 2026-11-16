import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../../app/avantavendas/sistema/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../../app/avantavendas/sistema/styles.css',import.meta.url),'utf8');
test('ranking sempre nasce recolhido, sem mudar abertura dos demais blocos',()=>{
 const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const render=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='renderRelatorioCliente');
 let bloco; const visitar=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='bloco')bloco=n.initializer.getText(ast);ts.forEachChild(n,visitar)};visitar(render);
 const gerar=vm.runInNewContext(`(${bloco})`,{svgIcon:()=>''});
 for(let i=0;i<3;i++)assert.doesNotMatch(gerar('Produtos mais comprados','conteúdo').split('>')[0],/\bopen\b/);
 for(const titulo of ['Resumo por ano','Bonificações'])assert.match(gerar(titulo,'conteúdo').split('>')[0],/\bopen\b/);
});
test('rolagem é limitada ao ranking, considerando header e rodapé, com limpeza dos eventos',()=>{
 assert.match(source,/app.querySelector\('\.relatorio-produtos'\)/);
 assert.match(source,/Math.max\(header,teto\) \+ 8/);
 assert.match(source,/Math.min\(altura,fundoArea,nav.top\)/);
 assert.match(source,/externo.scrollTop \+= Math.min\(delta,distancia\)/);
 assert.match(source,/limparRolagemProdutosRelatorio = \(\) => controlador.abort\(\)/);
 assert.match(source,/function render\(\) \{\s+limparRolagemProdutosRelatorio\?\.\(\)/);
 assert.match(css,/\.relatorio-produtos > summary \{ flex: 0 0 auto/);
 assert.match(css,/\.relatorio-produtos > \.relatorio-conteudo \{[^}]*max-height:[^}]*overflow-y: auto/);
 assert.match(source,/tabindex="0" role="region" aria-label="Lista de produtos mais comprados"/);
});
