import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {fiscalValidationTarget} from '../../app/vendas/lib/fiscal-validation.mjs';
const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('screen.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const view=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='NewOrderView');
const focus=view.body.statements.find(n=>ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText(ast)==='useEffect'&&n.getText(ast).includes('note-field-validation-error'));
assert.ok(focus);
function run({field='',action=false}={}){
 let effect,helperCalls=[],focused=[],scrolled=[];
 const summary={id:'summary',focus:()=>focused.push('summary'),scrollIntoView:()=>scrolled.push('summary')};
 const message={id:'note-save-validation-message'};
 const button={focus:()=>focused.push('action'),scrollIntoView:()=>scrolled.push('action')};
 const input=field?{id:field}:null;
 const root={querySelector:selector=>selector==='#note-save-validation-message'?message:selector==='[data-validation-summary]'?summary:selector.includes('data-fiscal-correction-action')?(action?button:null):selector.includes(`[name="${field}"]`)?input:null};
 const scope={exports:{},useEffect:fn=>effect=fn,validationFocus:{field,message:'A emissão deve pertencer ao ambiente fiscal configurado.',attempt:1},savingFiscal:false,formRef:{current:root},fiscalValidationTarget,lines:[],focarCampoComErro:(...args)=>helperCalls.push(args),window:{matchMedia:()=>({matches:true})}};
 vm.runInNewContext(ts.transpileModule(focus.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,scope);effect();
 return{helperCalls,focused,scrolled,message,input};
}
test('erro geral apenas foca aviso único; não injeta mensagem após os botões',()=>{
 const result=run();assert.equal(result.helperCalls.length,0);assert.deepEqual(result.focused,['summary']);assert.deepEqual(result.scrolled,['summary']);
});
test('ação corretiva recebe foco sem ser marcada como campo inválido',()=>{
 const result=run({action:true});assert.equal(result.helperCalls.length,0);assert.deepEqual(result.focused,['action']);
});
test('erro de campo mantém destaque e referencia o aviso existente',()=>{
 const result=run({field:'authorizationCode'});assert.equal(result.helperCalls.length,1);assert.equal(result.helperCalls[0][0],result.input);assert.equal(result.helperCalls[0][1].messageElement,result.message);
});

test('aviso aprovado fica dentro do card de ações, antes de Salvar, com texto único e correção preservada',()=>{
 let actionContainer,notice;
 const visit=node=>{if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(ast)==='AvisoFormulario')notice=node;if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(ast)==='className'&&p.getText(ast).includes('order-actions')))actionContainer=node;ts.forEachChild(node,visit);};visit(view);
 assert.ok(notice);assert.ok(actionContainer);assert.ok(actionContainer.getText(ast).includes(notice.getText(ast)));
 assert.ok(actionContainer.getText(ast).indexOf('<AvisoFormulario')<actionContainer.getText(ast).indexOf("'Salvar'"));
 assert.match(notice.getText(ast),/data-fiscal-correction-action/);
 const start=view.getStart(ast),end=view.getEnd();assert.equal((source.slice(start,end).match(/<AvisoFormulario\b/g)||[]).length,1);
 const component=readFileSync('app/components/AvisoFormulario.tsx','utf8'),nodes=[];
 const jsx=(type,props)=>{const value={type,props};nodes.push(value);return value;};const scope={exports:{},require:id=>id.endsWith('.css')?{default:{aviso:'aviso'}}:{jsx,jsxs:jsx}};
 vm.runInNewContext(ts.transpileModule(component,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,scope);
 const result=scope.exports.default({titulo:'Não foi possível emitir',mensagem:'Mensagem única',idMensagem:'erro-nota',children:'Corrigir'});
 assert.equal(result.props.role,'alert');assert.equal(result.props.tabIndex,-1);
 assert.equal(nodes.filter(node=>node.type==='p'&&node.props.children==='Mensagem única').length,1);
 assert.ok(nodes.some(node=>node.type==='svg'&&node.props['aria-hidden']==='true'));
 assert.ok(nodes.some(node=>node.props?.id==='erro-nota'));
 const css=readFileSync('app/components/AvisoFormulario.module.css','utf8');assert.match(css,/minmax\(0, 1fr\)/);assert.match(css,/overflow-wrap: anywhere/);assert.match(css,/var\(--av-surface/);assert.match(css,/box-shadow: none/);
});
