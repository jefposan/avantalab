import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

const loadModule = createRequire(import.meta.url);
const originalFetch = global.fetch;
const originalKey = process.env.ASAAS_API_KEY;
const originalBase = process.env.ASAAS_BASE_URL;
let compiledDir;
let adapter;
let calls;

before(() => {
  compiledDir = mkdtempSync(path.join(tmpdir(), 'avanta-asaas-adapter-'));
  execFileSync(path.join(process.cwd(), 'node_modules/.bin/tsc'), [
    'app/lib/asaas.ts',
    '--outDir', compiledDir,
    '--module', 'commonjs',
    '--target', 'ES2022',
    '--moduleResolution', 'node',
    '--esModuleInterop',
    '--skipLibCheck',
    '--strict',
  ], { cwd: process.cwd(), stdio: 'pipe' });
  process.env.ASAAS_API_KEY = '$aact_hmlg_teste_automatizado';
  delete process.env.ASAAS_BASE_URL;
  calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(String(init.body)) : null });
    const pathname = new URL(String(url)).pathname;
    if (pathname.endsWith('/payments')) {
      return new Response(JSON.stringify({ data: [{ id: 'pay_1', status: 'PENDING', value: 34.9 }] }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: pathname.includes('/customers') ? 'cus_1' : 'sub_1', value: 99.9, cycle: 'MONTHLY' }), { status: 200 });
  };
  adapter = loadModule(path.join(compiledDir, 'asaas.js'));
});

after(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.ASAAS_API_KEY;
  else process.env.ASAAS_API_KEY = originalKey;
  if (originalBase === undefined) delete process.env.ASAAS_BASE_URL;
  else process.env.ASAAS_BASE_URL = originalBase;
  if (compiledDir) rmSync(compiledDir, { recursive: true, force: true });
});

test('adaptador usa somente o Sandbox com chave de homologação', async () => {
  const response = await adapter.criarClienteAsaas({ name: 'Teste', cpfCnpj: '12345678909' });
  assert.equal(response.ok, true);
  assert.match(calls[0].url, /^https:\/\/api-sandbox\.asaas\.com\/v3\/customers$/);
  assert.equal(calls[0].init.headers.access_token, '$aact_hmlg_teste_automatizado');
});

test('contratação envia ciclo, preço e referência comercial', async () => {
  await adapter.criarAssinaturaAsaas({
    customer: 'cus_1',
    billingType: 'PIX',
    value: 34.9,
    nextDueDate: '2026-09-19',
    cycle: 'MONTHLY',
    externalReference: 'assinatura:11111111-1111-4111-8111-111111111111:business:mensal',
  });
  const call = calls.at(-1);
  assert.equal(call.body.value, 34.9);
  assert.equal(call.body.cycle, 'MONTHLY');
  assert.match(call.body.externalReference, /:business:mensal$/);
});

test('upgrade/downgrade atualiza pendências e cancelamento remove recorrência', async () => {
  await adapter.atualizarAssinaturaAsaas('sub_1', {
    value: 99.9,
    cycle: 'MONTHLY',
    updatePendingPayments: true,
    externalReference: 'assinatura:11111111-1111-4111-8111-111111111111:business_premium:mensal',
  });
  const update = calls.at(-1);
  assert.equal(update.init.method, 'PUT');
  assert.equal(update.body.updatePendingPayments, true);
  assert.equal(update.body.value, 99.9);

  const payments = await adapter.listarCobrancasAssinaturaAsaas('sub_1');
  assert.equal(payments.data.data[0].id, 'pay_1');

  await adapter.removerAssinaturaAsaas('sub_1');
  const remove = calls.at(-1);
  assert.equal(remove.init.method, 'DELETE');
  assert.match(remove.url, /\/subscriptions\/sub_1$/);
});
