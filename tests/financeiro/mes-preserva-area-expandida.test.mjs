import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
test('trocar mês preserva Receitas; sair dos lançamentos restaura Despesas',()=>{
 const source=readFileSync('app/gestao/page.tsx','utf8');const file=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let callback;
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='useEffect'&&node.arguments[1]?.getText(file)==='[mesAtivo]'&&node.arguments[0].getText(file).includes('setBlocoAtivo'))callback=node.arguments[0].getText(file);ts.forEachChild(node,visit);}visit(file);
 assert.ok(callback,'efeito real do foco mensal encontrado');
 const compiled=ts.transpileModule(`return (${callback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let focus='receita',changes=0;
 const transition=month=>new Function('mesAtivo','setBlocoAtivo',compiled)(month,value=>{focus=value;changes++;})();
 for(const month of ['NOVEMBRO','DEZEMBRO','JANEIRO']){transition(month);assert.equal(focus,'receita');}
 assert.equal(changes,0);
 transition(null);assert.equal(focus,'despesa');transition('FEVEREIRO');assert.equal(focus,'despesa');
 focus='receita';transition('MARÇO');assert.equal(focus,'receita');transition(null);transition('ABRIL');assert.equal(focus,'despesa');
});
