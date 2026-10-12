import assert from 'node:assert/strict';
import test from 'node:test';
import { labelActionText, labelUnavailableText, saleStatusText, shipmentStatusText, salesInPeriod, salesSummary, saleGroup, validSalePeriod, orderedSaleGroups, SALE_GROUPS } from '../../app/modules/marketplaces/sales-status.ts';

const sale = (overrides = {}) => ({ status: 'paid', shipmentStatus: 'ready_to_ship', shipmentSubstatus: 'ready_to_print', labelStatus: 'ready', ...overrides });

test('ordena situações da maior contagem para a menor e deixa zeros ao final', () => {
  const counts = { confirmed: 3, awaiting_dispatch: 2, cancelled: 1 };
  const ordered = orderedSaleGroups(counts);
  assert.deepEqual(ordered.slice(0, 3).map(group => group.value), ['confirmed', 'awaiting_dispatch', 'cancelled']);
  assert.equal(ordered.length, SALE_GROUPS.length);
  assert.ok(ordered.slice(3).every(group => !counts[group.value]));
});

test('empates preservam ordem original sem mutar catálogo ou contagens', () => {
  const original = structuredClone(SALE_GROUPS);
  const counts = Object.freeze({ cancelled: 2, confirmed: 2, awaiting_dispatch: 2 });
  assert.deepEqual(orderedSaleGroups(counts).slice(0, 3).map(group => group.value), ['confirmed', 'awaiting_dispatch', 'cancelled']);
  assert.deepEqual(orderedSaleGroups({}), SALE_GROUPS);
  assert.deepEqual(SALE_GROUPS, original);
  assert.deepEqual(counts, { cancelled: 2, confirmed: 2, awaiting_dispatch: 2 });
});

test('nova contagem reordena os mesmos identificadores sem alterar classificação', () => {
  const previous = orderedSaleGroups({ delivered: 6, cancelled: 3, in_transit: 1 });
  const updated = orderedSaleGroups({ confirmed: 8, delivered: 6, cancelled: 3, in_transit: 1 });
  assert.equal(previous[0].value, 'delivered');
  assert.equal(updated[0].value, 'confirmed');
  assert.deepEqual(updated.map(group => group.value).sort(), previous.map(group => group.value).sort());
});

test('traduz os estados operacionais conhecidos sem expor códigos do Mercado Livre', () => {
  assert.equal(saleStatusText(sale()), 'Etiqueta pronta para impressão');
  assert.equal(shipmentStatusText('shipped', 'out_for_delivery'), 'Saiu para entrega');
  assert.equal(shipmentStatusText('delivered', null), 'Entregue');
  assert.equal(saleStatusText(sale({ shipmentStatus: null, shipmentSubstatus: null, status: 'payment_in_process', labelStatus: 'unavailable' })), 'Pagamento em análise');
  assert.equal(saleStatusText(sale({ shipmentStatus: 'not_delivered', shipmentSubstatus: 'returned', labelStatus: 'unavailable' })), 'Não entregue — em devolução');
});

test('etiqueta impressa continua disponível para reimpressão', () => {
  const printed = sale({ shipmentSubstatus: 'printed' });
  assert.equal(labelActionText(printed), 'Reimprimir etiqueta');
  assert.equal(saleStatusText(printed), 'Etiqueta impressa — pronta para despacho');
  assert.equal(labelUnavailableText(sale({ labelStatus: 'unavailable', shipmentSubstatus: 'invoice_pending' })), 'A etiqueta será liberada depois da nota fiscal ou DC-e.');
});

test('não apresenta espera de etiqueta depois do despacho ou encerramento', () => {
  for (const shipmentStatus of ['shipped', 'delivered', 'not_delivered', 'cancelled']) {
    assert.equal(labelUnavailableText(sale({ shipmentStatus })), null);
  }
  assert.equal(saleStatusText(sale({ shipmentStatus: 'delivered', labelStatus: 'fulfilled', shipmentSubstatus: 'printed' })), 'Entregue');
  assert.equal(labelUnavailableText(sale({ status: 'cancelled' })), null);
});

const row = (connectionId, orderId, status, shipmentStatus, soldAt) => ({ ...sale({ status, shipmentStatus }), connectionId, orderId, soldAt, createdAt: soldAt });

test('cada pedido pertence a um grupo e os grupos e contas somam o total filtrado', () => {
  const rows = [
    row('A', '1', 'paid', 'delivered', '2026-10-05T15:00:00Z'),
    row('A', '2', 'cancelled', 'ready_to_ship', '2026-10-05T15:00:00Z'),
    row('B', '3', 'paid', 'shipped', '2026-10-05T15:00:00Z'),
    row('B', '4', 'paid', 'handling', '2026-10-05T15:00:00Z'),
    row('B', '5', 'payment_in_process', null, '2026-10-05T15:00:00Z'),
    row('B', '6', 'unknown', null, '2026-10-05T15:00:00Z'),
  ];
  const summary = salesSummary(rows, '');
  assert.equal(Object.values(summary.byGroup).reduce((a, b) => a + b, 0), 6);
  assert.deepEqual(summary.byConnection, { A: 2, B: 4 });
  assert.equal(summary.byGroup.delivered, 1);
  assert.equal(summary.byGroup.cancelled, 1);
  const delivered = salesSummary(rows, 'delivered');
  assert.equal(delivered.total, 6);
  assert.equal(delivered.filteredTotal, 1);
  assert.deepEqual(delivered.byConnection, { A: 1 });
  assert.equal(saleGroup(rows[1]), 'cancelled');
});

test('período inclui início e fim no horário brasileiro e deduplica por conta/pedido', () => {
  const rows = [
    row('A', '1', 'paid', 'delivered', '2026-10-01T02:59:00Z'), // Setembro no Brasil.
    row('A', '2', 'paid', 'delivered', '2026-10-01T03:00:00Z'),
    row('B', '2', 'paid', 'shipped', '2026-11-01T02:59:00Z'),
    row('A', '3', 'paid', 'shipped', '2026-11-01T03:00:00Z'),
  ];
  const filtered = salesInPeriod([...rows, rows[1]], { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual(filtered.map((item) => item.connectionId + ':' + item.orderId), ['A:2', 'B:2']);
  assert.equal(salesInPeriod([...rows, rows[1]], { start: '', end: '' }).length, 4);
  assert.equal(validSalePeriod({ start: '2026-02-30', end: '2026-03-02' }), false);
  assert.equal(validSalePeriod({ start: '2026-10-31', end: '2026-10-01' }), false);
  assert.equal(validSalePeriod({ start: '2026-10-01', end: '' }), false);
});
