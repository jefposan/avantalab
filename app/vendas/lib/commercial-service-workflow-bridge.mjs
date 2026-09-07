export const COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE = 'AVANTALAB_VENDAS_SERVICE_WORKFLOW_REQUEST_V1';
export const COMMERCIAL_SERVICE_WORKFLOW_RESPONSE_TYPE = 'AVANTALAB_VENDAS_SERVICE_WORKFLOW_RESPONSE_V1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,140}$/;
const ACTIONS = new Set(['start', 'complete', 'cancel', 'reverse']);
const clean = (value) => String(value ?? '').trim();

export function createCommercialServiceWorkflowRequest(input = {}) {
  const requestId = clean(input.requestId); const idempotencyKey = clean(input.idempotencyKey);
  const orderId = clean(input.orderId); const action = clean(input.action).toLowerCase();
  if (!KEY.test(requestId) || !KEY.test(idempotencyKey) || !UUID.test(orderId) || !ACTIONS.has(action)
    || !Number.isInteger(Number(input.expectedVersion)) || Number(input.expectedVersion) < 1) return null;
  return Object.freeze({ type: COMMERCIAL_SERVICE_WORKFLOW_REQUEST_TYPE, requestId, idempotencyKey,
    orderId, expectedVersion: Number(input.expectedVersion), action, localId: clean(input.localId), input: input.input || {} });
}

export function parseCommercialServiceWorkflowResponse(data) {
  if (!data || data.type !== COMMERCIAL_SERVICE_WORKFLOW_RESPONSE_TYPE || !KEY.test(clean(data.requestId)) || typeof data.ok !== 'boolean') return null;
  if (!data.ok) return Object.freeze({ requestId: clean(data.requestId), ok: false, message: clean(data.message) || 'Não foi possível atualizar a ordem de serviço.' });
  if (!data.result || !Number.isInteger(Number(data.result.operationVersion))) return null;
  return Object.freeze({ requestId: clean(data.requestId), ok: true, message: '', result: Object.freeze({ ...data.result, operationVersion: Number(data.result.operationVersion) }) });
}
