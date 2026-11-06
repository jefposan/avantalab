import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {deliveryForecastAllowed,updateFiscalNoteFields,newFiscalNoteFields} from '../../app/vendas/lib/fiscal-note-editor.mjs';
const source=readFileSync('app/vendas/components/FiscalNoteBlocks.tsx','utf8'),ast=ts.createSourceFile('blocks.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const node=(type,props)=>({type,props});const scope={exports:{},require:()=>({jsx:node,jsxs:node,Fragment:'fragment'}),Block:'Block',Field:'Field',CampoData:'CampoData',Options:'Options',Uf:'Uf',FREIGHT_MODES:[],PRESENCE_MODES:[],deliveryForecastAllowed};
const code=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['NoteDetailsFields','NoteTransportFields'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
const nodes=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(nodes)];
test('calendário e digitação de previsão ficam desabilitados somente nas modalidades 1, 4 e 9',()=>{
 for(const mode of ['0','1','2','3','4','9']){const value={...newFiscalNoteFields(),freightMode:mode,deliveryForecast:'2026-11-10'};const tree=scope.exports.NoteDetailsFields({value,onChange(){}});const date=nodes(tree).find(n=>n.type==='CampoData'&&n.props.name==='deliveryForecast');assert.ok(date);assert.equal(date.props.disabled,!['0','2','3'].includes(mode));assert.equal(date.props.value,['0','2','3'].includes(mode)?'2026-11-10':'');}
});
test('trocar o frete limpa somente a previsão incompatível; reabrir não mantém valor invisível',()=>{
 const original={...newFiscalNoteFields(),freightMode:'0',deliveryForecast:'2026-11-10',number:'12',internalNotes:'Preservar'};
 for(const mode of ['1','4','9']){let patch;const select=nodes(scope.exports.NoteTransportFields({value:original,onChange:p=>patch=p})).find(n=>n.type==='select'&&n.props.name==='freightMode');select.props.onChange({target:{value:mode}});assert.equal(patch.deliveryForecast,'');const result=updateFiscalNoteFields(original,patch);assert.equal(result.deliveryForecast,'');assert.equal(result.number,'12');assert.equal(result.internalNotes,'Preservar');assert.equal(updateFiscalNoteFields({...original,freightMode:mode}).deliveryForecast,'');assert.equal(updateFiscalNoteFields(result,{freightMode:'0'}).deliveryForecast,'');}
 for(const mode of ['0','2','3'])assert.equal(updateFiscalNoteFields(original,{freightMode:mode}).deliveryForecast,'2026-11-10');assert.equal(original.deliveryForecast,'2026-11-10');assert.equal(deliveryForecastAllowed('unknown'),false);
});
