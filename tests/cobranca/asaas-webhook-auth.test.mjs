import assert from 'node:assert/strict';
import test from 'node:test';

import { tokenWebhookAsaasValido } from '../../app/lib/asaas-webhook-auth.ts';

test('webhook Asaas aceita somente o token principal configurado', () => {
  assert.equal(tokenWebhookAsaasValido('token-principal', ['token-principal']), true);
  assert.equal(tokenWebhookAsaasValido('token-invalido', ['token-principal']), false);
  assert.equal(tokenWebhookAsaasValido('', ['token-principal']), false);
  assert.equal(tokenWebhookAsaasValido('token-principal', []), false);
});

test('webhook Asaas mantém compatibilidade estritamente durante a rotação', () => {
  assert.equal(tokenWebhookAsaasValido('token-atual', ['token-atual', 'token-novo']), true);
  assert.equal(tokenWebhookAsaasValido('token-novo', ['token-atual', 'token-novo']), true);
  assert.equal(tokenWebhookAsaasValido('token-invalido', ['token-atual', 'token-novo']), false);
});
