import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('Ver estoque relê lista indisponível uma vez por clique e navega após recuperação',()=>{
 const text=readFileSync('app/marketplaces/WarehousesPanel.tsx','utf8');
 const ast=ts.createSourceFile('panel.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let effect;
 function walk(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('consumedNotice.current===noticeTarget.key'))effect=node.arguments[0];ts.forEachChild(node,walk);}
 walk(ast);assert.ok(effect);
 let reads=0;const failures=[],opened=[];
 const context={noticeTarget:{key:'attempt-1',panel:'stock',productId:'product'},consumedNotice:{current:''},noticeReloadAttempt:{current:''},loading:false,saving:false,listLocked:false,warehouses:[],error:'A consulta demorou mais que o esperado.',companyId:'company',load(){reads++;},setOpen(){},setNoticeFailure:value=>failures.push(value),setActiveNotice:value=>opened.push(value),setSelected(){},setPublicationFilter(){},setAccountSelection(){}};
 const run=vm.runInNewContext('('+ts.transpileModule(effect.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/;\s*$/,'')+')',context);
 run();assert.equal(reads,1);assert.equal(failures.length,0);
 context.loading=true;run();assert.equal(reads,1);
 context.loading=false;run();assert.equal(reads,1);assert.equal(failures.at(-1).error,context.error);
 context.noticeTarget={...context.noticeTarget,key:'attempt-2'};run();assert.equal(reads,2);
 context.warehouses=[{id:'online',is_online:true}];context.error='';run();
 assert.equal(opened.length,1);assert.equal(opened[0].key,'attempt-2');assert.equal(context.consumedNotice.current,'attempt-2');
 run();assert.equal(opened.length,1);
});
