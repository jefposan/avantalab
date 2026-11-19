import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const file=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('view.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='createRecord')handler=node.initializer.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(handler);
function fixture(){const views=[],created=[],toasts=[];let responder;const ctx={created:[],managementCatalogBridge:{stockIntegrated:true},newPermission:{pedido:'sales.create'},authorize:()=>true,documentLabel:()=> 'Pedido',crypto:{randomUUID:()=> 'chave-estavel'},setCreated:value=>created.push(value),writeCompanyStorage:()=>assert.fail('não gravar como confirmação local'),STORAGE_KEY:'teste',syncCommercialOrder:(record,target,previous,move,resolve)=>{responder=resolve;return true;},syncSavedOperation:()=>assert.fail('não enviar uma segunda gravação'),setNewType(){},setToast:message=>toasts.push(message),setEditingOrder(){},setView:view=>views.push(view),window:{setTimeout:()=>1,scrollTo(){}}};vm.createContext(ctx);vm.runInContext('var execute='+ts.transpileModule(`const fn=${handler};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.replace(/^const fn=/,'').replace(/^const fn = /,'').replace(/;\s*$/,''),ctx);return{ctx,views,created,toasts,reply:r=>responder(r)};}
const record={id:'pedido-local',persistenceKey:'chave-estavel',type:'pedido',status:'Confirmado',client:'Cliente teste',order:{reserveStock:true,stockState:'Sem movimentação'}};
test('confirmação real aguarda servidor; falha mantém formulário e não navega para lista',async()=>{
 const f=fixture();const pending=f.ctx.execute(record);assert.equal(f.views.length,0);f.reply({ok:false,message:'Falha controlada'});assert.equal((await pending).ok,false);assert.equal(f.views.length,0);
});
test('somente confirmação positiva libera a tela de pedidos',async()=>{
 const f=fixture();const pending=f.ctx.execute(record);assert.equal(f.views.length,0);f.reply({ok:true,message:'Confirmado'});assert.equal((await pending).ok,true);assert.deepEqual(f.views,['vendas']);
});
test('formulário reaproveita identidade e apresenta erro sem descartar itens; cabeçalho reutiliza nota fiscal',()=>{
 assert.match(file,/const \[draftIdentity\]=useState\(/);assert.match(file,/id: draftIdentity\.id/);assert.match(file,/persistenceKey: draftIdentity\.persistenceKey/);assert.match(file,/const result=await onCreated\(record\)/);assert.match(file,/if\(result&&!result\.ok\)showIssue\(result\)/);
 assert.match(file,/className="order-page-heading note-page-heading"/);
});
