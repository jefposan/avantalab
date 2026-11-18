import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {validateFiscalSettingsForm,mergeSettingsNumbering} from '../../app/vendas/lib/fiscal-settings-form.mjs';
import {validateFiscalMatrix,createDefaultFiscalMatrix} from '../../app/vendas/lib/fiscal-matrix.mjs';
const source=await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx',import.meta.url),'utf8');
const draft={commercial:{defaultFiscalDocument:'nfe'},fiscal:{documentScope:['nfe'],fiscalResponsible:'Contador informado',taxReviewConfirmed:true,taxReformReviewConfirmed:true,nfeSeries:'1',nfceSeries:'2',nfseSeries:'3',matrix:createDefaultFiscalMatrix()}};
test('configurações cadastrais fiscais não exigem CFOP; matriz continua bloqueada para publicar/emissão',()=>{
 assert.equal(validateFiscalSettingsForm(draft).ready,true);
 assert.ok(validateFiscalMatrix(draft.fiscal.matrix,['nfe']).errors.some(e=>e.includes('CFOP')));
 for(const scope of [[],['outro']])assert.equal(validateFiscalSettingsForm({...draft,fiscal:{...draft.fiscal,documentScope:scope}}).ready,false);
 assert.equal(validateFiscalSettingsForm({...draft,commercial:{defaultFiscalDocument:'nfce'}}).ready,false);
});
test('retorno da numeração preserva responsável, revisões e tipos de nota ainda não salvos',()=>{
 const result=mergeSettingsNumbering(draft,{...draft,fiscal:{...draft.fiscal,fiscalResponsible:'Anterior',taxReviewConfirmed:false,nfeSeries:'007'}});
 assert.equal(result.fiscal.nfeSeries,'007');assert.equal(result.fiscal.fiscalResponsible,'Contador informado');assert.equal(result.fiscal.taxReviewConfirmed,true);assert.deepEqual(result.fiscal.documentScope,['nfe']);assert.equal(draft.fiscal.nfeSeries,'1');
});
test('abrir numeração suspende o card pai sem limpar sua seção nem perder o rascunho',()=>{
 const start=source.indexOf('function SettingsView(');const end=source.indexOf('export function VendasServicosPrototype',start);const view=source.slice(start,end);
 assert.match(view,/suspended=\{numberingOpen\|\|matrixOpen\}/);
 assert.match(view,/onOpenNumbering=\{onOpenNumbering\}/);
 assert.match(view,/onOpenRules=\{canConfigureFiscal\?\(\)=>setMatrixOpen\(true\):undefined\}/);
 assert.doesNotMatch(view,/onOpenNumbering=\{onOpenNumbering\?\(\)=>\{setSection\(null\)/);
 assert.match(source,/<Dialog open=\{!suspended\}/);
 assert.match(source,/numberingOpen=\{fiscalNumberingOpen\}/);
});
test('ação real de salvar preferências chega ao salvamento sem validar a matriz fiscal',async()=>{
 const start=source.indexOf('  const save = async () => {',source.indexOf('function SettingsDialog('));const end=source.indexOf('  return <>',start);
 const action=source.slice(start,end).replace(' as ModuleSettings','');let saved=0,error;
 const run=new Function('saving','draft','defaultModuleSettings','normalizeModuleSettings','section','validateCompanyProfile','validateFiscalSettingsForm','validateModuleSettings','setError','onSaveCompany','onSave','setSaving','onClose',action+';return save();');
 await run(false,draft,{},x=>x,'fiscal',()=>assert.fail('cadastro da empresa fora de escopo'),validateFiscalSettingsForm,()=>assert.fail('não deve validar matriz fiscal'),e=>error=e,undefined,()=>{saved++;return true;},()=>{},()=>{});
 assert.equal(saved,1);assert.equal(error,'');
});
test('ação real de salvar numeração só fecha após confirmação; falha mantém a edição',async()=>{
 const start=source.indexOf('  const saveRemote = async () => {',source.indexOf('function FiscalNumberingDialog('));const end=source.indexOf('  const [voidOpen',start);const action=source.slice(start,end);
 for(const ok of [true,false]){let closed=0,error;const sent=[];
 const run=new Function('remote','onSaveRemote','remoteSaving','remoteSeries','remoteNext','setError','setRemoteSaving','onClose',action+';return saveRemote();');
 await run({version:5},async input=>{sent.push(input);return{ok,message:'Recusado'}},false,'7','10',e=>error=e,()=>{},()=>closed++);
 assert.deepEqual(sent,[{series:'7',nextNumber:10,expectedVersion:5}]);assert.equal(closed,ok?1:0);if(!ok)assert.equal(error,'Recusado');
 }
});
