import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { handleCommercialOperationRequest } from '../../app/vendas/lib/server/commercial-operation-http.mjs';
import { createCommercialOrderWorkflow } from '../../app/vendas/lib/server/commercial-order-workflow.mjs';

const companyId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const customerId = '33333333-3333-4333-8333-333333333333';
const operationId = '44444444-4444-4444-8444-444444444444';

test('menu real oferece edição e faturamento para confirmados e cancelamento também para faturados', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  const start = source.indexOf('function CommercialRecordActions(');
  const end = source.indexOf('\nfunction NewServiceOrderView', start);
  const sandbox = { exports: {}, require: () => ({ jsx: (_component, props) => props }), RecordActionsDialog: () => null, documentLabel: () => 'NF-e' };
  const compiled = ts.transpileModule(`${source.slice(start, end)}\nexports.menu = CommercialRecordActions;`, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(compiled, sandbox);
  const names = status => {
    const props = sandbox.exports.menu({ record: { id: '2026/1', type: 'Pedido', fiscal: 'NF-e prevista', localRecord: { type: 'pedido', status, order: { fiscalDocument: 'nfe', reserveStock: true } } } });
    return Array.from(props.actions, action => action.label);
  };
  assert.ok(names('Confirmado').includes('Editar pedido'));
  assert.ok(names('Confirmado').includes('Faturar pedido'));
  assert.ok(names('Confirmado').includes('Cancelar pedido'));
  assert.ok(names('Em separação').includes('Editar pedido'));
  assert.ok(names('Faturado').includes('Cancelar pedido'));
  assert.ok(!names('Faturado').includes('Editar pedido'));
  assert.ok(!names('Cancelado').includes('Cancelar pedido'));
  assert.ok(names('Rascunho').includes('Continuar pedido'));
});

test('recarga do servidor trata pedido salvo como rascunho e preserva estados posteriores', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  const start = source.indexOf('const statusLabel =', source.indexOf('if (event.data?.type === OPERATION_SNAPSHOT_TYPE'));
  const end = source.indexOf('setCreated(records.slice(0, 200));', start) + 'setCreated(records.slice(0, 200));'.length;
  let records;
  vm.runInNewContext(ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    event: { data: { operations: ['salvo', 'rascunho', 'confirmado', 'em_separacao', 'faturado', 'cancelado', 'devolvido'].map((status, index) => ({
      id: `${operationId}-${index}`, type: 'pedido', status, stockStatus: ['sem_movimentacao', 'sem_movimentacao', 'reservado', 'em_separacao', 'baixado', 'liberado', 'devolvido'][index], year: 2026, number: index + 1, version: 4,
      customerId, customerSnapshot: { displayName: 'Sandra' }, total: 99, items: [{ productId: companyId, sku: 'P01', name: 'Produto', quantity: 1, unitPrice: 99, discountUnit: 0 }],
    })) } },
    setCreated: value => { records = value; },
  });
  assert.deepEqual(Array.from(records, record => record.status), ['Rascunho', 'Rascunho', 'Confirmado', 'Em separação', 'Faturado', 'Cancelado', 'Devolvido']);
  assert.deepEqual(Array.from(records, record => record.order.stockState), ['Sem movimentação', 'Sem movimentação', 'Reservado', 'Em separação', 'Baixado', 'Liberado', 'Devolvido']);
  assert.equal(records[0].id, '2026/1');
  assert.equal(records[0].persistence.status, 'salvo');
  assert.equal(records[0].persistence.version, 4);
  assert.equal(records[0].order.lines[0].sku, 'P01');
  assert.equal(records[0].total, 99);
});

test('rascunho oferece retomada e reabre o mesmo registro no editor', async () => {
  const source = await readFile('app/vendas/sistema/VendasServicosPrototype.tsx', 'utf8');
  assert.match(source, /label: 'Continuar pedido'/);
  assert.match(source, /initialRecord=\{editingOrder\}/);
  assert.match(source, /id: initialRecord\?\.id \|\| `PED-/);
  assert.match(source, /previous \? created\.map\(\(item\) => item\.id === record\.id \? record : item\)/);
  assert.match(source, /action: updating \? 'update'/);
});

test('endpoint comercial encaminha atualização com versão do rascunho', async () => {
  const calls = [];
  const runtime = {
    configured: true,
    accessResolver: { resolve: async () => ({ authenticated: true, boundary: { companyId, userId: actorId, moduleId: 'vendas', userActive: true, membershipActive: true, companyActive: true, moduleActive: true }, effectivePermissions: { 'sales.edit': true } }) },
    operationService: {
      create: async () => { throw new Error('não deve criar outro pedido'); },
      update: async input => { calls.push(input); return { ok: true, operation: { id: operationId, year: 2026, number: 1, version: 2, status: 'salvo' }, warnings: [] }; },
    },
  };
  const request = new Request(`http://localhost/api/modulos/vendas/commercial/operations?companyId=${companyId}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'update', operationId, expectedVersion: 1, operation: { type: 'pedido' } }),
  });
  const response = await handleCommercialOperationRequest({ request, runtime, companyId });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].operationId, operationId);
  assert.equal(calls[0].expectedVersion, 1);
});

test('confirmar rascunho editado atualiza o conteúdo antes de avançar a situação', async () => {
  let current = { id: operationId, customerId, type: 'pedido', channel: 'vendas', status: 'salvo', version: 1, stockStatus: 'sem_movimentacao', fiscalStatus: 'nao_aplicavel', year: 2026, number: 1 };
  const sequence = [];
  const workflow = createCommercialOrderWorkflow({
    customerRepository: { findByDocument: async () => null },
    customerService: { create: async () => ({ ok: false }) },
    operationService: {
      create: async () => ({ ok: false }),
      get: async () => ({ ok: true, operation: current }),
      update: async ({ expectedVersion, input }) => {
        sequence.push(`update:${expectedVersion}:${input.items[0].quantity}`);
        current = { ...current, version: 2, total: 198 };
        return { ok: true, operation: current };
      },
    },
    lifecycleService: {
      confirm: async ({ expectedVersion }) => { sequence.push(`confirm:${expectedVersion}`); current = { ...current, version: 3, status: 'confirmado' }; return { ok: true }; },
      startSeparation: async () => ({ ok: true }), cancel: async () => ({ ok: true }), returnInvoiced: async () => ({ ok: true }),
    },
    billingService: { invoice: async () => ({ ok: true }) },
  });
  const result = await workflow.advance({
    context: {}, target: 'confirmado', operationId, persistenceKey: 'pedido:retomada:1',
    order: { customerId, items: [{ catalogItemId: companyId, quantity: 2 }], payment: { method: 'pix', firstDueDate: '2026-11-05' } },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(sequence, ['update:1:2', 'confirm:2']);
  assert.equal(result.order.status, 'confirmado');
  assert.equal(result.order.version, 3);
});
