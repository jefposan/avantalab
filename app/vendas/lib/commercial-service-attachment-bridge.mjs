export const SERVICE_ATTACHMENT_UPLOAD_REQUEST_TYPE = 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_UPLOAD_REQUEST_V1';
export const SERVICE_ATTACHMENT_UPLOAD_RESPONSE_TYPE = 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_UPLOAD_RESPONSE_V1';
export const SERVICE_ATTACHMENT_OPEN_REQUEST_TYPE = 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_OPEN_REQUEST_V1';
export const SERVICE_ATTACHMENT_OPEN_RESPONSE_TYPE = 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_OPEN_RESPONSE_V1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,140}$/;
const clean = (value) => String(value ?? '').trim();

export function createServiceAttachmentUploadRequest({ requestId, orderId, files } = {}) {
  const selected = Array.isArray(files) ? files.filter((file) => typeof File !== 'undefined' && file instanceof File) : [];
  if (!KEY.test(clean(requestId)) || !UUID.test(clean(orderId)) || !selected.length || selected.length > 5) return null;
  return { type: SERVICE_ATTACHMENT_UPLOAD_REQUEST_TYPE, requestId: clean(requestId), orderId: clean(orderId), files: selected };
}

export function createServiceAttachmentOpenRequest({ requestId, attachmentId } = {}) {
  if (!KEY.test(clean(requestId)) || !UUID.test(clean(attachmentId))) return null;
  return { type: SERVICE_ATTACHMENT_OPEN_REQUEST_TYPE, requestId: clean(requestId), attachmentId: clean(attachmentId) };
}

export function parseServiceAttachmentResponse(data) {
  if (!data || ![SERVICE_ATTACHMENT_UPLOAD_RESPONSE_TYPE, SERVICE_ATTACHMENT_OPEN_RESPONSE_TYPE].includes(data.type) || !KEY.test(clean(data.requestId)) || typeof data.ok !== 'boolean') return null;
  return { type: data.type, requestId: clean(data.requestId), ok: data.ok, message: clean(data.message), attachments: Array.isArray(data.attachments) ? data.attachments : [], url: clean(data.url) };
}
