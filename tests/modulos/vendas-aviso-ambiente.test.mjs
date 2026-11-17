import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('screen.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function dialogDescription(name){const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);let expression;const visit=n=>{if(ts.isJsxOpeningElement(n)&&n.tagName.getText(ast)==='Dialog'){const attr=n.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(ast)==='description');if(attr?.initializer&&ts.isJsxExpression(attr.initializer))expression=attr.initializer.expression.getText(ast);}ts.forEachChild(n,visit);};visit(fn);assert.ok(expression);return expression;}
test('prévia identifica homologação e não exibe produção nem herda aviso antigo de homologação',()=>{
 const expression=dialogDescription('FiscalIssueReviewDialog'),draft={sourceLabel:'Nota avulsa',originId:'id',environment:'Homologação local'};
 assert.match(vm.runInNewContext(expression,{draft,remoteStatus:{environment:'homologacao'}}),/Homologação — sem valor fiscal/);
 assert.equal(vm.runInNewContext(expression,{draft,remoteStatus:{environment:'producao'}}),'Nota avulsa id');
 assert.equal(vm.runInNewContext(expression,{draft:{...draft,environment:'Produção'},remoteStatus:undefined}),'Nota avulsa id');
});
test('serviço em produção não mostra descrição de ambiente',()=>{
 const expression=dialogDescription('FiscalEmissionServiceDialog');
 assert.equal(vm.runInNewContext(expression,{execution:{environment:'producao'}}),'');
 assert.match(vm.runInNewContext(expression,{execution:{environment:'homologacao'}}),/Homologação/);
});
