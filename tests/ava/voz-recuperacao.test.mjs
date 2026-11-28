import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../../app/api/vendas/solicitacao-voz/_handlers/executar.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace(/^import .*;\r?$/gm, '').replace(/^export /gm, ''), {}).outputText;
const action = {
  intent: 'register_payment', operationId: '11111111-1111-4111-8111-111111111111',
  accountId: '22222222-2222-4222-8222-222222222222',
  customerId: '33333333-3333-4333-8333-333333333333',
  customerName: 'Cliente fictício', items: [], amount: 52, discountAmount: 0, paymentMethod: 'Pix',
};
function harness(row, { error = null, canOperate = true } = {}) {
  const calls = [];
  const db = { from(table) {
    calls.push(['from', table]);
    const chain = {
      select() { return chain; },
      eq(key, value) { calls.push([key, value]); return chain; },
      async maybeSingle() { return { data: row, error }; },
      insert() { throw new Error('A recuperação não pode escrever'); },
      upsert() { throw new Error('A recuperação não pode escrever'); },
    };
    return chain;
  } };
  const ctx = vm.createContext({
    NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) },
    getVoiceSalesContext: async () => ({ db, userId: 'operador' }),
    isVoiceCommandEnabled: async () => true,
    canOperateVoiceSales: () => canOperate,
    logVoiceLab() {},
  });
  vm.runInContext(compiled, ctx);
  const req = { json: async () => ({ action, accountId: action.accountId }) };
  return { ctx, req, calls };
}
const existing = { id: action.operationId, cliente_id: action.customerId, valor: 52, desconto: 0, tipo: 'pagamento', forma_pagamento: 'Pix' };

test('a conferência apenas lê e devolve a evidência da operação original', async () => {
  const { ctx, req, calls } = harness(existing);
  const result = await ctx.conferirOperacaoVoz(req);
  assert.equal(result.body.evidence.recordId, action.operationId);
  assert.equal(result.body.evidence.amount, 52);
  assert.deepEqual(calls, [['from','vendas_mobile_pagamentos'],['conta_id',action.accountId],['user_id','operador'],['id',action.operationId]]);
});

test('quando ainda não localizou, a conferência não tenta gravar; falha de leitura não vira ausência', async () => {
  const missing = harness(null);
  assert.equal((await missing.ctx.conferirOperacaoVoz(missing.req)).body.status, 'not_found');
  const failed = harness(null, { error: { message: 'offline' } });
  assert.equal((await failed.ctx.conferirOperacaoVoz(failed.req)).status, 500);
});

test('reenvio de uma operação confirmada recupera o registro sem recalcular ou gravar novamente', async () => {
  const { ctx, req, calls } = harness(existing);
  assert.equal((await ctx.POST(req)).body.recordId, action.operationId);
  assert.equal(calls.filter(([kind]) => kind === 'from').length, 1);
});

test('divergência bloqueia a operação e usuário sem permissão não pode consultar a confirmação', async () => {
  const conflict = harness({ ...existing, valor: 99 });
  assert.equal((await conflict.ctx.POST(conflict.req)).status, 409);
  const denied = harness(existing, { canOperate: false });
  assert.equal((await denied.ctx.conferirOperacaoVoz(denied.req)).status, 403);
  assert.equal(denied.calls.length, 0);
});
