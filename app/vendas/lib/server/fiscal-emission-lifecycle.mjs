import { createHash } from 'node:crypto';

export const FISCAL_EMISSION_LIFECYCLE_REFERENCE = '2026-09-05';
export const FISCAL_EMISSION_STATES = Object.freeze([
  'draft',
  'prepared',
  'number_reserved',
  'signed',
  'submitted',
  'processing',
  'authorized',
  'artifacts_stored',
  'danfe_ready',
  'rejected',
  'failed',
  'canceled',
]);

const TRANSITIONS = Object.freeze({
  draft: ['prepared', 'failed'],
  prepared: ['number_reserved', 'signed', 'failed'],
  number_reserved: ['signed', 'failed'],
  signed: ['submitted', 'failed'],
  submitted: ['processing', 'authorized', 'rejected', 'failed'],
  processing: ['processing', 'authorized', 'rejected', 'failed'],
  authorized: ['artifacts_stored', 'canceled'],
  artifacts_stored: ['danfe_ready', 'canceled'],
  danfe_ready: ['canceled'],
  rejected: ['prepared'],
  failed: ['prepared'],
  canceled: [],
});

const IMMUTABLE_AFTER_NUMBER = ['companyId', 'establishmentId', 'documentType', 'model', 'series', 'number', 'reservationId'];
const IMMUTABLE_AFTER_SIGNATURE = ['accessKey'];
const SENSITIVE_KEY = /(xml|password|senha|secret|private|certificate|certificado|pfx|p12|token|content|buffer)/i;
const ALLOWED_PATCH_FIELDS = new Set(['series', 'number', 'reservationId', 'accessKey', 'signedChecksum', 'batchId', 'submittedAt', 'receiptNumber', 'statusCode', 'statusReason', 'protocolNumber', 'authorizedAt', 'processedStorageReference', 'processedChecksum', 'danfeStorageReference', 'danfeChecksum', 'failureCode', 'failureReason', 'cancellationProtocol', 'cancellationStatusCode', 'canceledAt']);
const RECOVERY_JOB_BY_STATE = Object.freeze({ submitted: 'authorization_status', processing: 'receipt_status', authorized: 'processed_artifact', artifacts_stored: 'danfe_generation' });

function error(code, field, message) {
  return { code, field, message };
}

function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function positiveInteger(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function copy(value) {
  return value == null ? value : structuredClone(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function requestHash(value) {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function matchesOperation(operation, expected) {
  return operation?.emissionId === expected.emissionId
    && operation?.operationType === expected.operationType
    && operation?.requestHash === expected.requestHash;
}

function safePublicPayload(value) {
  const source = plainObject(value);
  const errors = [];
  let serialized = '';
  try { serialized = JSON.stringify(source); } catch { errors.push(error('AV-FISCAL-LIFECYCLE-PAYLOAD', 'publicPayload', 'Os dados públicos do evento não são serializáveis.')); }
  if (serialized && Buffer.byteLength(serialized, 'utf8') > 16 * 1024) errors.push(error('AV-FISCAL-LIFECYCLE-PAYLOAD-SIZE', 'publicPayload', 'Os dados públicos do evento excedem 16 KB.'));
  const inspect = (entry, path = 'publicPayload') => {
    if (!entry || typeof entry !== 'object') return;
    for (const [key, nested] of Object.entries(entry)) {
      if (SENSITIVE_KEY.test(key)) errors.push(error('AV-FISCAL-LIFECYCLE-SENSITIVE', `${path}.${key}`, 'Conteúdo fiscal ou segredo não pode ser gravado no evento público.'));
      if (nested && typeof nested === 'object') inspect(nested, `${path}.${key}`);
    }
  };
  inspect(source);
  return { valid: errors.length === 0, value: source, errors };
}

function normalizeArtifact(input, companyId, emissionId, at, contract) {
  const artifact = {
    companyId,
    emissionId,
    artifactType: text(input?.artifactType),
    storageReference: text(input?.storageReference),
    storageVersion: text(input?.storageVersion),
    checksum: text(input?.checksum).toLowerCase(),
    byteLength: Number(input?.byteLength),
    contentType: text(input?.contentType),
    createdAt: text(input?.createdAt) || at,
  };
  const errors = [];
  if (artifact.artifactType !== contract.artifactType || artifact.contentType !== contract.contentType) errors.push(error(contract.code, 'artifact.artifactType', contract.message));
  if (!/^(?:avantalab-fiscal|supabase|s3):\/\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(artifact.storageReference) || artifact.storageReference.includes('..') || artifact.storageReference.includes('\\')) errors.push(error('AV-FISCAL-LIFECYCLE-ARTIFACT-REFERENCE', 'artifact.storageReference', 'A referência do artefato fiscal não é segura.'));
  if (artifact.storageVersion.length > 180) errors.push(error('AV-FISCAL-LIFECYCLE-ARTIFACT-VERSION', 'artifact.storageVersion', 'A versão do armazenamento excede o limite permitido.'));
  if (!/^[a-f0-9]{64}$/.test(artifact.checksum)) errors.push(error('AV-FISCAL-LIFECYCLE-ARTIFACT-CHECKSUM', 'artifact.checksum', 'O checksum SHA-256 do artefato fiscal é obrigatório.'));
  if (!Number.isSafeInteger(artifact.byteLength) || artifact.byteLength <= 0 || artifact.byteLength > 10 * 1024 * 1024) errors.push(error('AV-FISCAL-LIFECYCLE-ARTIFACT-SIZE', 'artifact.byteLength', 'O tamanho do artefato fiscal é inválido.'));
  if (!Number.isFinite(Date.parse(artifact.createdAt))) errors.push(error('AV-FISCAL-LIFECYCLE-ARTIFACT-DATE', 'artifact.createdAt', 'A data de armazenamento do artefato fiscal é inválida.'));
  return { artifact, errors };
}

function normalizeSignedArtifact(input, companyId, emissionId, at) {
  return normalizeArtifact(input, companyId, emissionId, at, { artifactType: 'signed_xml', contentType: 'application/xml', code: 'AV-FISCAL-LIFECYCLE-SIGNED-ARTIFACT', message: 'A confirmação da assinatura exige o artefato signed_xml em application/xml.' });
}

function normalizeProtocolArtifact(input, companyId, emissionId, at) {
  return normalizeArtifact(input, companyId, emissionId, at, { artifactType: 'protocol_xml', contentType: 'application/xml', code: 'AV-FISCAL-LIFECYCLE-PROTOCOL-ARTIFACT', message: 'A autorização exige o artefato protocol_xml em application/xml.' });
}

function normalizeCancellationArtifact(input, companyId, emissionId, at) {
  return normalizeArtifact(input, companyId, emissionId, at, { artifactType: 'cancellation_event_xml', contentType: 'application/xml', code: 'AV-FISCAL-LIFECYCLE-CANCELLATION-ARTIFACT', message: 'O cancelamento exige o evento processado em application/xml.' });
}

function sameArtifact(left, right) {
  return left?.storageReference === right.storageReference
    && text(left?.storageVersion) === right.storageVersion
    && left?.checksum === right.checksum
    && Number(left?.byteLength) === right.byteLength
    && left?.contentType === right.contentType;
}

function validateCreate(input) {
  const errors = [];
  const normalized = {
    id: text(input?.id),
    companyId: text(input?.companyId),
    establishmentId: text(input?.establishmentId),
    draftId: text(input?.draftId),
    originId: text(input?.originId),
    documentType: text(input?.documentType).toLowerCase(),
    model: text(input?.model),
    environment: text(input?.environment).toLowerCase(),
    operationKey: text(input?.operationKey),
    actorId: text(input?.actorId),
  };
  if (!normalized.id) errors.push(error('AV-FISCAL-LIFECYCLE-ID', 'id', 'A emissão precisa de um identificador interno.'));
  if (!normalized.companyId) errors.push(error('AV-FISCAL-LIFECYCLE-COMPANY', 'companyId', 'A emissão precisa pertencer a uma empresa.'));
  if (!normalized.establishmentId) errors.push(error('AV-FISCAL-LIFECYCLE-ESTABLISHMENT', 'establishmentId', 'O emissor fiscal interno não foi identificado.'));
  if (!normalized.draftId) errors.push(error('AV-FISCAL-LIFECYCLE-DRAFT', 'draftId', 'A emissão precisa manter vínculo com o rascunho.'));
  if (normalized.documentType !== 'nfe' || normalized.model !== '55') errors.push(error('AV-FISCAL-LIFECYCLE-DOCUMENT', 'documentType', 'Este ciclo aceita somente NF-e modelo 55.'));
  if (normalized.environment !== 'homologacao') errors.push(error('AV-FISCAL-LIFECYCLE-ENVIRONMENT', 'environment', 'O piloto aceita somente o ambiente de homologação.'));
  if (normalized.operationKey.length < 8 || normalized.operationKey.length > 120) errors.push(error('AV-FISCAL-LIFECYCLE-OPERATION', 'operationKey', 'A chave idempotente deve possuir de 8 a 120 caracteres.'));
  return { valid: errors.length === 0, normalized, errors };
}

function validateTransition(current, toState, patch) {
  const errors = [];
  const next = text(toState);
  const changes = plainObject(patch);
  for (const key of Object.keys(changes)) {
    if (!ALLOWED_PATCH_FIELDS.has(key) || SENSITIVE_KEY.test(key)) errors.push(error('AV-FISCAL-LIFECYCLE-PATCH', `patch.${key}`, 'O campo não pertence ao contrato seguro de transição fiscal.'));
  }
  if (!FISCAL_EMISSION_STATES.includes(next)) errors.push(error('AV-FISCAL-LIFECYCLE-STATE', 'toState', 'O estado fiscal solicitado não é reconhecido.'));
  if (!TRANSITIONS[current.state]?.includes(next)) errors.push(error('AV-FISCAL-LIFECYCLE-TRANSITION', 'toState', `A transição de ${current.state} para ${next || 'estado vazio'} não é permitida.`));
  if (current.reservationId || current.number || current.series) {
    for (const field of IMMUTABLE_AFTER_NUMBER) {
      if (Object.hasOwn(changes, field) && changes[field] !== current[field]) errors.push(error('AV-FISCAL-LIFECYCLE-IMMUTABLE', `patch.${field}`, 'A identificação fiscal não pode mudar depois da reserva do número.'));
    }
  }
  if (['signed', 'submitted', 'processing', 'authorized', 'artifacts_stored', 'danfe_ready', 'canceled'].includes(current.state) && Object.hasOwn(changes, 'accessKey') && changes.accessKey !== current.accessKey) errors.push(error('AV-FISCAL-LIFECYCLE-IMMUTABLE', 'patch.accessKey', 'A chave de acesso não pode mudar depois da assinatura.'));
  const candidate = { ...current, ...changes, state: next };
  if (next === 'number_reserved' && (!candidate.reservationId || !text(candidate.series) || !positiveInteger(candidate.number))) errors.push(error('AV-FISCAL-LIFECYCLE-NUMBER', 'patch.number', 'A reserva exige identificador, série e número fiscal.'));
  if (next === 'signed' && (!candidate.reservationId || !text(candidate.series) || !positiveInteger(candidate.number) || !/^\d{44}$/.test(text(candidate.accessKey)) || !/^[a-f0-9]{64}$/i.test(text(candidate.signedChecksum)))) errors.push(error('AV-FISCAL-LIFECYCLE-SIGNATURE', 'patch.signedChecksum', 'A assinatura exige reserva, chave de 44 dígitos e checksum SHA-256.'));
  if (next === 'submitted' && (!text(candidate.batchId) || !candidate.submittedAt)) errors.push(error('AV-FISCAL-LIFECYCLE-SUBMISSION', 'patch.batchId', 'O envio exige lote e data da tentativa.'));
  if (next === 'processing' && !/^\d{15}$/.test(text(candidate.receiptNumber))) errors.push(error('AV-FISCAL-LIFECYCLE-RECEIPT', 'patch.receiptNumber', 'O processamento exige recibo de 15 dígitos.'));
  if (next === 'authorized' && (text(candidate.statusCode) !== '100' || !text(candidate.protocolNumber) || !candidate.authorizedAt || !/^\d{44}$/.test(text(candidate.accessKey)))) errors.push(error('AV-FISCAL-LIFECYCLE-AUTHORIZATION', 'patch.protocolNumber', 'A autorização exige situação 100, protocolo, data e chave válida.'));
  if (next === 'artifacts_stored' && (!text(candidate.processedStorageReference) || !/^[a-f0-9]{64}$/i.test(text(candidate.processedChecksum)))) errors.push(error('AV-FISCAL-LIFECYCLE-PROCESSED', 'patch.processedStorageReference', 'A guarda exige referência imutável e checksum do procNFe.'));
  if (next === 'danfe_ready' && (!text(candidate.danfeStorageReference) || !/^[a-f0-9]{64}$/i.test(text(candidate.danfeChecksum)))) errors.push(error('AV-FISCAL-LIFECYCLE-DANFE', 'patch.danfeStorageReference', 'O DANFE exige referência persistida e checksum do PDF.'));
  if (next === 'rejected' && (!/^\d{3}$/.test(text(candidate.statusCode)) || !text(candidate.statusReason))) errors.push(error('AV-FISCAL-LIFECYCLE-REJECTION', 'patch.statusCode', 'A rejeição precisa preservar código e motivo do autorizador.'));
  if (next === 'failed' && (!text(candidate.failureCode) || !text(candidate.failureReason))) errors.push(error('AV-FISCAL-LIFECYCLE-FAILURE', 'patch.failureCode', 'A falha precisa preservar código técnico seguro e motivo operacional.'));
  if (next === 'canceled' && (!text(candidate.cancellationProtocol) || !['135', '155'].includes(text(candidate.cancellationStatusCode)) || !candidate.canceledAt)) errors.push(error('AV-FISCAL-LIFECYCLE-CANCELLATION', 'patch.cancellationProtocol', 'O cancelamento exige protocolo, situação de evento registrada e data.'));
  return { valid: errors.length === 0, next: candidate, errors };
}

function publicEmission(record) {
  if (!record) return null;
  const result = copy(record);
  for (const key of Object.keys(result)) if (SENSITIVE_KEY.test(key)) delete result[key];
  result.sensitiveMaterialReturned = false;
  return result;
}

export function createDisabledFiscalLifecycleRepository() {
  return Object.freeze({ id: 'repositorio-fiscal-nao-configurado', configured: false, async runInTransaction() { throw new Error('O repositório fiscal transacional ainda não foi instalado.'); } });
}

export function createFiscalEmissionLifecycleService({ repository = createDisabledFiscalLifecycleRepository(), clock = () => new Date().toISOString() } = {}) {
  async function unavailable() {
    return { ok: false, valid: false, persisted: false, reused: false, emission: null, errors: [error('AV-FISCAL-LIFECYCLE-REPOSITORY', 'repository', 'O repositório fiscal transacional ainda não está configurado.')], warnings: ['Nenhuma emissão fiscal foi alterada.'] };
  }
  async function commitStoredArtifact(input, contract) {
    const companyId = text(input.companyId);
    const emissionId = text(input.emissionId);
    const operationKey = text(input.operationKey);
    const expectedVersion = positiveInteger(input.expectedVersion);
    const payload = safePublicPayload(input.publicPayload);
    const at = text(input.at) || clock();
    const normalizedArtifact = normalizeArtifact(input.artifact, companyId, emissionId, at, contract);
    const errors = [...payload.errors, ...normalizedArtifact.errors];
    if (!companyId || !emissionId) errors.push(error('AV-FISCAL-LIFECYCLE-TARGET', 'emissionId', 'Empresa e emissão são obrigatórias.'));
    if (operationKey.length < 8 || operationKey.length > 120 || !expectedVersion) errors.push(error('AV-FISCAL-LIFECYCLE-ARTIFACT-OPERATION', 'operationKey', 'A confirmação do artefato exige versão e chave idempotente válidas.'));
    if (errors.length) return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors };
    if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return unavailable();
    const artifact = normalizedArtifact.artifact;
    const operation = { emissionId, operationType: 'transition', requestHash: requestHash({ companyId, emissionId, expectedVersion, action: contract.action, artifact, publicPayload: payload.value }) };
    return repository.runInTransaction(async (tx) => {
      await tx.lockKey?.('operation', companyId, operationKey);
      const priorOperation = await tx.getOperation(companyId, operationKey);
      if (priorOperation) {
        const priorEmission = publicEmission(await tx.getEmission(priorOperation.emissionId));
        const priorArtifact = await tx.findArtifact?.(companyId, priorOperation.emissionId, contract.artifactType);
        if (!matchesOperation(priorOperation, operation)) return { ok: false, valid: false, persisted: false, reused: false, emission: priorEmission, artifact: priorArtifact || null, errors: [error('AV-FISCAL-LIFECYCLE-IDEMPOTENCY-CONFLICT', 'operationKey', 'A chave idempotente já pertence a outra operação fiscal.')] };
        return { ok: true, valid: true, persisted: true, reused: true, emission: priorEmission, artifact: priorArtifact || null, errors: [] };
      }
      if (typeof tx.findArtifact !== 'function' || typeof tx.insertArtifact !== 'function') return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-REPOSITORY', 'repository', 'O repositório fiscal não oferece registro transacional de artefatos.')] };
      const current = await tx.getEmission(emissionId, { forUpdate: true });
      if (!current || current.companyId !== companyId) return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-NOT-FOUND', 'emissionId', 'A emissão fiscal não foi encontrada nesta empresa.')] };
      if (current.version !== expectedVersion) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-CONFLICT', 'expectedVersion', 'A emissão foi alterada; recarregue o estado antes de confirmar o artefato.')] };
      const acceptedStates = contract.fromStates || [contract.fromState];
      if (!acceptedStates.includes(current.state)) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-TRANSITION', 'state', contract.stateMessage)] };
      await tx.lockKey?.('artifact', companyId, emissionId, contract.artifactType);
      let registered = await tx.findArtifact(companyId, emissionId, contract.artifactType);
      if (registered && !sameArtifact(registered, artifact)) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: registered, errors: [error('AV-FISCAL-LIFECYCLE-ARTIFACT-CONFLICT', 'artifact', 'Já existe outro artefato imutável registrado para esta etapa.')] };
      if (!registered) registered = await tx.insertArtifact(artifact);
      const validation = validateTransition(current, contract.toState, contract.patch(artifact));
      if (!validation.valid || !registered) throw Object.assign(new Error('O artefato não corresponde ao ciclo da emissão.'), { code: 'AV-FISCAL-ARTIFACT-CONTRACT' });
      const next = { ...validation.next, version: current.version + 1, updatedAt: at };
      const updated = await tx.updateEmission(next, { expectedVersion: current.version });
      if (updated === false) throw Object.assign(new Error('A emissão mudou durante a confirmação do artefato.'), { code: '40001' });
      await tx.appendEvent({ emissionId, companyId, sequence: next.version, fromState: current.state, toState: next.state, eventType: contract.eventType, actorId: text(input.actorId) || null, publicPayload: { ...payload.value, artifactId: text(registered.id), artifactType: contract.artifactType, checksum: artifact.checksum }, occurredAt: at });
      await tx.insertOperation({ companyId, operationKey, ...operation, resultingVersion: next.version, createdAt: at });
      const recoveryJobType = RECOVERY_JOB_BY_STATE[next.state];
      if (recoveryJobType && typeof tx.enqueueRecoveryJob === 'function') await tx.enqueueRecoveryJob({ companyId, emissionId, jobType: recoveryJobType, idempotencyKey: `lifecycle:${emissionId}:${next.version}:${recoveryJobType}`, maxAttempts: 8, availableAt: at, createdAt: at });
      return { ok: true, valid: true, persisted: true, reused: false, emission: publicEmission(next), artifact: copy(registered), errors: [] };
    });
  }
  return Object.freeze({
    id: 'avantalab-fiscal-emission-lifecycle-v1',
    async create(input = {}) {
      const validation = validateCreate(input);
      const payload = safePublicPayload(input.publicPayload);
      const errors = [...validation.errors, ...payload.errors];
      if (errors.length) return { ok: false, valid: false, persisted: false, reused: false, emission: null, errors };
      if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return unavailable();
      const at = text(input.at) || clock();
      const operation = {
        emissionId: validation.normalized.id,
        operationType: 'create',
        requestHash: requestHash({ ...validation.normalized, operationKey: undefined, actorId: undefined, publicPayload: payload.value }),
      };
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('operation', validation.normalized.companyId, validation.normalized.operationKey);
        const priorOperation = await tx.getOperation(validation.normalized.companyId, validation.normalized.operationKey);
        if (priorOperation) {
          const priorEmission = publicEmission(await tx.getEmission(priorOperation.emissionId));
          if (!matchesOperation(priorOperation, operation)) return { ok: false, valid: false, persisted: false, reused: false, emission: priorEmission, errors: [error('AV-FISCAL-LIFECYCLE-IDEMPOTENCY-CONFLICT', 'operationKey', 'A chave idempotente já pertence a outra operação fiscal.')] };
          return { ok: true, valid: true, persisted: true, reused: true, emission: priorEmission, errors: [] };
        }
        await tx.lockKey?.('draft', validation.normalized.companyId, validation.normalized.draftId);
        const existing = await tx.getEmission(validation.normalized.id);
        if (existing) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(existing), errors: [error('AV-FISCAL-LIFECYCLE-DUPLICATE', 'id', 'Já existe uma emissão fiscal com este identificador.')] };
        const emission = { ...validation.normalized, operationKey: undefined, actorId: undefined, state: 'draft', version: 1, series: '', number: 0, reservationId: '', accessKey: '', signedChecksum: '', batchId: '', receiptNumber: '', statusCode: '', statusReason: '', protocolNumber: '', processedStorageReference: '', processedChecksum: '', danfeStorageReference: '', danfeChecksum: '', cancellationProtocol: '', cancellationStatusCode: '', failureCode: '', failureReason: '', createdAt: at, updatedAt: at };
        delete emission.operationKey;
        delete emission.actorId;
        await tx.insertEmission(emission);
        await tx.appendEvent({ emissionId: emission.id, companyId: emission.companyId, sequence: 1, fromState: null, toState: 'draft', eventType: 'emission.created', actorId: validation.normalized.actorId || null, publicPayload: payload.value, occurredAt: at });
        await tx.insertOperation({ companyId: emission.companyId, operationKey: validation.normalized.operationKey, ...operation, resultingVersion: 1, createdAt: at });
        return { ok: true, valid: true, persisted: true, reused: false, emission: publicEmission(emission), errors: [] };
      });
    },
    async transition(input = {}) {
      const companyId = text(input.companyId);
      const emissionId = text(input.emissionId);
      const operationKey = text(input.operationKey);
      const expectedVersion = positiveInteger(input.expectedVersion);
      const payload = safePublicPayload(input.publicPayload);
      const errors = [...payload.errors];
      if (!companyId || !emissionId) errors.push(error('AV-FISCAL-LIFECYCLE-TARGET', 'emissionId', 'Empresa e emissão são obrigatórias.'));
      if (operationKey.length < 8 || operationKey.length > 120) errors.push(error('AV-FISCAL-LIFECYCLE-OPERATION', 'operationKey', 'A chave idempotente deve possuir de 8 a 120 caracteres.'));
      if (!expectedVersion) errors.push(error('AV-FISCAL-LIFECYCLE-VERSION', 'expectedVersion', 'Informe a versão esperada para impedir atualização concorrente.'));
      if (errors.length) return { ok: false, valid: false, persisted: false, reused: false, emission: null, errors };
      if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return unavailable();
      const at = text(input.at) || clock();
      const operation = {
        emissionId,
        operationType: 'transition',
        requestHash: requestHash({ companyId, emissionId, expectedVersion, toState: text(input.toState), patch: plainObject(input.patch), eventType: text(input.eventType), publicPayload: payload.value }),
      };
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('operation', companyId, operationKey);
        const priorOperation = await tx.getOperation(companyId, operationKey);
        if (priorOperation) {
          const priorEmission = publicEmission(await tx.getEmission(priorOperation.emissionId));
          if (!matchesOperation(priorOperation, operation)) return { ok: false, valid: false, persisted: false, reused: false, emission: priorEmission, errors: [error('AV-FISCAL-LIFECYCLE-IDEMPOTENCY-CONFLICT', 'operationKey', 'A chave idempotente já pertence a outra operação fiscal.')] };
          return { ok: true, valid: true, persisted: true, reused: true, emission: priorEmission, errors: [] };
        }
        const current = await tx.getEmission(emissionId, { forUpdate: true });
        if (!current || current.companyId !== companyId) return { ok: false, valid: false, persisted: false, reused: false, emission: null, errors: [error('AV-FISCAL-LIFECYCLE-NOT-FOUND', 'emissionId', 'A emissão fiscal não foi encontrada nesta empresa.')] };
        if (current.version !== expectedVersion) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), errors: [error('AV-FISCAL-LIFECYCLE-CONFLICT', 'expectedVersion', 'A emissão foi alterada por outro processo; recarregue o estado antes de continuar.')] };
        const validation = validateTransition(current, input.toState, input.patch);
        if (!validation.valid) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), errors: validation.errors };
        const next = { ...validation.next, version: current.version + 1, updatedAt: at };
        const updated = await tx.updateEmission(next, { expectedVersion: current.version });
        if (updated === false) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(await tx.getEmission(emissionId)), errors: [error('AV-FISCAL-LIFECYCLE-CONFLICT', 'expectedVersion', 'A emissão foi alterada por outro processo; recarregue o estado antes de continuar.')] };
        await tx.appendEvent({ emissionId: next.id, companyId: next.companyId, sequence: next.version, fromState: current.state, toState: next.state, eventType: text(input.eventType) || `emission.${next.state}`, actorId: text(input.actorId) || null, publicPayload: payload.value, occurredAt: at });
        await tx.insertOperation({ companyId, operationKey, ...operation, resultingVersion: next.version, createdAt: at });
        const recoveryJobType = RECOVERY_JOB_BY_STATE[next.state];
        if (recoveryJobType && typeof tx.enqueueRecoveryJob === 'function') await tx.enqueueRecoveryJob({ companyId, emissionId, jobType: recoveryJobType, idempotencyKey: `lifecycle:${emissionId}:${next.version}:${recoveryJobType}`, maxAttempts: 8, availableAt: at, createdAt: at });
        return { ok: true, valid: true, persisted: true, reused: false, emission: publicEmission(next), errors: [] };
      });
    },
    async commitSignature(input = {}) {
      const companyId = text(input.companyId);
      const emissionId = text(input.emissionId);
      const operationKey = text(input.operationKey);
      const expectedVersion = positiveInteger(input.expectedVersion);
      const accessKey = text(input.accessKey);
      const payload = safePublicPayload(input.publicPayload);
      const at = text(input.at) || clock();
      const normalizedArtifact = normalizeSignedArtifact(input.artifact, companyId, emissionId, at);
      const errors = [...payload.errors, ...normalizedArtifact.errors];
      if (!companyId || !emissionId) errors.push(error('AV-FISCAL-LIFECYCLE-TARGET', 'emissionId', 'Empresa e emissão são obrigatórias.'));
      if (operationKey.length < 8 || operationKey.length > 120) errors.push(error('AV-FISCAL-LIFECYCLE-OPERATION', 'operationKey', 'A chave idempotente deve possuir de 8 a 120 caracteres.'));
      if (!expectedVersion) errors.push(error('AV-FISCAL-LIFECYCLE-VERSION', 'expectedVersion', 'Informe a versão esperada para impedir atualização concorrente.'));
      if (!/^\d{44}$/.test(accessKey)) errors.push(error('AV-FISCAL-LIFECYCLE-SIGNATURE', 'accessKey', 'A chave de acesso assinada precisa possuir 44 dígitos.'));
      if (errors.length) return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors };
      if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return unavailable();
      const artifact = normalizedArtifact.artifact;
      const operation = {
        emissionId,
        operationType: 'transition',
        requestHash: requestHash({ companyId, emissionId, expectedVersion, action: 'commit_signature', accessKey, artifact, publicPayload: payload.value }),
      };
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('operation', companyId, operationKey);
        const priorOperation = await tx.getOperation(companyId, operationKey);
        if (priorOperation) {
          const priorEmission = publicEmission(await tx.getEmission(priorOperation.emissionId));
          const priorArtifact = await tx.findArtifact?.(companyId, priorOperation.emissionId, 'signed_xml');
          if (!matchesOperation(priorOperation, operation)) return { ok: false, valid: false, persisted: false, reused: false, emission: priorEmission, artifact: priorArtifact || null, errors: [error('AV-FISCAL-LIFECYCLE-IDEMPOTENCY-CONFLICT', 'operationKey', 'A chave idempotente já pertence a outra operação fiscal.')] };
          return { ok: true, valid: true, persisted: true, reused: true, emission: priorEmission, artifact: priorArtifact || null, errors: [] };
        }
        if (typeof tx.findArtifact !== 'function' || typeof tx.insertArtifact !== 'function') return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-REPOSITORY', 'repository', 'O repositório fiscal não oferece registro transacional de artefatos.')] };
        const current = await tx.getEmission(emissionId, { forUpdate: true });
        if (!current || current.companyId !== companyId) return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-NOT-FOUND', 'emissionId', 'A emissão fiscal não foi encontrada nesta empresa.')] };
        if (current.version !== expectedVersion) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-CONFLICT', 'expectedVersion', 'A emissão foi alterada por outro processo; recarregue o estado antes de continuar.')] };
        if (current.state !== 'number_reserved') return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-TRANSITION', 'state', 'A assinatura só pode ser confirmada depois da reserva do número fiscal.')] };
        await tx.lockKey?.('artifact', companyId, emissionId, 'signed_xml');
        let registered = await tx.findArtifact(companyId, emissionId, 'signed_xml');
        if (registered && !sameArtifact(registered, artifact)) registered = await tx.insertArtifact(artifact);
        if (!registered) registered = await tx.insertArtifact(artifact);
        if (!registered) throw Object.assign(new Error('O metadado do XML assinado não foi registrado.'), { code: 'AV-FISCAL-SIGNED-REGISTER' });
        const validation = validateTransition(current, 'signed', { accessKey, signedChecksum: artifact.checksum });
        if (!validation.valid) throw Object.assign(new Error('O XML assinado não corresponde ao ciclo da emissão.'), { code: 'AV-FISCAL-SIGNED-CONTRACT' });
        const next = { ...validation.next, version: current.version + 1, updatedAt: at };
        const updated = await tx.updateEmission(next, { expectedVersion: current.version });
        if (updated === false) throw Object.assign(new Error('A emissão mudou durante a confirmação da assinatura.'), { code: '40001' });
        await tx.appendEvent({ emissionId, companyId, sequence: next.version, fromState: current.state, toState: 'signed', eventType: 'emission.signed', actorId: text(input.actorId) || null, publicPayload: { ...payload.value, artifactId: text(registered.id), artifactRevision: positiveInteger(registered.revision) || 1, checksum: artifact.checksum }, occurredAt: at });
        await tx.insertOperation({ companyId, operationKey, ...operation, resultingVersion: next.version, createdAt: at });
        return { ok: true, valid: true, persisted: true, reused: false, emission: publicEmission(next), artifact: copy(registered), errors: [] };
      });
    },
    async beginSubmission(input = {}) {
      const companyId = text(input.companyId);
      const emissionId = text(input.emissionId);
      const operationKey = text(input.operationKey);
      const expectedVersion = positiveInteger(input.expectedVersion);
      const accessKey = text(input.accessKey);
      const signedChecksum = text(input.signedChecksum).toLowerCase();
      const batchId = text(input.batchId);
      const payload = safePublicPayload(input.publicPayload);
      const errors = [...payload.errors];
      if (!companyId || !emissionId) errors.push(error('AV-FISCAL-LIFECYCLE-TARGET', 'emissionId', 'Empresa e emissão são obrigatórias.'));
      if (operationKey.length < 8 || operationKey.length > 120) errors.push(error('AV-FISCAL-LIFECYCLE-OPERATION', 'operationKey', 'A chave idempotente deve possuir de 8 a 120 caracteres.'));
      if (!expectedVersion) errors.push(error('AV-FISCAL-LIFECYCLE-VERSION', 'expectedVersion', 'Informe a versão esperada para impedir atualização concorrente.'));
      if (!/^\d{44}$/.test(accessKey) || !/^[a-f0-9]{64}$/.test(signedChecksum)) errors.push(error('AV-FISCAL-LIFECYCLE-SUBMISSION-SIGNATURE', 'signedChecksum', 'A tentativa exige chave e checksum do XML assinado.'));
      if (!/^\d{1,15}$/.test(batchId) || BigInt(batchId || '0') < 1n) errors.push(error('AV-FISCAL-LIFECYCLE-SUBMISSION-BATCH', 'batchId', 'O lote deve possuir entre 1 e 15 dígitos.'));
      if (errors.length) return { ok: false, valid: false, persisted: false, reused: false, emission: null, attempt: null, errors };
      if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return unavailable();
      const at = text(input.at) || clock();
      const operation = { emissionId, operationType: 'transition', requestHash: requestHash({ companyId, emissionId, expectedVersion, action: 'begin_submission', accessKey, signedChecksum, batchId, publicPayload: payload.value }) };
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('operation', companyId, operationKey);
        const priorOperation = await tx.getOperation(companyId, operationKey);
        if (priorOperation) {
          const priorEmission = publicEmission(await tx.getEmission(priorOperation.emissionId));
          const priorAttempt = await tx.findTransmissionAttempt?.(companyId, operationKey);
          if (!matchesOperation(priorOperation, operation)) return { ok: false, valid: false, persisted: false, reused: false, emission: priorEmission, attempt: priorAttempt || null, errors: [error('AV-FISCAL-LIFECYCLE-IDEMPOTENCY-CONFLICT', 'operationKey', 'A chave idempotente já pertence a outra operação fiscal.')] };
          return { ok: true, valid: true, persisted: true, reused: true, emission: priorEmission, attempt: priorAttempt || null, errors: [] };
        }
        if (typeof tx.findTransmissionAttempt !== 'function' || typeof tx.insertTransmissionAttempt !== 'function' || typeof tx.findArtifact !== 'function') return { ok: false, valid: false, persisted: false, reused: false, emission: null, attempt: null, errors: [error('AV-FISCAL-LIFECYCLE-REPOSITORY', 'repository', 'O repositório fiscal não oferece registro transacional de tentativas.')] };
        const current = await tx.getEmission(emissionId, { forUpdate: true });
        if (!current || current.companyId !== companyId) return { ok: false, valid: false, persisted: false, reused: false, emission: null, attempt: null, errors: [error('AV-FISCAL-LIFECYCLE-NOT-FOUND', 'emissionId', 'A emissão fiscal não foi encontrada nesta empresa.')] };
        if (current.version !== expectedVersion) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), attempt: null, errors: [error('AV-FISCAL-LIFECYCLE-CONFLICT', 'expectedVersion', 'A emissão foi alterada por outro processo; recarregue o estado antes de continuar.')] };
        if (current.state !== 'signed' || current.accessKey !== accessKey || current.signedChecksum !== signedChecksum) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), attempt: null, errors: [error('AV-FISCAL-LIFECYCLE-SUBMISSION-STATE', 'state', 'Somente a versão assinada e íntegra da NF-e pode iniciar o envio.')] };
        const signedArtifact = await tx.findArtifact(companyId, emissionId, 'signed_xml');
        if (!signedArtifact || signedArtifact.checksum !== signedChecksum) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), attempt: null, errors: [error('AV-FISCAL-LIFECYCLE-SUBMISSION-ARTIFACT', 'artifact', 'O XML assinado imutável não está registrado para esta emissão.')] };
        const validation = validateTransition(current, 'submitted', { batchId, submittedAt: at });
        if (!validation.valid) throw Object.assign(new Error('A tentativa não corresponde ao ciclo da emissão.'), { code: 'AV-FISCAL-SUBMISSION-CONTRACT' });
        const attempt = await tx.insertTransmissionAttempt({ companyId, emissionId, operationKey, accessKey, signedChecksum, batchId, startedAt: at });
        if (!attempt) throw Object.assign(new Error('A tentativa de transmissão não foi registrada.'), { code: 'AV-FISCAL-SUBMISSION-ATTEMPT' });
        const next = { ...validation.next, version: current.version + 1, updatedAt: at };
        const updated = await tx.updateEmission(next, { expectedVersion: current.version });
        if (updated === false) throw Object.assign(new Error('A emissão mudou durante a abertura da tentativa.'), { code: '40001' });
        await tx.appendEvent({ emissionId, companyId, sequence: next.version, fromState: current.state, toState: next.state, eventType: 'emission.submitted', actorId: text(input.actorId) || null, publicPayload: { ...payload.value, batchId, attemptId: text(attempt.id), attemptNumber: Number(attempt.attemptNumber) }, occurredAt: at });
        await tx.insertOperation({ companyId, operationKey, ...operation, resultingVersion: next.version, createdAt: at });
        if (typeof tx.enqueueRecoveryJob === 'function') await tx.enqueueRecoveryJob({ companyId, emissionId, jobType: 'authorization_status', idempotencyKey: `lifecycle:${emissionId}:${next.version}:authorization_status`, maxAttempts: 8, availableAt: at, createdAt: at });
        return { ok: true, valid: true, persisted: true, reused: false, emission: publicEmission(next), attempt: copy(attempt), errors: [] };
      });
    },
    async commitAuthorization(input = {}) {
      const companyId = text(input.companyId);
      const emissionId = text(input.emissionId);
      const operationKey = text(input.operationKey);
      const expectedVersion = positiveInteger(input.expectedVersion);
      const accessKey = text(input.accessKey);
      const protocolNumber = text(input.protocolNumber);
      const authorizedAt = text(input.authorizedAt);
      const payload = safePublicPayload(input.publicPayload);
      const at = text(input.at) || clock();
      const normalizedArtifact = normalizeProtocolArtifact(input.artifact, companyId, emissionId, at);
      const errors = [...payload.errors, ...normalizedArtifact.errors];
      if (!companyId || !emissionId || !/^\d{44}$/.test(accessKey)) errors.push(error('AV-FISCAL-LIFECYCLE-AUTHORIZATION-TARGET', 'accessKey', 'Empresa, emissão e chave autorizada são obrigatórias.'));
      if (operationKey.length < 8 || operationKey.length > 120 || !expectedVersion) errors.push(error('AV-FISCAL-LIFECYCLE-AUTHORIZATION-OPERATION', 'operationKey', 'A autorização exige versão e chave idempotente válidas.'));
      if (!protocolNumber || !Number.isFinite(Date.parse(authorizedAt))) errors.push(error('AV-FISCAL-LIFECYCLE-AUTHORIZATION-PROTOCOL', 'protocolNumber', 'A autorização exige protocolo e data de recebimento válidos.'));
      if (errors.length) return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors };
      if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return unavailable();
      const artifact = normalizedArtifact.artifact;
      const operation = { emissionId, operationType: 'transition', requestHash: requestHash({ companyId, emissionId, expectedVersion, action: 'commit_authorization', accessKey, protocolNumber, authorizedAt, artifact, publicPayload: payload.value }) };
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('operation', companyId, operationKey);
        const priorOperation = await tx.getOperation(companyId, operationKey);
        if (priorOperation) {
          const priorEmission = publicEmission(await tx.getEmission(priorOperation.emissionId));
          const priorArtifact = await tx.findArtifact?.(companyId, priorOperation.emissionId, 'protocol_xml');
          if (!matchesOperation(priorOperation, operation)) return { ok: false, valid: false, persisted: false, reused: false, emission: priorEmission, artifact: priorArtifact || null, errors: [error('AV-FISCAL-LIFECYCLE-IDEMPOTENCY-CONFLICT', 'operationKey', 'A chave idempotente já pertence a outra operação fiscal.')] };
          return { ok: true, valid: true, persisted: true, reused: true, emission: priorEmission, artifact: priorArtifact || null, errors: [] };
        }
        const current = await tx.getEmission(emissionId, { forUpdate: true });
        if (!current || current.companyId !== companyId || current.accessKey !== accessKey) return { ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-NOT-FOUND', 'emissionId', 'A emissão autorizada não foi encontrada nesta empresa.')] };
        if (current.version !== expectedVersion) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-CONFLICT', 'expectedVersion', 'A emissão foi alterada; consulte novamente antes de confirmar a autorização.')] };
        if (!['submitted', 'processing'].includes(current.state)) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-TRANSITION', 'state', 'A autorização só pode concluir uma tentativa enviada ou em processamento.')] };
        await tx.lockKey?.('artifact', companyId, emissionId, 'protocol_xml');
        let registered = await tx.findArtifact(companyId, emissionId, 'protocol_xml');
        if (registered && !sameArtifact(registered, artifact)) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), artifact: registered, errors: [error('AV-FISCAL-LIFECYCLE-PROTOCOL-CONFLICT', 'artifact', 'Já existe outro protocolo registrado para esta emissão.')] };
        if (!registered) registered = await tx.insertArtifact(artifact);
        const validation = validateTransition(current, 'authorized', { statusCode: '100', statusReason: text(input.statusReason) || 'Autorizado o uso da NF-e', protocolNumber, authorizedAt });
        if (!validation.valid || !registered) throw Object.assign(new Error('A autorização não corresponde ao ciclo da emissão.'), { code: 'AV-FISCAL-AUTHORIZATION-CONTRACT' });
        const next = { ...validation.next, version: current.version + 1, updatedAt: at };
        const updated = await tx.updateEmission(next, { expectedVersion: current.version });
        if (updated === false) throw Object.assign(new Error('A emissão mudou durante a confirmação da autorização.'), { code: '40001' });
        await tx.appendEvent({ emissionId, companyId, sequence: next.version, fromState: current.state, toState: 'authorized', eventType: 'emission.authorized', actorId: text(input.actorId) || null, publicPayload: { ...payload.value, statusCode: '100', protocolNumber, artifactId: text(registered.id) }, occurredAt: at });
        await tx.insertOperation({ companyId, operationKey, ...operation, resultingVersion: next.version, createdAt: at });
        if (typeof tx.enqueueRecoveryJob === 'function') await tx.enqueueRecoveryJob({ companyId, emissionId, jobType: 'processed_artifact', idempotencyKey: `lifecycle:${emissionId}:${next.version}:processed_artifact`, maxAttempts: 8, availableAt: at, createdAt: at });
        return { ok: true, valid: true, persisted: true, reused: false, emission: publicEmission(next), artifact: copy(registered), errors: [] };
      });
    },
    commitProcessedArtifact(input = {}) {
      return commitStoredArtifact(input, {
        artifactType: 'processed_xml',
        contentType: 'application/xml',
        code: 'AV-FISCAL-LIFECYCLE-PROCESSED-ARTIFACT',
        message: 'A guarda fiscal exige o artefato processed_xml em application/xml.',
        action: 'commit_processed_artifact',
        fromState: 'authorized',
        toState: 'artifacts_stored',
        stateMessage: 'O XML autorizado só pode ser confirmado depois da autorização fiscal.',
        eventType: 'emission.processed_artifact.stored',
        patch: (artifact) => ({ processedStorageReference: artifact.storageReference, processedChecksum: artifact.checksum }),
      });
    },
    commitDanfeArtifact(input = {}) {
      return commitStoredArtifact(input, {
        artifactType: 'danfe_pdf',
        contentType: 'application/pdf',
        code: 'AV-FISCAL-LIFECYCLE-DANFE-ARTIFACT',
        message: 'A conclusão do DANFE exige o artefato danfe_pdf em application/pdf.',
        action: 'commit_danfe_artifact',
        fromState: 'artifacts_stored',
        toState: 'danfe_ready',
        stateMessage: 'O DANFE só pode ser confirmado depois da guarda do XML autorizado.',
        eventType: 'emission.danfe.stored',
        patch: (artifact) => ({ danfeStorageReference: artifact.storageReference, danfeChecksum: artifact.checksum }),
      });
    },
    commitCancellation(input = {}) {
      const cancellationProtocol = text(input.cancellationProtocol);
      const cancellationStatusCode = text(input.cancellationStatusCode);
      const canceledAt = text(input.canceledAt);
      const normalized = normalizeCancellationArtifact(input.artifact, text(input.companyId), text(input.emissionId), canceledAt || text(input.at) || clock());
      if (!/^\d{15,17}$/.test(cancellationProtocol) || !['135', '155'].includes(cancellationStatusCode) || !Number.isFinite(Date.parse(canceledAt))) {
        return Promise.resolve({ ok: false, valid: false, persisted: false, reused: false, emission: null, artifact: null, errors: [error('AV-FISCAL-LIFECYCLE-CANCELLATION', 'cancellationProtocol', 'O cancelamento exige protocolo, situação e data válidos do autorizador.')] });
      }
      if (!normalized.errors.length) input = { ...input, artifact: normalized.artifact };
      return commitStoredArtifact(input, {
        artifactType: 'cancellation_event_xml',
        contentType: 'application/xml',
        code: 'AV-FISCAL-LIFECYCLE-CANCELLATION-ARTIFACT',
        message: 'O cancelamento exige o evento processado em application/xml.',
        action: 'commit_cancellation',
        fromStates: ['authorized', 'artifacts_stored', 'danfe_ready'],
        toState: 'canceled',
        stateMessage: 'Somente uma NF-e autorizada pode receber o evento de cancelamento.',
        eventType: 'emission.canceled',
        patch: () => ({ cancellationProtocol, cancellationStatusCode, canceledAt }),
      });
    },
    async reserveNumber(input = {}) {
      const companyId = text(input.companyId);
      const emissionId = text(input.emissionId);
      const operationKey = text(input.operationKey);
      const expectedVersion = positiveInteger(input.expectedVersion);
      const payload = safePublicPayload(input.publicPayload);
      const errors = [...payload.errors];
      if (!companyId || !emissionId) errors.push(error('AV-FISCAL-LIFECYCLE-TARGET', 'emissionId', 'Empresa e emissão são obrigatórias.'));
      if (operationKey.length < 8 || operationKey.length > 120) errors.push(error('AV-FISCAL-LIFECYCLE-OPERATION', 'operationKey', 'A chave idempotente deve possuir de 8 a 120 caracteres.'));
      if (!expectedVersion) errors.push(error('AV-FISCAL-LIFECYCLE-VERSION', 'expectedVersion', 'Informe a versão esperada para impedir atualização concorrente.'));
      if (errors.length) return { ok: false, valid: false, persisted: false, reused: false, emission: null, errors };
      if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return unavailable();
      const at = text(input.at) || clock();
      const operation = {
        emissionId,
        operationType: 'transition',
        requestHash: requestHash({ companyId, emissionId, expectedVersion, action: 'reserve_number', publicPayload: payload.value }),
      };
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('operation', companyId, operationKey);
        const priorOperation = await tx.getOperation(companyId, operationKey);
        if (priorOperation) {
          const priorEmission = publicEmission(await tx.getEmission(priorOperation.emissionId));
          if (!matchesOperation(priorOperation, operation)) return { ok: false, valid: false, persisted: false, reused: false, emission: priorEmission, errors: [error('AV-FISCAL-LIFECYCLE-IDEMPOTENCY-CONFLICT', 'operationKey', 'A chave idempotente já pertence a outra operação fiscal.')] };
          return { ok: true, valid: true, persisted: true, reused: true, emission: priorEmission, errors: [] };
        }
        const current = await tx.getEmission(emissionId, { forUpdate: true });
        if (!current || current.companyId !== companyId) return { ok: false, valid: false, persisted: false, reused: false, emission: null, errors: [error('AV-FISCAL-LIFECYCLE-NOT-FOUND', 'emissionId', 'A emissão fiscal não foi encontrada nesta empresa.')] };
        if (current.version !== expectedVersion) return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), errors: [error('AV-FISCAL-LIFECYCLE-CONFLICT', 'expectedVersion', 'A emissão foi alterada por outro processo; recarregue o estado antes de continuar.')] };
        if (current.state !== 'prepared') return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), errors: [error('AV-FISCAL-LIFECYCLE-TRANSITION', 'state', 'A numeração só pode ser reservada depois da preparação fiscal aprovada.')] };
        if (typeof tx.reserveNextFiscalNumber !== 'function') return { ok: false, valid: false, persisted: false, reused: false, emission: publicEmission(current), errors: [error('AV-FISCAL-LIFECYCLE-REPOSITORY', 'repository', 'O repositório fiscal não oferece reserva transacional de numeração.')] };
        const reserved = await tx.reserveNextFiscalNumber({
          companyId,
          establishmentId: current.establishmentId,
          emissionId,
          documentType: current.documentType,
          idempotencyKey: operationKey,
          at,
        });
        const patch = {
          reservationId: reserved.reservation.id,
          series: reserved.reservation.series,
          number: reserved.reservation.number,
        };
        const validation = validateTransition(current, 'number_reserved', patch);
        if (!validation.valid) {
          throw Object.assign(new Error('A reserva retornou uma identificação fiscal incompatível com o ciclo da emissão.'), { code: 'AV-FISCAL-NUMBER-CONTRACT' });
        }
        const next = { ...validation.next, version: current.version + 1, updatedAt: at };
        const updated = await tx.updateEmission(next, { expectedVersion: current.version });
        if (updated === false) throw Object.assign(new Error('A emissão mudou durante a reserva fiscal.'), { code: '40001' });
        await tx.appendEvent({
          emissionId: next.id,
          companyId: next.companyId,
          sequence: next.version,
          fromState: current.state,
          toState: next.state,
          eventType: 'emission.number_reserved',
          actorId: text(input.actorId) || null,
          publicPayload: { ...payload.value, series: next.series, number: next.number },
          occurredAt: at,
        });
        await tx.insertOperation({ companyId, operationKey, ...operation, resultingVersion: next.version, createdAt: at });
        return { ok: true, valid: true, persisted: true, reused: false, emission: publicEmission(next), errors: [] };
      });
    },
  });
}

export function describeFiscalEmissionTransitions() {
  return copy(TRANSITIONS);
}
