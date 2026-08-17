import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assinaturaBloqueiaNovoCheckout,
  calcularFimCarencia,
  calcularFimPeriodoPago,
  normalizarStatusTemporal,
} from '../../app/lib/cobranca-fluxo.ts';

const agora = new Date('2026-08-17T12:00:00-03:00');

test('trial e cortesia vencidos são apresentados como expirados', () => {
  assert.equal(normalizarStatusTemporal('trial', '2026-08-16T12:00:00-03:00', null, agora), 'expirada');
  assert.equal(normalizarStatusTemporal('trial', '2026-08-18T12:00:00-03:00', null, agora), 'trial');
  assert.equal(normalizarStatusTemporal('cortesia', null, '2026-08-16T12:00:00-03:00', agora), 'expirada');
  assert.equal(normalizarStatusTemporal('cortesia', null, null, agora), 'cortesia');
});

test('carência nunca encurta um trial ainda vigente', () => {
  assert.equal(calcularFimCarencia(agora, '2026-08-24T12:00:00-03:00'), '2026-08-24T15:00:00.000Z');
  assert.equal(calcularFimCarencia(agora, null), '2026-08-20T15:00:00.000Z');
});

test('cancelamento preserva somente período realmente pago', () => {
  const mensal = calcularFimPeriodoPago([
    { status: 'RECEIVED_IN_CASH', dueDate: '2026-08-10' },
  ], 'mensal', null, agora);
  const semPagamento = calcularFimPeriodoPago([
    { status: 'PENDING', dueDate: '2026-08-10' },
  ], 'mensal', null, agora);

  assert.equal(mensal, '2026-09-11T02:59:59.000Z');
  assert.equal(semPagamento, null);
});

test('checkout não substitui assinatura vigente nem cancelamento ainda válido', () => {
  assert.equal(assinaturaBloqueiaNovoCheckout('ativa', null, agora), true);
  assert.equal(assinaturaBloqueiaNovoCheckout('inadimplente', '2026-08-20T12:00:00-03:00', agora), true);
  assert.equal(assinaturaBloqueiaNovoCheckout('cortesia', null, agora), true);
  assert.equal(assinaturaBloqueiaNovoCheckout('cortesia', '2026-08-16T12:00:00-03:00', agora), false);
  assert.equal(assinaturaBloqueiaNovoCheckout('cancelada', '2026-08-20T12:00:00-03:00', agora), true);
  assert.equal(assinaturaBloqueiaNovoCheckout('cancelada', '2026-08-16T12:00:00-03:00', agora), false);
  assert.equal(assinaturaBloqueiaNovoCheckout('trial', null, agora), false);
  assert.equal(assinaturaBloqueiaNovoCheckout('expirada', null, agora), false);
});
