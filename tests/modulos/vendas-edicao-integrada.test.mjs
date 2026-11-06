import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE, COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE, createCommercialOrderWorkflowRequest, parseCommercialOrderWorkflowResponse } from '../../app/vendas/lib/commercial-order-bridge.mjs';
import { handleCommercialOrderWorkflowRequest } from '../../app/vendas/lib/server/commercial-order-workflow-http.mjs';
import { createCommercialOrderWorkflow } from '../../app/vendas/lib/server/commercial-order-workflow.mjs';

const companyId = '11111111-1111-4111-8111-111111111111';
const operationId = '44444444-4444-4444-8444-444444444444';
const customerId = '33333333-3333-4333-8333-333333333333';
const requestId = 'pedido:editar:123';
const parent = readFileSync('app/vendas/VendasIntegrado.tsx', 'utf8');
const start = parent.indexOf('if (event.data.type === COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE)');
const bridgeBranch = parent.slice(start, parent.indexOf('if (event.data.type === COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE)', start));
const child = readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
const childStart = child.indexOf('const commercial = parseCommercialOrderWorkflowResponse(event.data);');
const responseBranch = child.slice(childStart, child.indexOf('const serviceWorkflow =', childStart));
const previous = { id: '2026/1', client: 'Cliente de teste', status: 'Confirmado', total: 1188, persistence: { operationId, customerId, version: 3 }, order: { lines: [{ sku: 'P01', quantity: 12, unitPrice: 99 }], seller: 'Vendedor', paymentMethod: 'pix', installments: 1, firstDueDate: '2026-11-05', notes: 'Preservar observação', fiscalDocument: 'nfe', stockState: 'Sem movimentação' } };

async function runBridge({ target = 'salvo', authenticated = true, denied = false } = {}) {
  let current = { id: operationId, customerId, year: 2026, number: 1, version: 3, status: 'confirmado', stockStatus: 'sem_movimentacao' };
  const effects = [];
  const workflow = createCommercialOrderWorkflow({
    customerRepository: { findByDocument() { throw Error('Não deve criar cliente'); } },
    customerService: { create() { throw Error('Não deve criar cliente'); } },
    operationService: { create() { throw Error('Não deve criar pedido'); }, update() { throw Error('Não deve alterar conteúdo na reabertura'); }, get: async () => ({ ok: true, operation: current }) },
    lifecycleService: {
      confirm() {}, startSeparation() {}, cancel() {}, returnInvoiced() {},
      reopen: async ({ orderId, expectedVersion }) => {
        if (denied) return { ok: false, errors: [{ code: 'AV-SALES-ORDER-PERMISSION', message: 'Sem permissão para editar.' }] };
        assert.equal(orderId, operationId); assert.equal(expectedVersion, 3);
        effects.push('reopen'); current = { ...current, status: 'salvo', version: 4 };
        return { ok: true };
      },
    },
    billingService: { invoice() { throw Error('Não deve faturar'); } },
  });
  let response;
  let requests = 0;
  const runtime = { configured: true, accessResolver: { resolve: async () => ({ authenticated, boundary: { companyId, userId: customerId, moduleId: 'vendas', userActive: true, membershipActive: true, companyActive: true, moduleActive: true }, effectivePermissions: { 'sales.edit': !denied } }) }, orderWorkflow: workflow };
  const sandbox = { event: { data: { type: COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE, requestId, target, persistenceKey: 'persistencia:editar:1', operationId } }, requestId, empresaId: companyId, token: 'sessao-teste', origemPrototipo: 'https://app.example', responseType: COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE, COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE, createCommercialOrderWorkflowRequest, URLSearchParams, JSON,
    fail: message => { response = { type: COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE, requestId, ok: false, message }; },
    destination: { postMessage: payload => { response = payload; } },
    fetch: async (url, options) => {
      requests++; assert.match(url, new RegExp(`companyId=${companyId}`)); assert.equal(options.headers.Authorization, 'Bearer sessao-teste');
      return handleCommercialOrderWorkflowRequest({ request: new Request('https://app.example' + url, options), runtime, companyId });
    },
  };
  await vm.runInNewContext(`(async () => {${bridgeBranch}})()`, sandbox);
  return { response, effects, requests };
}

function receive(response) {
  const result = { records: [previous], editor: null, view: 'vendas', error: '' };
  const sandbox = { event: { data: response }, parseCommercialOrderWorkflowResponse, pendingOrderWorkflowRef: { current: new Map([[requestId, { recordId: previous.id, target: 'salvo', previous, timer: 1 }]]) }, window: { clearTimeout() {}, scrollTo() {} },
    setCreated: update => { result.records = update(result.records); }, setEditingOrder: record => { result.editor = record; }, setView: view => { result.view = view; },
    showOrderError: message => { result.error = message; }, setToast() {}, setStandaloneFiscal() {}, setNewMenu() {}, setNewType() {}, setCommercialClient() {}, setCommercialSku() {}, setCommercialReturnView() {},
  };
  vm.runInNewContext(ts.transpileModule(`(() => {${responseBranch}})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  return result;
}

test('pedido confirmado atravessa a integração real da Gestão e abre o formulário completo após reabrir', async () => {
  const { response, requests, effects } = await runBridge();
  assert.equal(requests, 1); assert.deepEqual(effects, ['reopen']); assert.equal(response.ok, true);
  const result = receive(response);
  assert.equal(result.view, 'novo_pedido'); assert.equal(result.error, '');
  assert.equal(result.editor.id, previous.id); assert.equal(result.editor.status, 'Rascunho');
  assert.equal(result.editor.persistence.version, 4); assert.equal(result.records.length, 1);
  assert.equal(result.editor.order.lines, previous.order.lines);
  assert.equal(result.editor.order.notes, previous.order.notes);
  assert.equal(result.editor.order.paymentMethod, previous.order.paymentMethod);
  assert.equal(result.editor.order.seller, previous.order.seller);
  assert.equal(result.editor.total, previous.total);
});

test('integração mantém recusa de alvo inválido, sessão ausente e permissão negada sem abrir edição', async () => {
  const invalid = await runBridge({ target: 'inventado' });
  assert.equal(invalid.requests, 0);
  for (const options of [{ authenticated: false }, { denied: true }]) {
    const result = await runBridge(options); assert.equal(result.response.ok, false); assert.deepEqual(result.effects, []);
    const ui = receive(result.response); assert.equal(ui.editor, null); assert.equal(ui.view, 'vendas'); assert.equal(ui.records[0], previous); assert.ok(ui.error);
  }
});

test('Editar pedido vai direto à reabertura; ações destrutivas conservam confirmação', () => {
  const handlerStart = child.indexOf('onLifecycleRequest={(localRecord, action) =>');
  const handler = child.slice(handlerStart, child.indexOf('/>', handlerStart));
  const callback = handler.slice(handler.indexOf('=>') + 2, handler.lastIndexOf('}'));
  const calls = [];
  const sandbox = { localRecord: previous, onLifecycle: (record, action) => calls.push(['direto', record.id, action]), setLifecycleRequest: request => calls.push(['confirmar', request.action]) };
  for (const action of ['editar', 'faturar', 'cancelar']) vm.runInNewContext(callback, { ...sandbox, action });
  assert.deepEqual(calls, [['direto', '2026/1', 'editar'], ['confirmar', 'faturar'], ['confirmar', 'cancelar']]);
});

test('falha comercial usa alerta de erro e uma mensagem posterior não herda esse estado', () => {
  let tone, message;
  const start = child.indexOf('const setToast = useCallback(');
  const end = child.indexOf('\n', child.indexOf('const showOrderError =', start));
  const sandbox = { useCallback: callback => callback, setToastTone: value => { tone = value; }, setToastMessage: value => { message = value; } };
  vm.runInNewContext(ts.transpileModule(child.slice(start, end) + "\nshowOrderError('Falha na reabertura');", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  assert.equal(tone, 'error'); assert.equal(message, 'Falha na reabertura');
  vm.runInNewContext("setToast('Outra informação');", sandbox);
  assert.equal(tone, 'info');
  const renderStart = child.indexOf('{toast && <div className={`toast');
  const renderEnd = child.indexOf('\n', renderStart);
  const jsx = child.slice(renderStart + 1, renderEnd).trim().slice(0, -1);
  const jsxSandbox = { toast: 'Falha na reabertura', toastTone: 'error', Icon: 'svg', setToast() {}, exports: {}, require: () => ({ jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }) };
  vm.runInNewContext(ts.transpileModule(`exports.result = ${jsx};`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText, jsxSandbox);
  assert.equal(jsxSandbox.exports.result.props.role, 'alert');
  assert.equal(jsxSandbox.exports.result.props.className, 'toast error');
  assert.equal(jsxSandbox.exports.result.props.children[0].props.name, 'warning');
});
