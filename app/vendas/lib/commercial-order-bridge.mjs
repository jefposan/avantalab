export const COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE = 'AVANTALAB_VENDAS_ORDER_WORKFLOW_REQUEST_V1';
export const COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE = 'AVANTALAB_VENDAS_ORDER_WORKFLOW_RESPONSE_V1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const TARGETS = new Set(['confirmado', 'em_separacao', 'faturado', 'cancelado', 'devolvido']);
const clean = (value) => String(value ?? '').trim();

export function createCommercialOrderWorkflowRequest(input = {}) {
  const requestId = clean(input.requestId);
  const persistenceKey = clean(input.persistenceKey);
  const target = clean(input.target).toLowerCase();
  const operationId = clean(input.operationId);
  if (!KEY.test(requestId) || !KEY.test(persistenceKey) || !TARGETS.has(target) || (operationId && !UUID.test(operationId))) return null;
  if ((!input.customer || typeof input.customer !== 'object') && !operationId) return null;
  if ((!input.order || typeof input.order !== 'object') && !operationId) return null;
  return Object.freeze({
    type: COMMERCIAL_ORDER_WORKFLOW_REQUEST_TYPE,
    requestId,
    persistenceKey,
    target,
    operationId,
    customer: input.customer || {},
    order: input.order || {},
  });
}

export function parseCommercialOrderWorkflowResponse(data) {
  if (!data || data.type !== COMMERCIAL_ORDER_WORKFLOW_RESPONSE_TYPE || !KEY.test(clean(data.requestId)) || typeof data.ok !== 'boolean') return null;
  if (!data.ok) return Object.freeze({ requestId: clean(data.requestId), ok: false, message: clean(data.message) || 'Não foi possível persistir o pedido.' });
  const order = data.order;
  if (!order || !UUID.test(clean(order.operationId)) || !Number.isInteger(Number(order.version)) || Number(order.version) < 1 || !TARGETS.has(clean(order.status))) return null;
  return Object.freeze({
    requestId: clean(data.requestId), ok: true, message: '', customerId: UUID.test(clean(data.customerId)) ? clean(data.customerId) : '',
    order: Object.freeze({
      operationId: clean(order.operationId), year: Number(order.year) || 0, number: Number(order.number) || 0,
      version: Number(order.version), status: clean(order.status), stockStatus: clean(order.stockStatus), fiscalStatus: clean(order.fiscalStatus),
      fiscalDraftId: UUID.test(clean(order.fiscalDraftId)) ? clean(order.fiscalDraftId) : '',
      fiscalDraftStatus: clean(order.fiscalDraftStatus), receivableCount: Math.max(0, Number(order.receivableCount) || 0), stockIntegrated: order.stockIntegrated === true,
    }),
  });
}
