import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
const ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback,key;
function visit(node){
 if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='NewOrderView'){
  const attr=node.attributes.properties.find(x=>x.name?.getText(ast)==='correction');
  if(attr&&ts.isJsxExpression(attr.initializer)&&ts.isObjectLiteralExpression(attr.initializer.expression)){
   callback=attr.initializer.expression.properties.find(x=>x.name?.getText(ast)==='onSave').initializer;
   key=node.attributes.properties.find(x=>x.name?.getText(ast)==='key').initializer.expression;
  }
 }
 ts.forEachChild(node,visit);
}visit(ast);
function setup({saved,checkout,state,statusCode}){let calls=[],closed=[];const scope={exports:{},rejectedDraft:{id:'draft',emissionId:'emission'},status:{version:4,state:state||'number_reserved',statusCode},requestFiscalCorrection:async(...args)=>{calls.push(['save',...args]);return saved;},checkoutAndShowResult:async(...args)=>{calls.push(['checkout',...args]);return checkout;},setIssueDraft:x=>closed.push(['issue',x]),setEditingDraft:x=>closed.push(['edit',x])};vm.runInNewContext(ts.transpileModule(`exports.save=${callback.getText(ast)};`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);return {save:scope.exports.save,calls,closed};}
test('Salvar e emitir usa a versão confirmada, preserva a tela e devolve o campo do erro',async()=>{
 for(const version of [5,7,12]){const error={ok:false,field:'presence',message:'Revise o atendimento'};const x=setup({saved:{ok:true,correctedEmission:{emissionId:'emission',state:'number_reserved',version}},checkout:error});assert.equal(await x.save({operationNature:'Consumidor final'},true),error);assert.equal(x.calls.length,2);assert.equal(x.calls[1][1].remoteVersion,version);assert.equal(x.calls[0].at(-1),false);assert.equal(x.closed.length,0);}
 const keyCode=key.getText(ast);assert.ok(keyCode.includes('rejectedDraft.id'));assert.ok(!keyCode.includes('version'),'A versão de gravação não pode desmontar o editor nem apagar o erro.');
});
test('falha de revisão e vínculo divergente não enviam; autorização abre resultado e encerra a edição',async()=>{
 for(const saved of [{ok:false,message:'Natureza inválida'},{ok:true},{ok:true,correctedEmission:{emissionId:'outro',version:5,state:'number_reserved'}}]){const x=setup({saved});const result=await x.save({},true);assert.equal(result.ok,false);assert.equal(x.calls.length,1);assert.equal(x.closed.length,0);}
 const x=setup({saved:{ok:true,correctedEmission:{emissionId:'emission',version:5,state:'number_reserved'}},checkout:{ok:true,emission:{state:'authorized'}}});assert.equal((await x.save({},true)).ok,true);assert.equal(x.calls.length,2);assert.equal(x.closed.length,2);
 const saved=setup({saved:{ok:true}});await saved.save({},false);assert.equal(saved.calls.length,1);assert.equal(saved.calls[0].at(-1),true);
});

test('217, processamento e rejeição permanecem na conferência; tentativa assinada não grava nem troca dados',async()=>{
 for(const state of ['signed','submitted','processing']){const error={ok:false,code:state==='signed'?'AV-NFE-NOT-RECEIVED':'AV-FISCAL-CHECKOUT-REJECTED',message:'Retorno fiscal sintético'};const x=setup({state,checkout:error});assert.equal(await x.save({},true),error);assert.equal(x.calls.length,1);assert.equal(x.calls[0][0],'checkout');assert.equal(x.calls[0][1].remoteState,state);assert.equal(x.closed.length,0);const save=setup({state});assert.equal((await save.save({},false)).ok,false);assert.equal(save.calls.length,0);}
 const authorized=setup({state:'signed',checkout:{ok:true,emission:{state:'authorized'}}});await authorized.save({},true);assert.equal(authorized.closed.length,2);
 const editable=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='FiscalView').body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='editableDraft')).declarationList.declarations[0].initializer;
 const issue=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='FiscalView').body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='rejectedDraft')).declarationList.declarations[0].initializer;
 for(const state of ['signed','submitted','processing','rejected']){const scope={editingDraft:{id:'a',emissionId:'e'},editingStatus:{state},drafts:[],issueDraft:null,remoteStatuses:{}};assert.ok(vm.runInNewContext(editable.getText(ast),scope));const scopeIssue={editableDraft:null,drafts:[],issueDraft:{id:'a',emissionId:'e'},remoteStatuses:{e:{state}}};assert.ok(vm.runInNewContext(issue.getText(ast),scopeIssue));}
});

test('ausência confirmada 217 permite salvar alterações; tentativa incerta continua preservada',async()=>{
 const x=setup({state:'signed',statusCode:'217',saved:{ok:true,correctedEmission:{emissionId:'emission',state:'number_reserved',version:7}}});
 assert.equal((await x.save({operationNature:'Natureza corrigida'},false)).ok,true);assert.equal(x.calls.length,1);assert.equal(x.calls[0][0],'save');assert.equal(x.calls[0].at(-1),true);
 const current=setup({state:'signed',statusCode:'217',saved:{ok:true,correctedEmission:{emissionId:'emission',state:'number_reserved',version:8}},checkout:{ok:false,message:'Rejeição 1040'}});
 assert.equal((await current.save({},true)).ok,false);assert.equal(current.calls[0][0],'save');assert.equal(current.calls[1][0],'checkout');assert.equal(current.closed.length,0);
 const view=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='NewOrderView');const declaration=view.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='fiscalAttemptLocked')).declarationList.declarations.find(d=>d.name.getText(ast)==='fiscalAttemptLocked');
 for(const [state,statusCode,expected]of [['signed','217',false],['signed','',true],['submitted','217',true],['processing','105',true],['rejected','1040',false]])assert.equal(vm.runInNewContext(declaration.initializer.getText(ast),{correction:{status:{state,statusCode}}}),expected);
});
