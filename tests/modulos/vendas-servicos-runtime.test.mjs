import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CLIENT_STORAGE_KEY,
  companyStorageKey,
  displayIsoDate,
  formatDuration,
  isIntegratedManagementRuntime,
  paymentMethodLabel,
  ptBrDateToIso,
} from '../../app/vendas/sistema/vendas-servicos-runtime.ts';

test('formatadores extraídos preservam o contrato da tela de Vendas e Serviços', () => {
  assert.equal(ptBrDateToIso('10/09/2026'), '2026-09-10');
  assert.equal(ptBrDateToIso('sem-data'), 'sem-data');
  assert.equal(displayIsoDate('2026-09-10'), '10/09/2026');
  assert.equal(formatDuration(0), '0 min');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(95), '1h35');
  assert.equal(paymentMethodLabel('pix'), 'PIX');
  assert.equal(paymentMethodLabel('dinheiro'), 'dinheiro');
});

test('armazenamento continua isolado por empresa e detecta somente a ponte integrada', () => {
  const originalWindow = globalThis.window;
  const parent = {};
  globalThis.window = {
    location: { search: '?companyId=empresa-123&bridge=gestao' },
    parent,
  };

  try {
    assert.equal(companyStorageKey(CLIENT_STORAGE_KEY), `${CLIENT_STORAGE_KEY}:empresa:empresa-123`);
    assert.equal(isIntegratedManagementRuntime(), true);

    globalThis.window.location.search = '';
    globalThis.window.parent = globalThis.window;
    assert.equal(companyStorageKey(CLIENT_STORAGE_KEY), `${CLIENT_STORAGE_KEY}:demonstracao`);
    assert.equal(isIntegratedManagementRuntime(), false);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('tela principal consome o módulo sem manter implementações duplicadas', async () => {
  const source = await readFile(new URL('../../app/vendas/sistema/VendasServicosPrototype.tsx', import.meta.url), 'utf8');
  assert.match(source, /from '\.\/vendas-servicos-runtime'/);
  assert.doesNotMatch(source, /function ptBrDateToIso\(/);
  assert.doesNotMatch(source, /function companyStorageKey\(/);
});
