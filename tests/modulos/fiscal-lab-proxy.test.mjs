import assert from 'node:assert/strict';
import test from 'node:test';

import { identificadorFiscalValido, origemFiscalLab } from '../../app/lib/fiscalLabProxy.ts';

test('proxy fiscal local aceita somente identificadores UUID', () => {
  assert.equal(identificadorFiscalValido('11111111-1111-4111-8111-111111111111'), true);
  assert.equal(identificadorFiscalValido('../../segredo'), false);
  assert.equal(identificadorFiscalValido('FIS-123'), false);
});

test('proxy fiscal local restringe a origem ao laboratório da porta 3015', () => {
  assert.equal(origemFiscalLab({}), 'http://127.0.0.1:3015');
  assert.equal(origemFiscalLab({ FISCAL_LAB_ORIGIN: 'http://localhost:3015' }), 'http://localhost:3015');
  assert.equal(origemFiscalLab({ FISCAL_LAB_ORIGIN: 'https://example.com' }), null);
  assert.equal(origemFiscalLab({ FISCAL_LAB_ORIGIN: 'http://localhost:9999' }), null);
});
