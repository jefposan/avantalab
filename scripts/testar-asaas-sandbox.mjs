import assert from 'node:assert/strict';

const apiKey = String(process.env.ASAAS_API_KEY || '')
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\s/g, '');
const configuredBase = String(process.env.ASAAS_BASE_URL || '')
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\/$/, '');
const baseUrl = configuredBase || 'https://api-sandbox.asaas.com/v3';

if (!apiKey || apiKey.startsWith('$aact_prod_') || baseUrl !== 'https://api-sandbox.asaas.com/v3') {
  throw new Error('Teste recusado: use exclusivamente uma chave e a URL do Sandbox Asaas.');
}

const created = { customer: null, subscription: null };
const checks = [];

async function request(path, init = {}, accepted = [200]) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'AvantaLab-Testes-Automatizados',
      access_token: apiKey,
      ...(init.headers || {}),
    },
  });
  const raw = await response.text();
  const body = raw ? JSON.parse(raw) : null;
  if (!accepted.includes(response.status)) {
    const message = body?.errors?.[0]?.description || `HTTP ${response.status}`;
    throw new Error(`${path}: ${message}`);
  }
  return { status: response.status, body };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

try {
  const suffix = Date.now();
  const customer = await request('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: `AvantaLab Teste Automatizado ${suffix}`,
      cpfCnpj: '12345678909',
      email: `qa+asaas-${suffix}@avantalab.com.br`,
      mobilePhone: '11987654321',
      externalReference: `teste-automatizado-${suffix}`,
    }),
  }, [200]);
  created.customer = customer.body.id;
  assert.ok(created.customer);
  checks.push('cliente_criado');

  const subscription = await request('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: created.customer,
      billingType: 'PIX',
      value: 34.9,
      nextDueDate: today(),
      cycle: 'MONTHLY',
      description: 'AvantaLab — teste Business Básico mensal',
      externalReference: 'assinatura:11111111-1111-4111-8111-111111111111:business:mensal',
    }),
  }, [200]);
  created.subscription = subscription.body.id;
  assert.ok(created.subscription);
  checks.push('assinatura_basico_criada');

  const payments = await request(`/subscriptions/${created.subscription}/payments`, { method: 'GET' }, [200]);
  const payment = payments.body?.data?.[0];
  assert.ok(payment?.id);
  assert.equal(Number(payment.value), 34.9);
  checks.push('fatura_inicial_gerada');

  await request(`/sandbox/payment/${payment.id}/confirm`, { method: 'POST' }, [200]);
  const confirmed = await request(`/payments/${payment.id}`, { method: 'GET' }, [200]);
  assert.ok(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(confirmed.body.status));
  checks.push('pagamento_confirmado');

  const upgraded = await request(`/subscriptions/${created.subscription}`, {
    method: 'PUT',
    body: JSON.stringify({
      value: 99.9,
      cycle: 'MONTHLY',
      description: 'AvantaLab — teste Business Premium mensal',
      externalReference: 'assinatura:11111111-1111-4111-8111-111111111111:business_premium:mensal',
      updatePendingPayments: true,
    }),
  }, [200]);
  assert.equal(Number(upgraded.body.value), 99.9);
  assert.equal(upgraded.body.cycle, 'MONTHLY');
  checks.push('upgrade_premium_aplicado');

  const scheduledTarget = await request(`/subscriptions/${created.subscription}`, {
    method: 'PUT',
    body: JSON.stringify({
      value: 249.9,
      cycle: 'YEARLY',
      description: 'AvantaLab — teste Business Básico anual agendado localmente',
      externalReference: 'assinatura:11111111-1111-4111-8111-111111111111:business:anual',
      updatePendingPayments: true,
    }),
  }, [200]);
  assert.equal(Number(scheduledTarget.body.value), 249.9);
  assert.equal(scheduledTarget.body.cycle, 'YEARLY');
  checks.push('destino_downgrade_configurado');

  const restored = await request(`/subscriptions/${created.subscription}`, {
    method: 'PUT',
    body: JSON.stringify({
      value: 99.9,
      cycle: 'MONTHLY',
      description: 'AvantaLab — teste Business Premium mensal restaurado',
      externalReference: 'assinatura:11111111-1111-4111-8111-111111111111:business_premium:mensal',
      updatePendingPayments: true,
    }),
  }, [200]);
  assert.equal(Number(restored.body.value), 99.9);
  assert.equal(restored.body.cycle, 'MONTHLY');
  checks.push('alteracao_agendada_cancelada_e_restaurada');

  await request(`/subscriptions/${created.subscription}`, { method: 'DELETE' }, [200]);
  created.subscription = null;
  checks.push('assinatura_cancelada');

  await request(`/customers/${created.customer}`, { method: 'DELETE' }, [200]);
  created.customer = null;
  checks.push('cliente_teste_removido');

  process.stdout.write(`${JSON.stringify({ ok: true, ambiente: 'sandbox', checks }, null, 2)}\n`);
} finally {
  if (created.subscription) {
    await request(`/subscriptions/${created.subscription}`, { method: 'DELETE' }, [200, 404]).catch(() => undefined);
  }
  if (created.customer) {
    await request(`/customers/${created.customer}`, { method: 'DELETE' }, [200, 404]).catch(() => undefined);
  }
}
