import { normalizeFiscalMatrix } from './fiscal-matrix.mjs';

const READY = 'AVANTALAB_VENDAS_FISCAL_RULES_READY_V1';
const SNAPSHOT = 'AVANTALAB_VENDAS_FISCAL_RULES_SNAPSHOT_V1';
const SAVE_REQUEST = 'AVANTALAB_VENDAS_FISCAL_RULES_SAVE_REQUEST_V1';
const SAVE_RESPONSE = 'AVANTALAB_VENDAS_FISCAL_RULES_SAVE_RESPONSE_V1';
const REQUEST_ID = /^[A-Za-z0-9:_-]{8,120}$/;
const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);

function configuration(value) {
  if (!value || typeof value !== 'object' || value.status !== 'publicada') return null;
  const version = Number(value.version);
  const matrix = normalizeFiscalMatrix(value.matrix);
  if (!Number.isInteger(version) || version < 1 || !matrix.rules.length || matrix.rules.length > 100) return null;
  return Object.freeze({
    status: 'publicada',
    version,
    matrixVersion: text(value.matrixVersion, 40),
    matrix,
    fiscalResponsible: text(value.fiscalResponsible, 160),
    reviewedAt: text(value.reviewedAt, 40),
    publishedAt: text(value.publishedAt, 40),
    taxReviewConfirmed: value.taxReviewConfirmed === true,
    taxReformReviewConfirmed: value.taxReformReviewConfirmed === true,
  });
}

export function parseFiscalRulesSnapshot(value) {
  if (!value || value.type !== SNAPSHOT || !value.snapshot || typeof value.snapshot !== 'object') return null;
  const published = value.snapshot.configuration == null ? null : configuration(value.snapshot.configuration);
  if (value.snapshot.configuration != null && !published) return null;
  return Object.freeze({
    available: value.snapshot.available === true,
    writable: value.snapshot.available === true && value.snapshot.writable === true,
    message: text(value.snapshot.message, 500),
    configuration: published,
  });
}

export function createFiscalRulesSaveRequest(input = {}) {
  const requestId = text(input.requestId, 120);
  const expectedVersion = Number(input.expectedVersion);
  const matrix = normalizeFiscalMatrix(input.matrix);
  if (!REQUEST_ID.test(requestId) || !Number.isInteger(expectedVersion) || expectedVersion < 0
    || !matrix.rules.length || matrix.rules.length > 100) return null;
  return Object.freeze({
    type: SAVE_REQUEST,
    requestId,
    expectedVersion,
    matrix,
    fiscalResponsible: text(input.fiscalResponsible || matrix.reviewedBy, 160),
    reviewedAt: text(input.reviewedAt || matrix.reviewedAt, 40),
    taxReviewConfirmed: input.taxReviewConfirmed === true,
    taxReformReviewConfirmed: input.taxReformReviewConfirmed === true,
  });
}

export function parseFiscalRulesSaveResponse(value) {
  if (!value || value.type !== SAVE_RESPONSE || !REQUEST_ID.test(text(value.requestId, 120)) || typeof value.ok !== 'boolean') return null;
  const published = value.configuration == null ? null : configuration(value.configuration);
  if (value.ok && !published) return null;
  return Object.freeze({ requestId: text(value.requestId, 120), ok: value.ok, message: text(value.message, 500), configuration: published });
}

export const FISCAL_RULES_READY_TYPE = READY;
export const FISCAL_RULES_SNAPSHOT_TYPE = SNAPSHOT;
export const FISCAL_RULES_SAVE_REQUEST_TYPE = SAVE_REQUEST;
export const FISCAL_RULES_SAVE_RESPONSE_TYPE = SAVE_RESPONSE;
