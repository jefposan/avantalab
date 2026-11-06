import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

test('modal de ações comerciais cabe na viewport sem rolagem horizontal', async () => {
  const css = await readFile('app/vendas/sistema/vendas.css', 'utf8');

  assert.match(css, /\.dialog:has\(\.record-action-options\)\s*\{[^}]*grid-template-rows:\s*auto minmax\(0,1fr\) auto[^}]*width:\s*min\(940px,100%\)[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.record-action-options\s*\{[^}]*min-width:\s*0[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.record-action-options\s*>\s*button\s*\{[^}]*min-width:\s*0[^}]*max-width:\s*100%[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.record-action-options\s+(?:strong|small)\s*\{[^}]*overflow-wrap:\s*anywhere[^}]*white-space:\s*normal/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.record-action-options\s*\{\s*grid-template-columns:\s*1fr/);
});

test('menu aprovado preserva todas as ações e separa recurso previsto de condição e permissão', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  const groups = source.slice(source.indexOf('function groupCommercialRecordActions('), source.indexOf('function RecordActionsDialog('));
  const menu = source.slice(source.indexOf('function CommercialRecordActions('), source.indexOf('function NewServiceOrderView('));
  const sandbox = { exports: {}, require: () => ({ jsx: (_type, props) => props }), RecordActionsDialog: () => null, documentLabel: () => 'NF-e' };
  vm.runInNewContext(ts.transpileModule(groups + menu + '\nexports.groups=groupCommercialRecordActions; exports.menu=CommercialRecordActions;', { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, sandbox);
  let canceled = 0;
  const props = sandbox.exports.menu({ record: { id: '2026/1', type: 'Pedido', client: 'Cliente', status: 'Confirmado', fiscal: 'Cancelado', localRecord: { type: 'pedido', status: 'Confirmado', order: { fiscalDocument: 'nfe' } }, fiscalDraft: { status: 'Cancelado', documentType: 'nfe' } }, onLifecycleRequest: (_record, action) => { if (action === 'cancelar') canceled++; } });
  const all = sandbox.exports.groups(props.actions, () => true);
  assert.equal(props.compactOrder, true);
  assert.equal(all.available.length, 6);
  assert.equal(all.planned.length, 6);
  assert.equal(all.unavailable.length, 1);
  assert.equal(all.unavailable[0].label, 'Contas a receber');
  assert.equal(all.unavailable[0].reason, 'Disponíveis após o faturamento');
  assert.equal(all.destructive.label, 'Cancelar pedido');
  assert.equal(all.available.length + all.planned.length + all.unavailable.length + 1, props.actions.length, 'nenhuma ação desaparece ou se repete');
  assert.equal(canceled, 0, 'organizar o menu não executa cancelamento');
  all.destructive.onSelect(); assert.equal(canceled, 1);
  const denied = sandbox.exports.groups(props.actions, permission => permission !== 'stock.view' && permission !== 'sales.cancel');
  assert.ok(!denied.available.some(action => action.label === 'Estoque e reserva'));
  assert.equal(denied.unavailable.find(action => action.label === 'Estoque e reserva').reason, 'Sem acesso');
  assert.equal(denied.destructive.disabled, true);
  assert.ok(!denied.planned.some(action => action.label === 'Estoque e reserva'), 'falta de permissão não é recurso previsto');
});

test('agrupamento também preserva cancelamento fiscal e estorno financeiro com suas permissões', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  const code = source.slice(source.indexOf('function groupCommercialRecordActions('), source.indexOf('function RecordActionsDialog('));
  const sandbox = { exports: {} };
  vm.runInNewContext(ts.transpileModule(code + '\nexports.group=groupCommercialRecordActions;', { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox);
  for (const [label, permission] of [['Cancelar NF-e', 'fiscal.cancel'], ['Estornar recebimento', 'receivables.refund']]) {
    let executions = 0;
    const actions = [
      { label: 'Abrir detalhes', onSelect() { executions++; } },
      { label, permission, onSelect() { executions++; } },
      { label: 'Consultar situação', disabled: true, disabledLabel: 'Aguardando consulta' },
      { label: 'Recurso futuro', planned: true },
    ];
    const permitted = sandbox.exports.group(actions, () => true);
    assert.equal(permitted.destructive.label, label);
    assert.equal(permitted.destructive.disabled, false);
    assert.equal(permitted.available.length, 1);
    assert.equal(permitted.unavailable[0].reason, 'Aguardando consulta');
    assert.equal(permitted.planned.length, 1);
    assert.equal(executions, 0, 'abrir e organizar o popup não executa ações');
    permitted.destructive.onSelect();
    assert.equal(executions, 1);
    const denied = sandbox.exports.group(actions, value => value !== permission);
    assert.equal(denied.destructive.disabled, true);
    assert.ok(!denied.available.some(action => action.label === label));
  }
});
