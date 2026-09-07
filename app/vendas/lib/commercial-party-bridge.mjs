export const CUSTOMER_READY_TYPE = 'AVANTALAB_VENDAS_CUSTOMER_READY_V1';
export const CUSTOMER_SNAPSHOT_TYPE = 'AVANTALAB_VENDAS_CUSTOMER_SNAPSHOT_V1';
export const CUSTOMER_SAVE_REQUEST_TYPE = 'AVANTALAB_VENDAS_CUSTOMER_SAVE_REQUEST_V1';
export const CUSTOMER_SAVE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_CUSTOMER_SAVE_RESPONSE_V1';
export const SUPPLIER_READY_TYPE = 'AVANTALAB_VENDAS_SUPPLIER_READY_V1';
export const SUPPLIER_SNAPSHOT_TYPE = 'AVANTALAB_VENDAS_SUPPLIER_SNAPSHOT_V1';
export const SUPPLIER_SAVE_REQUEST_TYPE = 'AVANTALAB_VENDAS_SUPPLIER_SAVE_REQUEST_V1';
export const SUPPLIER_SAVE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_SUPPLIER_SAVE_RESPONSE_V1';
export const OPERATION_SAVE_REQUEST_TYPE = 'AVANTALAB_VENDAS_OPERATION_SAVE_REQUEST_V1';
export const OPERATION_SAVE_RESPONSE_TYPE = 'AVANTALAB_VENDAS_OPERATION_SAVE_RESPONSE_V1';
export const OPERATION_READY_TYPE = 'AVANTALAB_VENDAS_OPERATION_READY_V1';
export const OPERATION_SNAPSHOT_TYPE = 'AVANTALAB_VENDAS_OPERATION_SNAPSHOT_V1';

const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const clean = (value) => String(value ?? '').trim();

export function parsePartySnapshot(data, type, key) {
  if (!data || data.type !== type || typeof data.ok !== 'boolean') return null;
  if (!data.ok) return { ok: false, message: clean(data.message), records: [] };
  if (!Array.isArray(data[key])) return null;
  return { ok: true, message: '', records: data[key].filter((record) => record && typeof record.id === 'string') };
}

export function parsePartySaveResponse(data, type) {
  if (!data || data.type !== type || !KEY.test(clean(data.requestId)) || typeof data.ok !== 'boolean') return null;
  return { requestId: clean(data.requestId), ok: data.ok, message: clean(data.message), record: data.customer || data.supplier || null };
}
