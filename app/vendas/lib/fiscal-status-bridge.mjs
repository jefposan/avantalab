const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const FISCAL_STATUS_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_STATUS_REQUEST_V1';
export const FISCAL_STATUS_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_STATUS_RESPONSE_V1';
export const FISCAL_DOWNLOAD_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_DOWNLOAD_REQUEST_V1';
export const FISCAL_DOWNLOAD_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_DOWNLOAD_RESPONSE_V1';
export const FISCAL_PREPARE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_PREPARE_REQUEST_V1';
export const FISCAL_PREPARE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_PREPARE_RESPONSE_V1';
export const FISCAL_VALIDATE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_VALIDATE_REQUEST_V1';
export const FISCAL_VALIDATE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_VALIDATE_RESPONSE_V1';
export const FISCAL_NUMBER_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_NUMBER_REQUEST_V1';
export const FISCAL_NUMBER_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_NUMBER_RESPONSE_V1';
export const FISCAL_SIGNING_READINESS_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_SIGNING_READINESS_REQUEST_V1';
export const FISCAL_SIGNING_READINESS_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_SIGNING_READINESS_RESPONSE_V1';
export const FISCAL_SIGN_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_SIGN_REQUEST_V1';
export const FISCAL_SIGN_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_SIGN_RESPONSE_V1';
export const FISCAL_ISSUE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_ISSUE_REQUEST_V1';
export const FISCAL_ISSUE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_ISSUE_RESPONSE_V1';
export const FISCAL_CORRECTION_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CORRECTION_REQUEST_V1';
export const FISCAL_CORRECTION_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CORRECTION_RESPONSE_V1';
export const FISCAL_CANCELLATION_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CANCELLATION_REQUEST_V1';
export const FISCAL_CANCELLATION_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CANCELLATION_RESPONSE_V1';
export const FISCAL_CERTIFICATE_STATUS_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_STATUS_REQUEST_V1';
export const FISCAL_CERTIFICATE_STATUS_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_STATUS_RESPONSE_V1';
export const FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_INSTALL_REQUEST_V1';
export const FISCAL_CERTIFICATE_INSTALL_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_INSTALL_RESPONSE_V1';
export const FISCAL_CERTIFICATE_ACTIVATE_REQUEST_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_ACTIVATE_REQUEST_V1';
export const FISCAL_CERTIFICATE_ACTIVATE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_FISCAL_CERTIFICATE_ACTIVATE_RESPONSE_V1';

const ARTIFACT_TYPES = new Set(['processed_xml', 'danfe_pdf']);
const SUCCESS_STATES = new Set(['authorized', 'artifacts_stored', 'danfe_ready']);
const DANGER_STATES = new Set(['rejected', 'failed', 'canceled']);
const PROCESSING_STATES = new Set(['number_reserved', 'signed', 'submitted', 'processing']);

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
function integer(value) { const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0; }
function requestId(value) { const normalized = text(value); return /^[A-Za-z0-9:_-]{8,120}$/.test(normalized) ? normalized : ''; }

export function createFiscalStatusRequest({ requestId: id, emissionId } = {}) {
  const safeRequestId = requestId(id);
  const safeEmissionId = text(emissionId);
  if (!safeRequestId || !UUID_PATTERN.test(safeEmissionId)) return null;
  return Object.freeze({ type: FISCAL_STATUS_REQUEST_TYPE, requestId: safeRequestId, emissionId: safeEmissionId });
}

export function createFiscalDownloadRequest({ requestId: id, artifactId, artifactType } = {}) {
  const safeRequestId = requestId(id);
  const safeArtifactId = text(artifactId);
  const safeArtifactType = text(artifactType);
  if (!safeRequestId || !UUID_PATTERN.test(safeArtifactId) || !ARTIFACT_TYPES.has(safeArtifactType)) return null;
  return Object.freeze({ type: FISCAL_DOWNLOAD_REQUEST_TYPE, requestId: safeRequestId, artifactId: safeArtifactId, artifactType: safeArtifactType });
}

export function createFiscalPrepareRequest({ requestId: id, draftId } = {}) {
  const safeRequestId = requestId(id);
  const safeDraftId = text(draftId);
  if (!safeRequestId || !UUID_PATTERN.test(safeDraftId)) return null;
  return Object.freeze({ type: FISCAL_PREPARE_REQUEST_TYPE, requestId: safeRequestId, draftId: safeDraftId });
}

export function createFiscalValidateRequest({ requestId: id, draftId } = {}) {
  const safeRequestId = requestId(id);
  const safeDraftId = text(draftId);
  if (!safeRequestId || !UUID_PATTERN.test(safeDraftId)) return null;
  return Object.freeze({ type: FISCAL_VALIDATE_REQUEST_TYPE, requestId: safeRequestId, draftId: safeDraftId });
}

export function createFiscalNumberRequest({ requestId: id, emissionId, expectedVersion } = {}) {
  const safeRequestId = requestId(id);
  const safeEmissionId = text(emissionId);
  const safeExpectedVersion = Number(expectedVersion);
  if (!safeRequestId || !UUID_PATTERN.test(safeEmissionId)
    || !Number.isSafeInteger(safeExpectedVersion) || safeExpectedVersion < 1) return null;
  return Object.freeze({
    type: FISCAL_NUMBER_REQUEST_TYPE,
    requestId: safeRequestId,
    emissionId: safeEmissionId,
    expectedVersion: safeExpectedVersion,
  });
}

export function createFiscalSigningReadinessRequest({ requestId: id, emissionId, expectedVersion } = {}) {
  const safeRequestId = requestId(id);
  const safeEmissionId = text(emissionId);
  const safeExpectedVersion = Number(expectedVersion);
  if (!safeRequestId || !UUID_PATTERN.test(safeEmissionId)
    || !Number.isSafeInteger(safeExpectedVersion) || safeExpectedVersion < 1) return null;
  return Object.freeze({
    type: FISCAL_SIGNING_READINESS_REQUEST_TYPE,
    requestId: safeRequestId,
    emissionId: safeEmissionId,
    expectedVersion: safeExpectedVersion,
  });
}

export function createFiscalSignRequest({ requestId: id, emissionId, expectedVersion } = {}) {
  const safeRequestId = requestId(id);
  const safeEmissionId = text(emissionId);
  const safeExpectedVersion = Number(expectedVersion);
  if (!safeRequestId || !UUID_PATTERN.test(safeEmissionId)
    || !Number.isSafeInteger(safeExpectedVersion) || safeExpectedVersion < 1) return null;
  return Object.freeze({
    type: FISCAL_SIGN_REQUEST_TYPE,
    requestId: safeRequestId,
    emissionId: safeEmissionId,
    expectedVersion: safeExpectedVersion,
  });
}

export function createFiscalIssueRequest({ requestId: id, emissionId, expectedVersion } = {}) {
  const safeRequestId = requestId(id);
  const safeEmissionId = text(emissionId);
  const safeExpectedVersion = Number(expectedVersion);
  if (!safeRequestId || !UUID_PATTERN.test(safeEmissionId)
    || !Number.isSafeInteger(safeExpectedVersion) || safeExpectedVersion < 1) return null;
  return Object.freeze({ type: FISCAL_ISSUE_REQUEST_TYPE, requestId: safeRequestId, emissionId: safeEmissionId, expectedVersion: safeExpectedVersion });
}

export function createFiscalCorrectionRequest({ requestId: id, emissionId, expectedVersion, rejectedStatusCode, items } = {}) {
  const safeRequestId = requestId(id);
  const safeEmissionId = text(emissionId);
  const safeExpectedVersion = Number(expectedVersion);
  const safeStatusCode = text(rejectedStatusCode);
  if (!safeRequestId || !UUID_PATTERN.test(safeEmissionId)
    || !Number.isSafeInteger(safeExpectedVersion) || safeExpectedVersion < 1
    || !/^\d{3}$/.test(safeStatusCode) || !Array.isArray(items) || !items.length || items.length > 200) return null;
  const safeItems = items.map((item) => ({
    sku: text(item?.sku).slice(0, 80),
    ncm: text(item?.ncm).replace(/\D/g, '').slice(0, 8),
  }));
  if (safeItems.some((item) => !item.sku || !/^\d{8}$/.test(item.ncm) || /^0{8}$/.test(item.ncm))) return null;
  return Object.freeze({
    type: FISCAL_CORRECTION_REQUEST_TYPE,
    requestId: safeRequestId,
    emissionId: safeEmissionId,
    expectedVersion: safeExpectedVersion,
    rejectedStatusCode: safeStatusCode,
    items: Object.freeze(safeItems.map(Object.freeze)),
  });
}

export function createFiscalCancellationRequest({ requestId: id, emissionId, expectedVersion, justification } = {}) {
  const safeRequestId = requestId(id);
  const safeEmissionId = text(emissionId);
  const safeExpectedVersion = Number(expectedVersion);
  const safeJustification = text(justification).replace(/\s+/g, ' ');
  if (!safeRequestId || !UUID_PATTERN.test(safeEmissionId)
    || !Number.isSafeInteger(safeExpectedVersion) || safeExpectedVersion < 1
    || safeJustification.length < 15 || safeJustification.length > 255) return null;
  return Object.freeze({
    type: FISCAL_CANCELLATION_REQUEST_TYPE,
    requestId: safeRequestId,
    emissionId: safeEmissionId,
    expectedVersion: safeExpectedVersion,
    justification: safeJustification,
  });
}

export function createFiscalCertificateStatusRequest({ requestId: id } = {}) {
  const safeRequestId = requestId(id);
  return safeRequestId ? Object.freeze({ type: FISCAL_CERTIFICATE_STATUS_REQUEST_TYPE, requestId: safeRequestId }) : null;
}

export function createFiscalCertificateInstallRequest({ requestId: id, certificate, passphrase } = {}) {
  const safeRequestId = requestId(id);
  const safePassphrase = typeof passphrase === 'string' ? passphrase : '';
  const validFile = certificate && typeof certificate.name === 'string' && /\.(?:pfx|p12)$/i.test(certificate.name)
    && Number.isFinite(certificate.size) && certificate.size > 0 && certificate.size <= 5 * 1024 * 1024;
  if (!safeRequestId || !validFile || !safePassphrase || safePassphrase.length > 256) return null;
  return Object.freeze({ type: FISCAL_CERTIFICATE_INSTALL_REQUEST_TYPE, requestId: safeRequestId, certificate, passphrase: safePassphrase });
}

export function createFiscalCertificateActivateRequest({ requestId: id } = {}) {
  const safeRequestId = requestId(id);
  return safeRequestId ? Object.freeze({ type: FISCAL_CERTIFICATE_ACTIVATE_REQUEST_TYPE, requestId: safeRequestId }) : null;
}

function normalizeFiscalCertificate(value) {
  const status = text(value?.status);
  if (!['unavailable', 'pending_validation', 'active'].includes(status)
    || value?.sensitiveMaterialReturned !== false) return null;
  const installed = status !== 'unavailable';
  if (value?.certificateInstalled !== installed || value?.certificateActive !== (status === 'active')) return null;
  const blockers = Array.isArray(value?.blockers)
    ? value.blockers.map(text).filter((code) => /^AV-NFE-[A-Z0-9-]{3,80}$/.test(code)).slice(0, 12)
    : [];
  return Object.freeze({
    status,
    mode: text(value?.mode),
    validFrom: text(value?.validFrom),
    validTo: text(value?.validTo),
    installedAt: text(value?.installedAt),
    fingerprintEnding: text(value?.fingerprintEnding).replace(/[^A-F0-9]/gi, '').slice(-12).toUpperCase(),
    certificateInstalled: installed,
    certificateActive: status === 'active',
    fiscalConnectionChecked: value?.fiscalConnectionChecked === true,
    fiscalConnectionAvailable: value?.fiscalConnectionAvailable === true,
    validationChecked: value?.validationChecked === true,
    validationCheckedAt: text(value?.validationCheckedAt),
    blockers: Object.freeze(blockers),
    sensitiveMaterialReturned: false,
    originalPasswordStored: value?.originalPasswordStored === false ? false : undefined,
  });
}

function normalizeFiscalExecution(value) {
  if (!value || text(value.environment) !== 'homologacao' || value.productionTransmissionAllowed !== false) return null;
  return Object.freeze({
    environment: 'homologacao',
    statusOnly: value.statusOnly === true,
    workflowEnabled: value.workflowEnabled === true,
    durableStorageReady: value.durableStorageReady === true,
    certificateRuntimeReady: value.certificateRuntimeReady === true,
    statusServiceReady: value.statusServiceReady === true,
    authorizationReady: value.authorizationReady === true,
    returnServiceReady: value.returnServiceReady === true,
    orchestratorReady: value.orchestratorReady === true,
    transmissionAllowed: value.transmissionAllowed === true,
    productionTransmissionAllowed: false,
  });
}

export function parseFiscalCertificateStatusResponse(data) {
  if (!data || data.type !== FISCAL_CERTIFICATE_STATUS_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível consultar o certificado digital.' });
  const certificate = normalizeFiscalCertificate(data.certificate);
  return certificate ? Object.freeze({ requestId: id, ok: true, message: text(data.message), certificate, execution: normalizeFiscalExecution(data.execution) }) : null;
}

export function parseFiscalCertificateInstallResponse(data) {
  if (!data || data.type !== FISCAL_CERTIFICATE_INSTALL_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível instalar o certificado digital.' });
  const certificate = normalizeFiscalCertificate(data.certificate);
  return certificate ? Object.freeze({ requestId: id, ok: true, message: text(data.message) || 'Certificado instalado.', certificate, execution: normalizeFiscalExecution(data.execution) }) : null;
}

export function parseFiscalCertificateActivateResponse(data) {
  if (!data || data.type !== FISCAL_CERTIFICATE_ACTIVATE_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível verificar o certificado digital.' });
  const certificate = normalizeFiscalCertificate(data.certificate);
  return certificate ? Object.freeze({ requestId: id, ok: true, message: text(data.message) || 'Verificação concluída.', certificate, execution: normalizeFiscalExecution(data.execution) }) : null;
}

function normalizeArtifact(value) {
  const id = text(value?.id);
  const artifactType = text(value?.artifactType);
  if (!UUID_PATTERN.test(id) || !ARTIFACT_TYPES.has(artifactType) || value?.available !== true) return null;
  return Object.freeze({ id, artifactType, available: true });
}

export function normalizeFiscalEmissionStatus(value) {
  const id = text(value?.id);
  if (!UUID_PATTERN.test(id)) return null;
  const artifacts = Array.isArray(value?.artifacts) ? value.artifacts.map(normalizeArtifact).filter(Boolean) : [];
  const needsTechnicalAttention = value?.needsTechnicalAttention === true;
  const state = text(value?.state);
  const action = needsTechnicalAttention
    ? { required: true, kind: 'review_emission', label: 'Revisar emissão', message: 'A confirmação automática não foi concluída. Revise a emissão antes de continuar.' }
    : state === 'rejected'
      ? { required: true, kind: 'review_fiscal_data', label: 'Revisar dados fiscais', message: 'A nota foi rejeitada. Corrija os dados indicados antes de uma nova tentativa.' }
      : { required: false, kind: '', label: '', message: '' };
  return Object.freeze({
    id,
    version: Math.max(1, integer(value?.version)),
    documentType: text(value?.documentType),
    model: text(value?.model),
    environment: text(value?.environment),
    state,
    stateLabel: text(value?.stateLabel) || 'Situação fiscal',
    series: text(value?.series),
    number: integer(value?.number),
    accessKey: /^[0-9]{44}$/.test(text(value?.accessKey)) ? text(value.accessKey) : '',
    statusCode: text(value?.statusCode),
    statusReason: text(value?.statusReason),
    protocolNumber: text(value?.protocolNumber),
    canceledAt: text(value?.canceledAt),
    cancellationProtocol: text(value?.cancellationProtocol),
    cancellationStatusCode: text(value?.cancellationStatusCode),
    updatedAt: text(value?.updatedAt),
    authorized: value?.authorized === true,
    finalDocumentReady: value?.finalDocumentReady === true,
    recoveryPending: value?.recoveryPending === true,
    needsTechnicalAttention,
    actionRequired: action.required,
    recommendedAction: action.kind,
    recommendedActionLabel: action.label,
    recommendedActionMessage: action.message,
    artifacts: Object.freeze(artifacts),
  });
}

export function parseFiscalCancellationResponse(data) {
  if (!data || data.type !== FISCAL_CANCELLATION_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível cancelar a NF-e.' });
  const emissionId = text(data.emission?.emissionId);
  const version = Number(data.emission?.version);
  const series = text(data.emission?.series);
  const number = Number(data.emission?.number);
  const cancellationStatusCode = text(data.emission?.cancellationStatusCode);
  const cancellationProtocol = text(data.emission?.cancellationProtocol);
  const canceledAt = text(data.emission?.canceledAt);
  if (!UUID_PATTERN.test(emissionId) || text(data.emission?.state) !== 'canceled'
    || !Number.isSafeInteger(version) || version < 1 || !series || !Number.isSafeInteger(number) || number < 1
    || !['135', '155'].includes(cancellationStatusCode) || !/^\d{15,17}$/.test(cancellationProtocol)
    || !Number.isFinite(new Date(canceledAt).getTime()) || data.emission?.canceled !== true
    || data.emission?.eventStored !== true || data.emission?.transmitted !== true
    || data.emission?.originalAuthorizationPreserved !== true
    || data.emission?.externalContentReturned !== false || data.emission?.sensitiveMaterialReturned !== false) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({ emissionId, state: 'canceled', version, series, number,
      cancellationStatusCode, cancellationProtocol, canceledAt, canceled: true, eventStored: true,
      transmitted: true, originalAuthorizationPreserved: true, externalContentReturned: false, sensitiveMaterialReturned: false }),
  });
}

export function parseFiscalNumberResponse(data) {
  if (!data || data.type !== FISCAL_NUMBER_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível confirmar a numeração da NF-e.' });
  const emissionId = text(data.emission?.emissionId);
  const draftId = text(data.emission?.draftId);
  const orderId = text(data.emission?.orderId);
  const version = Number(data.emission?.version);
  const series = text(data.emission?.series);
  const number = Number(data.emission?.number);
  if (![emissionId, draftId, orderId].every((value) => UUID_PATTERN.test(value))
    || emissionId !== draftId || text(data.emission?.documentType) !== 'nfe'
    || text(data.emission?.model) !== '55' || text(data.emission?.environment) !== 'homologacao'
    || text(data.emission?.state) !== 'number_reserved' || !Number.isSafeInteger(version) || version < 2
    || !series || !Number.isSafeInteger(number) || number < 1
    || data.emission?.numberReserved !== true || data.emission?.certificateInspected !== false
    || data.emission?.signed !== false || data.emission?.transmitted !== false) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({
      emissionId, draftId, orderId, documentType: 'nfe', model: '55', environment: 'homologacao',
      state: 'number_reserved', version, series, number, reused: data.emission?.reused === true,
      numberReserved: true, certificateInspected: false, signed: false, transmitted: false,
    }),
  });
}

export function parseFiscalSigningReadinessResponse(data) {
  if (!data || data.type !== FISCAL_SIGNING_READINESS_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível preparar a próxima etapa da NF-e.' });
  const emissionId = text(data.emission?.emissionId);
  const draftId = text(data.emission?.draftId);
  const orderId = text(data.emission?.orderId);
  const version = Number(data.emission?.version);
  const series = text(data.emission?.series);
  const number = Number(data.emission?.number);
  if (![emissionId, draftId, orderId].every((value) => UUID_PATTERN.test(value))
    || emissionId !== draftId || text(data.emission?.documentType) !== 'nfe'
    || text(data.emission?.model) !== '55' || text(data.emission?.environment) !== 'homologacao'
    || text(data.emission?.state) !== 'number_reserved' || !Number.isSafeInteger(version) || version < 3
    || !series || !Number.isSafeInteger(number) || number < 1
    || data.emission?.documentReadyForA1Signature !== true || data.emission?.schemaValid !== true
    || data.emission?.realCertificateInspected !== false || data.emission?.realSignatureAttempted !== false
    || data.emission?.signed !== false || data.emission?.persisted !== false || data.emission?.transmitted !== false
    || data.emission?.xmlReturned !== false || data.emission?.sensitiveMaterialReturned !== false) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({
      emissionId, draftId, orderId, documentType: 'nfe', model: '55', environment: 'homologacao',
      state: 'number_reserved', version, series, number, documentReadyForA1Signature: true,
      schemaValid: true, realCertificateInspected: false, realSignatureAttempted: false,
      signed: false, persisted: false, transmitted: false, xmlReturned: false, sensitiveMaterialReturned: false,
    }),
  });
}

export function parseFiscalSignResponse(data) {
  if (!data || data.type !== FISCAL_SIGN_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível assinar a NF-e.' });
  const emissionId = text(data.emission?.emissionId);
  const version = Number(data.emission?.version);
  const series = text(data.emission?.series);
  const number = Number(data.emission?.number);
  if (!UUID_PATTERN.test(emissionId) || text(data.emission?.documentType) !== 'nfe'
    || text(data.emission?.model) !== '55' || text(data.emission?.environment) !== 'homologacao'
    || text(data.emission?.state) !== 'signed' || !Number.isSafeInteger(version) || version < 2
    || !series || !Number.isSafeInteger(number) || number < 1
    || data.emission?.signed !== true || data.emission?.persisted !== true
    || data.emission?.artifactRegistered !== true || data.emission?.realCertificateInspected !== true
    || data.emission?.signatureVerified !== true || data.emission?.signedXsdValid !== true
    || data.emission?.transmitted !== false || data.emission?.signedContentReturned !== false
    || data.emission?.sensitiveMaterialReturned !== false) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({
      emissionId, documentType: 'nfe', model: '55', environment: 'homologacao', state: 'signed',
      version, series, number, signed: true, persisted: true, artifactRegistered: true,
      realCertificateInspected: true, signatureVerified: true, signedXsdValid: true,
      transmitted: false, signedContentReturned: false, sensitiveMaterialReturned: false,
    }),
  });
}

export function parseFiscalIssueResponse(data) {
  if (!data || data.type !== FISCAL_ISSUE_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível continuar a emissão da NF-e.' });
  const emissionId = text(data.emission?.emissionId);
  const state = text(data.emission?.state);
  const version = Number(data.emission?.version);
  const series = text(data.emission?.series);
  const number = Number(data.emission?.number);
  if (!UUID_PATTERN.test(emissionId) || text(data.emission?.documentType) !== 'nfe'
    || text(data.emission?.model) !== '55' || text(data.emission?.environment) !== 'homologacao'
    || !['authorized', 'processing', 'rejected'].includes(state) || !Number.isSafeInteger(version) || version < 2
    || !series || !Number.isSafeInteger(number) || number < 1 || data.emission?.signed !== true
    || data.emission?.persisted !== true || data.emission?.submitted !== true || data.emission?.transmitted !== true
    || data.emission?.externalContentReturned !== false || data.emission?.sensitiveMaterialReturned !== false) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({
      emissionId, documentType: 'nfe', model: '55', environment: 'homologacao', state, version, series, number,
      signed: true, persisted: true, submitted: true, transmitted: true,
      authorized: data.emission?.authorized === true, processing: data.emission?.processing === true,
      rejected: data.emission?.rejected === true, statusCode: text(data.emission?.statusCode),
      statusReason: text(data.emission?.statusReason), protocolStored: data.emission?.protocolStored === true,
      receiptConsultationPending: data.emission?.receiptConsultationPending === true,
      externalContentReturned: false, sensitiveMaterialReturned: false,
    }),
  });
}

export function parseFiscalCorrectionResponse(data) {
  if (!data || data.type !== FISCAL_CORRECTION_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível revisar os dados fiscais da NF-e.' });
  const emissionId = text(data.emission?.emissionId);
  const draftId = text(data.emission?.draftId);
  const orderId = text(data.emission?.orderId);
  const version = Number(data.emission?.version);
  const series = text(data.emission?.series);
  const number = Number(data.emission?.number);
  if (![emissionId, draftId, orderId].every((value) => UUID_PATTERN.test(value))
    || emissionId !== draftId || text(data.emission?.state) !== 'number_reserved'
    || !Number.isSafeInteger(version) || version < 2 || !series || !Number.isSafeInteger(number) || number < 1
    || data.emission?.correctionPrepared !== true || data.emission?.sameNumberPreserved !== true
    || data.emission?.previousAttemptPreserved !== true || data.emission?.requiresNewSignature !== true
    || data.emission?.automaticTransmission !== false || data.emission?.certificateInspected !== false
    || data.emission?.signed !== false || data.emission?.transmitted !== false) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({
      emissionId, draftId, orderId, state: 'number_reserved', version, series, number,
      correctionRevision: integer(data.emission?.correctionRevision), correctionPrepared: true,
      sameNumberPreserved: true, previousAttemptPreserved: true, requiresNewSignature: true,
      automaticTransmission: false, certificateInspected: false, signed: false, transmitted: false,
    }),
  });
}

export function parseFiscalStatusResponse(data) {
  if (!data || data.type !== FISCAL_STATUS_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível atualizar a situação fiscal.' });
  const emission = normalizeFiscalEmissionStatus(data.emission);
  return emission ? Object.freeze({ requestId: id, ok: true, emission }) : null;
}

export function parseFiscalDownloadResponse(data) {
  if (!data || data.type !== FISCAL_DOWNLOAD_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível preparar o arquivo fiscal.' });
  const url = text(data.download?.url);
  const expiresAt = text(data.download?.expiresAt);
  const filename = text(data.download?.filename).replace(/[\\/:*?"<>|]/g, '-').slice(0, 180);
  const contentType = text(data.download?.contentType);
  if (!/^https:\/\//i.test(url) || !filename || !['application/xml', 'application/pdf'].includes(contentType) || !Number.isFinite(new Date(expiresAt).getTime())) return null;
  return Object.freeze({ requestId: id, ok: true, download: Object.freeze({ url, expiresAt, filename, contentType }) });
}

export function parseFiscalPrepareResponse(data) {
  if (!data || data.type !== FISCAL_PREPARE_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível preparar a emissão fiscal.' });
  const emissionId = text(data.emission?.emissionId);
  const draftId = text(data.emission?.draftId);
  const orderId = text(data.emission?.orderId);
  const documentType = text(data.emission?.documentType);
  const model = text(data.emission?.model);
  const environment = text(data.emission?.environment);
  const state = text(data.emission?.state);
  const version = Number(data.emission?.version);
  if (![emissionId, draftId, orderId].every((value) => UUID_PATTERN.test(value))
    || emissionId !== draftId || documentType !== 'nfe' || model !== '55'
    || environment !== 'homologacao' || !state || !Number.isSafeInteger(version) || version < 1) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({ emissionId, draftId, orderId, documentType, model, environment, state, version, reused: data.emission?.reused === true }),
  });
}

export function parseFiscalValidateResponse(data) {
  if (!data || data.type !== FISCAL_VALIDATE_RESPONSE_TYPE) return null;
  const id = requestId(data.requestId);
  if (!id) return null;
  if (data.ok !== true) return Object.freeze({ requestId: id, ok: false, message: text(data.message) || 'Não foi possível validar os dados fiscais da NF-e.' });
  const emissionId = text(data.emission?.emissionId);
  const draftId = text(data.emission?.draftId);
  const orderId = text(data.emission?.orderId);
  const version = Number(data.emission?.version);
  const candidateNumber = integer(data.emission?.candidateNumber);
  if (![emissionId, draftId, orderId].every((value) => UUID_PATTERN.test(value))
    || emissionId !== draftId || text(data.emission?.documentType) !== 'nfe'
    || text(data.emission?.model) !== '55' || text(data.emission?.environment) !== 'homologacao'
    || text(data.emission?.state) !== 'prepared' || !Number.isSafeInteger(version) || version < 2
    || data.emission?.schemaValid !== true || data.emission?.numberReserved !== false
    || data.emission?.certificateInspected !== false || data.emission?.signed !== false
    || data.emission?.transmitted !== false) return null;
  return Object.freeze({
    requestId: id,
    ok: true,
    emission: Object.freeze({
      emissionId, draftId, orderId, documentType: 'nfe', model: '55', environment: 'homologacao',
      state: 'prepared', version, reused: data.emission?.reused === true,
      schemaValid: true, candidateSeries: text(data.emission?.candidateSeries), candidateNumber,
      numberReserved: false, certificateInspected: false, signed: false, transmitted: false,
    }),
  });
}

export function fiscalStatusPresentation(status) {
  const state = text(status?.state);
  const tone = SUCCESS_STATES.has(state) ? 'success' : DANGER_STATES.has(state) ? 'danger' : PROCESSING_STATES.has(state) ? 'info' : 'warning';
  const detail = state === 'canceled'
    ? `Cancelamento confirmado${text(status?.cancellationProtocol) ? ` · protocolo ${text(status.cancellationProtocol)}` : ''}`
    : status?.actionRequired
    ? text(status?.recommendedActionMessage) || 'Revise a emissão antes de continuar'
    : status?.recoveryPending
      ? 'Documentos finais sendo preparados'
      : status?.finalDocumentReady
        ? 'XML e DANFE disponíveis'
        : status?.authorized
          ? 'Autorização confirmada'
          : text(status?.statusReason) || 'Aguardando atualização';
  return Object.freeze({ label: text(status?.stateLabel) || 'Situação fiscal', tone, detail });
}
