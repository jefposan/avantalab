import { timingSafeEqual } from 'node:crypto';

export const NFE_ISSUANCE_ORCHESTRATOR_REFERENCE = '2026-09-04';
export const NFE_ISSUANCE_ORCHESTRATOR_SCOPE = 'nfe-sp-local-lab';
export const NFE_ISSUANCE_ORCHESTRATOR_CONFIRMATION = 'AUTORIZO_HOMOLOGACAO_SEM_VALOR_FISCAL';

const MIN_TOKEN_BYTES = 32;

function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function blocked(reason = 'activation_locked') {
  const deny = async () => ({
    ok: false,
    blocked: true,
    reason,
    transmitted: false,
    errors: [{ code: 'AV-NFE-ORCHESTRATOR-LOCKED', field: 'orchestrator', message: 'A emissão fiscal controlada ainda não foi liberada neste ambiente.' }],
  });
  return Object.freeze({
    id: 'avantalab-nfe-issuance-orchestrator-v1',
    configured: false,
    environment: 'homologacao',
    scope: NFE_ISSUANCE_ORCHESTRATOR_SCOPE,
    reason,
    transmissionAllowed: false,
    continueProtected: deny,
    runRecoveryOnceProtected: deny,
  });
}

function tokenMatches(expected, candidate) {
  const expectedBytes = Buffer.from(expected, 'utf8');
  const candidateBytes = Buffer.from(text(candidate), 'utf8');
  return expectedBytes.byteLength >= MIN_TOKEN_BYTES
    && candidateBytes.byteLength === expectedBytes.byteLength
    && timingSafeEqual(expectedBytes, candidateBytes);
}

const SENSITIVE_RESULT_KEYS = new Set(['activationToken', 'signedXml', 'protocolXml', 'privateKey', 'pkcs12', 'passphrase']);

function scrubResult(value, depth = 0) {
  if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (depth > 8 || value instanceof Uint8Array || Buffer.isBuffer(value)) return undefined;
  if (Array.isArray(value)) return value.map((item) => scrubResult(item, depth + 1)).filter((item) => item !== undefined);
  if (typeof value !== 'object') return undefined;
  const cleaned = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_RESULT_KEYS.has(key)) continue;
    const scrubbed = scrubResult(item, depth + 1);
    if (scrubbed !== undefined) cleaned[key] = scrubbed;
  }
  return cleaned;
}

function safeResult(value) {
  if (!value || typeof value !== 'object') return { ok: false, errors: [{ code: 'AV-NFE-ORCHESTRATOR-RESULT', field: 'orchestrator', message: 'O executor fiscal não devolveu um resultado válido.' }] };
  const result = scrubResult(value);
  result.sensitiveMaterialReturned = false;
  return result;
}

export function createNfeIssuanceOrchestrator({
  enabled = false,
  environment = '',
  scope = '',
  confirmation = '',
  activationToken = '',
  automaticIssuanceService,
  recoveryWorker,
} = {}) {
  const token = text(activationToken);
  const gateReady = enabled === true
    && text(environment) === 'homologacao'
    && text(scope) === NFE_ISSUANCE_ORCHESTRATOR_SCOPE
    && text(confirmation) === NFE_ISSUANCE_ORCHESTRATOR_CONFIRMATION
    && Buffer.byteLength(token, 'utf8') >= MIN_TOKEN_BYTES;
  if (!gateReady) return blocked('activation_locked');
  if (!automaticIssuanceService?.continue || !recoveryWorker?.runOnce) return blocked('dependencies_incomplete');

  function authorized(candidate) {
    return tokenMatches(token, candidate);
  }

  return Object.freeze({
    id: 'avantalab-nfe-issuance-orchestrator-v1',
    configured: true,
    environment: 'homologacao',
    scope: NFE_ISSUANCE_ORCHESTRATOR_SCOPE,
    reason: 'ready',
    transmissionAllowed: true,
    async continueProtected({ activationToken: candidate, ...input } = {}) {
      if (!authorized(candidate)) return blocked('invalid_execution_token').continueProtected();
      return safeResult(await automaticIssuanceService.continue(input));
    },
    async runRecoveryOnceProtected({ activationToken: candidate, ...input } = {}) {
      if (!authorized(candidate)) return blocked('invalid_execution_token').runRecoveryOnceProtected();
      return safeResult(await recoveryWorker.runOnce(input));
    },
  });
}
