import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidEan, normalizeEan } from '../../app/modules/marketplaces/services/ean.ts';
import { parseBrlToCents, preparePublicationInput } from '../../app/modules/marketplaces/services/publication-intake.ts';
import { createMercadoLivreAuthorizationUrl, createPkceChallenge, createPkceVerifier } from '../../app/modules/marketplaces/services/mercadolivre-oauth.ts';
import { openMarketplaceSecret, sealMarketplaceSecret } from '../../app/modules/marketplaces/services/secret-vault.ts';

test('aceita o EAN de referência e recusa dígito verificador inválido', () => {
  assert.equal(normalizeEan('7899.8823.0694-1'), '7899882306941');
  assert.equal(isValidEan('7899882306941'), true);
  assert.equal(isValidEan('7899882306942'), false);
});

test('normaliza valor em reais para centavos sem usar ponto flutuante no contrato', () => {
  assert.equal(parseBrlToCents('160,00'), 16000);
  assert.equal(parseBrlToCents('1.234,56'), 123456);
  assert.equal(parseBrlToCents('0'), null);
});

test('solicita somente os dados que ainda faltam antes da publicação', () => {
  const missing = preparePublicationInput({ ean: '7899882306941', price: '160,00' });
  assert.equal(missing.status, 'needs_information');
  assert.deepEqual(missing.requirements.map((item) => item.field), ['connection']);

  const draft = preparePublicationInput({ ean: '7899882306941', price: '160,00', connectionId: 'connection-1' });
  assert.equal(draft.status, 'draft');
  assert.equal(draft.priceInCents, 16000);
});

test('OAuth do Mercado Livre usa state e PKCE; URL não recebe segredo da aplicação', () => {
  const verifier = createPkceVerifier();
  const url = createMercadoLivreAuthorizationUrl({ clientId: '123', redirectUri: 'https://app.example.com/api/oauth/callback', state: 'state-test', codeChallenge: createPkceChallenge(verifier) });
  assert.match(url, /code_challenge_method=S256/);
  assert.match(url, /state=state-test/);
  assert.doesNotMatch(url, /client_secret|password/i);
});

test('tokens do marketplace são criptografados antes de persistir', () => {
  const original = process.env.MARKETPLACE_SECRETS_KEY;
  process.env.MARKETPLACE_SECRETS_KEY = Buffer.alloc(32, 7).toString('base64url');
  try {
    const sealed = sealMarketplaceSecret('access-token-de-teste');
    assert.notEqual(sealed.ciphertext, 'access-token-de-teste');
    assert.equal(openMarketplaceSecret(sealed), 'access-token-de-teste');
  } finally {
    if (original === undefined) delete process.env.MARKETPLACE_SECRETS_KEY;
    else process.env.MARKETPLACE_SECRETS_KEY = original;
  }
});
