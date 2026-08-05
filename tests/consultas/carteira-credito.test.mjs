import assert from 'node:assert/strict';
import test from 'node:test';
import { CONSULTAS_CREDITO, VALORES_RECARGA_CENTAVOS } from '../../app/lib/carteira.ts';

test('mantém preços comerciais definidos no servidor', () => {
  assert.equal(CONSULTAS_CREDITO.credito_essencial.precoCentavos, 1199);
  assert.equal(CONSULTAS_CREDITO.credito_avancada.precoCentavos, 2099);
  assert.equal(CONSULTAS_CREDITO.credito_completa.precoCentavos, 3199);
});

test('aceita somente valores controlados de recarga', () => {
  assert.deepEqual([...VALORES_RECARGA_CENTAVOS], [3000, 5000, 10000, 20000, 50000]);
  assert.equal(VALORES_RECARGA_CENTAVOS.includes(2500), false);
});
