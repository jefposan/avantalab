import assert from 'node:assert/strict';
import test from 'node:test';
import { labelActionText, labelUnavailableText, saleStatusText, shipmentStatusText } from '../../app/modules/marketplaces/sales-status.ts';

const sale = (overrides = {}) => ({ status: 'paid', shipmentStatus: 'ready_to_ship', shipmentSubstatus: 'ready_to_print', labelStatus: 'ready', ...overrides });

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
