const READY = 'AVANTALAB_VENDAS_FISCAL_PROFILE_READY_V1';
const SNAPSHOT = 'AVANTALAB_VENDAS_FISCAL_PROFILE_SNAPSHOT_V1';
const SAVE_REQUEST = 'AVANTALAB_VENDAS_FISCAL_PROFILE_SAVE_REQUEST_V1';
const SAVE_RESPONSE = 'AVANTALAB_VENDAS_FISCAL_PROFILE_SAVE_RESPONSE_V1';
const REQUEST_ID = /^[A-Za-z0-9:_-]{8,120}$/;
const DOCUMENTS = ['nfe', 'nfce', 'nfse'];
const text = (value, max = 500) => String(value ?? '').trim().slice(0, max);

function profile(value) {
  if (!value || typeof value !== 'object') return null;
  const documentScope = [...new Set((Array.isArray(value.documentScope) ? value.documentScope : []).filter((item) => DOCUMENTS.includes(item)))];
  const version = Number(value.version);
  const environment = value.environment === 'producao' ? 'producao' : 'homologacao';
  const defaultDocument = documentScope.includes(value.defaultDocument) ? value.defaultDocument : documentScope[0] || 'nenhum';
  if (!documentScope.length || !Number.isInteger(version) || version < 1) return null;
  return Object.freeze({ documentScope, defaultDocument, environment, version, updatedAt: text(value.updatedAt, 40) });
}

export function parseFiscalProfileSnapshot(value) {
  if (!value || value.type !== SNAPSHOT || !value.snapshot || typeof value.snapshot !== 'object') return null;
  const persisted = value.snapshot.profile == null ? null : profile(value.snapshot.profile);
  if (value.snapshot.profile != null && !persisted) return null;
  return Object.freeze({
    available: value.snapshot.available === true,
    writable: value.snapshot.available === true && value.snapshot.writable === true,
    message: text(value.snapshot.message),
    profile: persisted,
  });
}

export function createFiscalProfileSaveRequest(input = {}) {
  const requestId = text(input.requestId, 120);
  const expectedVersion = Number(input.expectedVersion);
  const requestedScope = Array.isArray(input.documentScope) ? input.documentScope : [];
  const documentScope = [...new Set(requestedScope.filter((item) => DOCUMENTS.includes(item)))];
  const environment = input.environment === 'producao' ? 'producao' : 'homologacao';
  const defaultDocument = documentScope.includes(input.defaultDocument) ? input.defaultDocument : documentScope[0];
  if (!REQUEST_ID.test(requestId) || !Number.isInteger(expectedVersion) || expectedVersion < 0 || !documentScope.length) return null;
  if (requestedScope.some((item) => !DOCUMENTS.includes(item)) || (input.defaultDocument && !documentScope.includes(input.defaultDocument))) return null;
  return Object.freeze({ type: SAVE_REQUEST, requestId, expectedVersion, documentScope, defaultDocument, environment });
}

export function parseFiscalProfileSaveResponse(value) {
  if (!value || value.type !== SAVE_RESPONSE || !REQUEST_ID.test(text(value.requestId, 120)) || typeof value.ok !== 'boolean') return null;
  const persisted = value.profile == null ? null : profile(value.profile);
  if (value.ok && !persisted) return null;
  return Object.freeze({ requestId: text(value.requestId, 120), ok: value.ok, message: text(value.message), profile: persisted });
}

export const FISCAL_PROFILE_READY_TYPE = READY;
export const FISCAL_PROFILE_SNAPSHOT_TYPE = SNAPSHOT;
export const FISCAL_PROFILE_SAVE_REQUEST_TYPE = SAVE_REQUEST;
export const FISCAL_PROFILE_SAVE_RESPONSE_TYPE = SAVE_RESPONSE;
