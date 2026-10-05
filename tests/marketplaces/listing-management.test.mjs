import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionBody, normalizeListing, parseItemNotification } from '../../app/modules/marketplaces/services/listing-model.ts';
import { refreshMercadoLivreToken } from '../../app/modules/marketplaces/services/mercadolivre-oauth.ts';

const item = { id: 'MLB5324529993', seller_id: 123, title: 'Gin Bóra', status: 'active', price: 160, available_quantity: 30, sold_quantity: 5,
  shipping: { free_shipping: true, mode: 'me2' }, attributes: [{ id: 'GTIN', name: 'EAN', value_name: '7899882306941' }],
  permalink: 'https://produto.mercadolivre.com.br/MLB-5324529993', seller_address: { secret: 'Não retornar' } };

test('snapshot preserva dados reais e não inventa custos nem expõe endereço', () => {
  const snapshot = normalizeListing(item, '123');
  assert.equal(snapshot.stock, 30); assert.equal(snapshot.price, 160); assert.equal(snapshot.ean, '7899882306941');
  assert.equal(snapshot.feeEstimate, null); assert.equal(snapshot.freightEstimate, null);
  assert.equal('seller_address' in snapshot, false);
  assert.equal(normalizeListing({ ...item, available_quantity: undefined, permalink: 'javascript:alert(1)' }, '123').stock, null);
  assert.equal(normalizeListing({ ...item, permalink: 'https://evil.example.com/' }, '123').permalink, null);
  assert.equal(normalizeListing(item, '123', { fee: 20, freight: 0 }).freightEstimate, 0);
});
test('conta divergente nunca é aceita no snapshot', () => {
  assert.throws(() => normalizeListing(item, '456'), /não pertence/);
  assert.throws(() => normalizeListing({ ...item, id: '../../etc/passwd' }, '123'), /não pertence/);
});
test('pausar e reativar são reversíveis; excluir exige encerrado e não reativa encerrado', () => {
  assert.deepEqual(actionBody('pause', 'active'), { status: 'paused' });
  assert.deepEqual(actionBody('resume', 'paused'), { status: 'active' });
  assert.deepEqual(actionBody('close', 'paused'), { status: 'closed' });
  assert.deepEqual(actionBody('delete', 'closed'), { deleted: 'true' });
  for (const [action, status] of [['delete', 'active'], ['resume', 'closed'], ['pause', 'under_review'], ['close', 'closed']]) assert.throws(() => actionBody(action, status));
  assert.throws(() => actionBody('delete', 'closed', ['deleted']), /já foi excluído/);
});
test('webhook só aceita application_id, seller e resource canônicos do tópico items', () => {
  const notification = { _id: 'event-1', application_id: 123, user_id: 456, topic: 'items', resource: '/items/MLB5324529993' };
  assert.deepEqual(parseItemNotification(notification, '123'), { id: 'event-1', seller: '456', itemId: 'MLB5324529993' });
  assert.equal(parseItemNotification(notification, '789'), null);
  assert.equal(parseItemNotification({ ...notification, resource: 'https://127.0.0.1/private' }, '123'), null);
  assert.equal(parseItemNotification({ ...notification, resource: '/items/MLB5324529993?access_token=secret' }, '123'), null);
  assert.equal(parseItemNotification({ ...notification, topic: 'orders' }, '123'), null);
});
test('refresh usa grant oficial e retorna o par novo; erro não revela resposta arbitrária', async () => {
  const savedFetch = globalThis.fetch;
  const savedEnv = Object.fromEntries(['MERCADOLIVRE_CLIENT_ID', 'MERCADOLIVRE_CLIENT_SECRET', 'MERCADOLIVRE_OAUTH_REDIRECT_URI'].map((key) => [key, process.env[key]]));
  Object.assign(process.env, { MERCADOLIVRE_CLIENT_ID: '123', MERCADOLIVRE_CLIENT_SECRET: 'secret-test', MERCADOLIVRE_OAUTH_REDIRECT_URI: 'https://example.test/callback' });
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://api.mercadolibre.com/oauth/token');
      assert.equal(options.body.get('grant_type'), 'refresh_token'); assert.equal(options.body.get('refresh_token'), 'old-refresh');
      return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', user_id: 123, expires_in: 21600, scope: 'read write' });
    };
    const result = await refreshMercadoLivreToken('old-refresh');
    assert.equal(result.refreshToken, 'new-refresh'); assert.equal(result.sellerReference, '123'); assert.ok(result.expiresAt);
    globalThis.fetch = async () => Response.json({ error: 'unknown', message: 'secret-in-provider-message' }, { status: 400 });
    await assert.rejects(refreshMercadoLivreToken('old-refresh'), (error) => !error.message.includes('secret-in-provider-message'));
  } finally { globalThis.fetch = savedFetch; for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});
