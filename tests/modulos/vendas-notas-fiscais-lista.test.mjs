import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import {canResumeFiscalDraft} from '../../app/vendas/lib/fiscal-checkout.mjs';
import {nfeStandardCancellationAvailability} from '../../app/vendas/lib/fiscal-note-result.mjs';

const source = readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
const start = source.indexOf('function FiscalDraftRecordActions(');
const end = source.indexOf('\nfunction homologationTone', start);
const sandbox = { canResumeFiscalDraft, nfeStandardCancellationAvailability, exports: {}, require: () => ({ jsx: (_component, props) => props }), RecordActionsDialog: () => null, documentLabel: () => 'NF-e' };
vm.runInNewContext(ts.transpileModule(`${source.slice(start, end)}\nexports.actions = FiscalDraftRecordActions; exports.category = fiscalDraftListCategory;`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
const draft = { id: 'nota-1', originId: '2026/1', sourceLabel: 'Pedido', client: 'Cliente', documentType: 'nfe', status: 'Pronto para homologação', emissionId: 'emissao-1', number: '123', series: '1' };

test('nota autorizada no retrato não oferece cancelamento de rascunho enquanto consulta a situação', () => {
  const result = sandbox.exports.actions({ draft: { ...draft, remoteState: 'authorized' }, onReview() {}, onCancel() {}, onRevalidate() {} });
  assert.ok(!result.actions.some(action => action.label === 'Cancelar rascunho'));
  assert.ok(!result.actions.some(action => action.label === 'Revisar para emissão'));
  assert.equal(result.actions.find(action => action.label === 'Cancelar NF-e').disabled, true);
  assert.ok(result.title.includes('123'));
});

test('nota autorizada oferece XML e DANFE corretos; cancelada preserva arquivos sem oferecer novo cancelamento', () => {
  const calls = [];
  const artifacts = [{ id: 'xml-1', artifactType: 'processed_xml' }, { id: 'danfe-1', artifactType: 'danfe_pdf' }];
  const props = { draft, remoteStatus: { state: 'danfe_ready', authorized: true, number: 123, series: '1', artifacts }, onDownload: (...args) => calls.push(args), onDetails() {}, onCancel() {}, onRevalidate() {} };
  const live = sandbox.exports.actions(props);
  live.actions.find(action => action.label === 'Baixar XML autorizado').onSelect();
  live.actions.find(action => action.label === 'Baixar DANFE').onSelect();
  assert.deepEqual(calls, [['xml-1', 'processed_xml'], ['danfe-1', 'danfe_pdf']]);
  assert.ok(live.actions.some(action => action.label === 'Cancelar NF-e'));
  const canceled = sandbox.exports.actions({ ...props, remoteStatus: { ...props.remoteStatus, state: 'canceled' } });
  assert.ok(!canceled.actions.some(action => action.label.includes('Cancelar')));
  assert.ok(canceled.actions.some(action => action.label === 'Baixar XML autorizado'));
});

test('nota em processamento não oferece nova emissão nem cancelamento de rascunho', () => {
  const result = sandbox.exports.actions({ draft: { ...draft, remoteState: 'processing' }, onReview() {}, onCancel() {}, onRevalidate() {} });
  assert.ok(!result.actions.some(action => /Emitir|Continuar emissão|Cancelar rascunho|Revisar para emissão/.test(action.label)));
});

test('filtros e contadores usam a situação fiscal atual sem contar autorizada como preparação', () => {
  for (const [state, expected] of [['authorized', 'autorizados'], ['artifacts_stored', 'autorizados'], ['danfe_ready', 'autorizados'], ['rejected', 'rejeitados'], ['failed', 'rejeitados'], ['processing', 'processando'], ['signed', 'preparados'], ['prepared', 'preparados'], ['canceled', 'cancelados']]) {
    assert.equal(sandbox.exports.category({ ...draft, remoteState: state }), expected);
  }
  assert.equal(sandbox.exports.category({ ...draft, remoteState: 'prepared' }, { state: 'canceled', authorized: true }), 'cancelados');
  assert.equal(sandbox.exports.category({ ...draft, status: 'Com pendências' }), 'revisar');
});


test('ações abrem conferência sem botão de consulta técnica e sem transmitir ao abrir',()=>{
 for(const state of ['draft','prepared','signed','submitted','processing']){
  let opened=0;const result=sandbox.exports.actions({draft:{...draft,remoteState:state},onReview:()=>opened++,onDetails(){},onCancel(){},onRevalidate(){}});
  assert.ok(!result.actions.some(a=>/Consultar|Verificar envio|Atualizar situação/.test(a.label)));
  assert.equal(result.actions.length,['submitted','processing'].includes(state)?1:2);assert.equal(result.actions.some(a=>a.label==='Excluir rascunho'),!['submitted','processing'].includes(state));result.actions.find(a=>a.label!=='Editar nota').onSelect();assert.equal(opened,['submitted','processing'].includes(state)?0:1);
 }
});

 test('Emitir nota é a única entrada da conferência, sem transmitir ou excluir ao abrir',()=>{
 let edits=0,reviews=0;
 const result=sandbox.exports.actions({draft:{...draft,remoteState:'number_reserved'},remoteStatus:{state:'number_reserved',number:1,series:'1',artifacts:[]},onEdit:()=>edits++,onReview:()=>reviews++,onCancel(){},onDetails(){},onRevalidate(){}});
 assert.ok(!result.actions.some(a=>a.label==='Editar nota'));const edit=result.actions.find(a=>a.label==='Emitir nota');assert.ok(edit);assert.ok(!edit.disabled);edit.onSelect();assert.equal(edits,1);assert.equal(reviews,0);
 for(const state of ['authorized','processing','submitted','canceled'])assert.ok(!sandbox.exports.actions({draft:{...draft,remoteState:state},onEdit(){},onDetails(){},onCancel(){},onRevalidate(){}}).actions.some(a=>a.label==='Editar nota'));
 });
