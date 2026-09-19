import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  criarReferenciaAssinatura,
  lerReferenciaAssinatura,
  referenciaConfereAssinatura,
} from '../../app/lib/cobranca-referencia.ts';

const empresaId = '2d5d9270-70cf-4c6a-9d98-74688d14e337';

test('referência da Asaas preserva perfil, plano e ciclo contratados', () => {
  const referencia = criarReferenciaAssinatura({
    empresaId,
    plano: 'business_premium',
    ciclo: 'anual',
  });

  assert.equal(referencia, `assinatura:${empresaId}:business_premium:anual`);
  assert.deepEqual(lerReferenciaAssinatura(referencia), {
    empresaId,
    plano: 'business_premium',
    ciclo: 'anual',
  });
});

test('referência rejeita plano, ciclo e perfil adulterados', () => {
  assert.equal(lerReferenciaAssinatura(`assinatura:${empresaId}:business_premium:semanal`), null);
  assert.equal(lerReferenciaAssinatura(`assinatura:${empresaId}:free:mensal`), null);
  assert.equal(lerReferenciaAssinatura('assinatura:perfil-invalido:business:mensal'), null);
  assert.throws(() => criarReferenciaAssinatura({ empresaId: 'invalido', plano: 'business', ciclo: 'mensal' }));
});

test('liberação confere a referência com o registro local', () => {
  const referencia = lerReferenciaAssinatura(`assinatura:${empresaId}:business_pro:mensal`);
  assert.ok(referencia);
  assert.equal(referenciaConfereAssinatura(referencia, {
    empresaId,
    plano: 'business_pro',
    ciclo: 'mensal',
  }), true);
  assert.equal(referenciaConfereAssinatura(referencia, {
    empresaId,
    plano: 'business',
    ciclo: 'mensal',
  }), false);
  assert.equal(referenciaConfereAssinatura(referencia, {
    empresaId,
    plano: 'business_pro',
    ciclo: 'anual',
  }), false);
});

test('checkout, upgrade, webhook e conciliação usam a referência vinculada', async () => {
  const [checkout, gerenciamento, webhook, conciliacao] = await Promise.all([
    readFile(new URL('../../app/api/cobranca/assinar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/gerenciar/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../app/api/cobranca/webhook/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../supabase/functions/conciliar-cobrancas/index.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(checkout, /const dadosCliente = \{[\s\S]*externalReference: empresaId,[\s\S]*criarAssinaturaAsaas\(\{[\s\S]*externalReference: criarReferenciaAssinatura/);
  assert.match(gerenciamento, /externalReference:\s*criarReferenciaAssinatura/);
  assert.match(webhook, /referenciaConfereAssinatura/);
  assert.match(conciliacao, /referencia\.plano === assinatura\.plano/);
  assert.match(conciliacao, /referencia\.plano === assinatura\.plano_agendado/);
});
