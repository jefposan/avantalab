import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { handleCommercialFiscalEmissionPrepareRequest } from '../../app/vendas/lib/server/commercial-fiscal-emission-http.mjs';
import { handleCommercialNfePreparationRequest } from '../../app/vendas/lib/server/commercial-nfe-preparation-http.mjs';

import { handleCommercialNfeNumberReservationRequest } from '../../app/vendas/lib/server/commercial-nfe-number-reservation-http.mjs';
import { handleCommercialNfeAutomaticIssuanceRequest } from '../../app/vendas/lib/server/commercial-nfe-automatic-issuance-http.mjs';
import { handleCommercialNfeCancellationRequest } from '../../app/vendas/lib/server/commercial-nfe-cancellation-http.mjs';

const source = readFileSync('app/vendas/VendasIntegrado.tsx', 'utf8');
const companyId = 'ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
const draftId = '10000000-0000-4000-8000-000000000001';
for (const [type, next, endpoint, handler, service, method] of [
  ['FISCAL_PREPARE_REQUEST_TYPE', 'FISCAL_VALIDATE_REQUEST_TYPE', 'prepare', handleCommercialFiscalEmissionPrepareRequest, 'emissionBridge', 'createNfeDraft'],
  ['FISCAL_VALIDATE_REQUEST_TYPE', 'FISCAL_NUMBER_REQUEST_TYPE', 'validate', handleCommercialNfePreparationRequest, 'nfePreparationService', 'prepare'],
  ['FISCAL_NUMBER_REQUEST_TYPE', 'FISCAL_DELETE_REQUEST_TYPE', 'number', handleCommercialNfeNumberReservationRequest, 'nfeNumberReservationService', 'reserve'],
  ['FISCAL_CANCELLATION_REQUEST_TYPE', 'FISCAL_ISSUE_REQUEST_TYPE', 'cancel', handleCommercialNfeCancellationRequest, 'nfeCancellationService', 'cancel'],
  ['FISCAL_ISSUE_REQUEST_TYPE', null, 'continue', handleCommercialNfeAutomaticIssuanceRequest, 'nfeAutomaticIssuanceService', 'continue'],
]) {
  test(`${endpoint}: ponte envia JSON aceito pelo handler real, com a chave da solicitação`, async () => {
    const start = source.indexOf(`          if (event.data.type === ${type}) {`);
    const end = source.indexOf(next ? `          if (event.data.type === ${next}) {` : '          const artifactId', start);
    const code = ts.transpileModule(`async function run() { ${source.slice(start, end)} } return run();`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requestId = `${endpoint}:10000000-0000-4000-8000-000000000002`;
    const calls = [];
    const messages = [];
    const runtime = {
      configured: true,
      accessResolver: { resolve: async () => ({ authenticated: true, boundary: { companyId } }) },
      [service]: { [method]: async input => { calls.push(input); return { ok: true, result: { emissionId: draftId, environment: "producao", state: endpoint === "cancel" ? "canceled" : "authorized", version: 2, series: "2", number: 1, signed: true, persisted: true, submitted: true, transmitted: true, canceled: true, eventStored: true, originalAuthorizationPreserved: true, externalContentReturned: false, sensitiveMaterialReturned: false } }; } },
    };
    const fakeFetch = async (url, options) => handler({
      request: new Request(new URL(url, 'https://avantalab.com.br'), options),
      runtime, companyId, draftId, emissionId: draftId,
    });
    const run = new Function('event', type, 'UUID_PATTERN', 'empresaId', 'token', 'requestId', 'fetch', 'destination', 'responseType', 'origemPrototipo', 'fail', 'carregarDocumentosFiscais', 'deliver', code);
    await run({ data: { type, draftId, emissionId: draftId, expectedVersion: 2, justification: 'Cancelamento solicitado pelo cliente' } }, type, /^[0-9a-f-]{36}$/, companyId, 'synthetic-session', requestId,
      fakeFetch, { postMessage: message => messages.push(message) }, 'response', 'https://avantalab.com.br',
      message => assert.fail(message), async () => {}, message => messages.push(message));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].draftId ?? calls[0].emissionId, draftId);
    assert.equal(calls[0].idempotencyKey, requestId);
    assert.equal(messages[0].ok, true);
    if (endpoint === "continue") assert.equal(messages[0].emission.environment, "producao");
  });
}

test('respostas fiscais preservam produção e homologação e recusam ambientes desconhecidos', async () => {
  const bridge = await import('../../app/vendas/lib/fiscal-status-bridge.mjs');
  const base = {
    emissionId: draftId, draftId, orderId: '10000000-0000-4000-8000-000000000003',
    documentType: 'nfe', model: '55', state: 'draft', version: 4, series: '2', number: 1,
    numberReserved: false, certificateInspected: false, signed: false, transmitted: false,
    schemaValid: true, candidateSeries: '2', candidateNumber: 1,
  };
  const cases = [
    ['parseFiscalPrepareResponse', 'FISCAL_PREPARE_RESPONSE_TYPE', {}],
    ['parseFiscalValidateResponse', 'FISCAL_VALIDATE_RESPONSE_TYPE', { state: 'prepared' }],
    ['parseFiscalNumberResponse', 'FISCAL_NUMBER_RESPONSE_TYPE', { state: 'number_reserved', numberReserved: true }],
    ['parseFiscalSigningReadinessResponse', 'FISCAL_SIGNING_READINESS_RESPONSE_TYPE', {
      state: 'number_reserved', documentReadyForA1Signature: true, realCertificateInspected: false,
      realSignatureAttempted: false, persisted: false, xmlReturned: false, sensitiveMaterialReturned: false,
    }],
    ['parseFiscalSignResponse', 'FISCAL_SIGN_RESPONSE_TYPE', {
      state: 'signed', signed: true, persisted: true, artifactRegistered: true,
      realCertificateInspected: true, signatureVerified: true, signedXsdValid: true,
      signedContentReturned: false, sensitiveMaterialReturned: false,
    }],
    ['parseFiscalIssueResponse', 'FISCAL_ISSUE_RESPONSE_TYPE', {
      state: 'authorized', signed: true, persisted: true, submitted: true, transmitted: true,
      authorized: true, processing: false, rejected: false, statusCode: '100',
      statusReason: 'Autorizado em simulação', protocolStored: true, receiptConsultationPending: false,
      externalContentReturned: false, sensitiveMaterialReturned: false,
    }],
  ];
  for (const [parser, type, fields] of cases) {
    for (const environment of ['homologacao', 'producao', 'desconhecido']) {
      const response = bridge[parser]({
        type: bridge[type], requestId: 'audit:synthetic-response', ok: true,
        emission: { ...base, ...fields, environment },
      });
      if (environment === 'desconhecido') assert.equal(response, null, parser);
      else {
        assert.equal(response?.ok, true, parser);
        assert.equal(response.emission.environment, environment, parser);
      }
    }
  }
});

test('continuação automática mantém o ambiente em autorização nova e recuperação, sem retransmissão', async () => {
  const { createCommercialNfeAutomaticIssuanceService } = await import('../../app/vendas/lib/server/commercial-nfe-automatic-issuance.mjs');
  for (const environment of ['producao', 'homologacao']) {
    for (const initialState of ['number_reserved', 'signed', 'authorized', 'processing', 'rejected']) {
      const calls = [];
      const current = { environment, state: initialState, version: 2, series: '2', number: 1 };
      const service = createCommercialNfeAutomaticIssuanceService({
        emissionStateResolver: async () => current,
        signingPreparationService: { prepare: async () => { calls.push('prepare'); return { ok: true, result: { version: 2 } }; } },
        signingService: { sign: async () => { calls.push('sign'); return { ok: true, result: { ...current, state: 'signed', signed: true, persisted: true } }; } },
        submissionService: { submit: async () => { calls.push('submit'); return { ok: true, result: { emissionId: draftId, state: 'authorized', version: 3, authorized: true } }; } },
      });
      const response = await service.continue({ context: {}, emissionId: draftId, expectedVersion: 2, idempotencyKey: 'synthetic:continuation' });
      assert.equal(response.ok, true);
      assert.equal(response.result.environment, environment);
      assert.deepEqual(calls, initialState === 'number_reserved' ? ['prepare', 'sign', 'submit'] : initialState === 'signed' ? ['submit'] : []);
    }
  }
});
