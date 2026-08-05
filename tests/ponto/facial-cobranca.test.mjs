import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calcularProporcionalFacialCentavos,
  compararSelecaoFacial,
  cobrancaFacialPermiteUso,
  PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
} from '../../app/lib/ponto-facial-cobranca.ts';

test('identifica redução facial sem encaminhar a seleção ao pagamento', () => {
  assert.deepEqual(
    compararSelecaoFacial(['funcionario-a', 'funcionario-b'], ['funcionario-a']),
    {
      adicionados: [],
      removidos: ['funcionario-b'],
      somenteReducao: true,
    },
  );
});

test('não classifica substituição de funcionário como simples redução', () => {
  assert.deepEqual(
    compararSelecaoFacial(['funcionario-a'], ['funcionario-b']),
    {
      adicionados: ['funcionario-b'],
      removidos: ['funcionario-a'],
      somenteReducao: false,
    },
  );
});

test('cobra a mensalidade cheia na contratação sem ciclo anterior', () => {
  assert.equal(
    calcularProporcionalFacialCentavos(2, null, new Date('2026-08-05T12:00:00Z')),
    2 * PONTO_FACIAL_VALOR_UNITARIO_CENTAVOS,
  );
});

test('calcula a inclusão proporcional pelos dias restantes do ciclo', () => {
  assert.equal(
    calcularProporcionalFacialCentavos(1, '2026-08-20', new Date('2026-08-05T12:00:00Z')),
    721,
  );
});

test('não cobra proporcional ao reduzir a quantidade', () => {
  assert.equal(
    calcularProporcionalFacialCentavos(0, '2026-08-20', new Date('2026-08-05T12:00:00Z')),
    0,
  );
});

test('mantém o facial durante carência e período já pago', () => {
  const agora = new Date('2026-08-05T12:00:00Z');
  assert.equal(cobrancaFacialPermiteUso({ status: 'inadimplente', valido_ate: '2026-08-06T12:00:00Z' }, agora), true);
  assert.equal(cobrancaFacialPermiteUso({ status: 'cancelamento_programado', valido_ate: '2026-08-20T12:00:00Z' }, agora), true);
  assert.equal(cobrancaFacialPermiteUso({ status: 'suspensa', valido_ate: null }, agora), false);
});

test('preserva configurações anteriores quando ainda não existe registro financeiro', () => {
  assert.equal(cobrancaFacialPermiteUso(null), true);
});
