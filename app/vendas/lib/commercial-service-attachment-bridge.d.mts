export const SERVICE_ATTACHMENT_UPLOAD_REQUEST_TYPE: 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_UPLOAD_REQUEST_V1';
export const SERVICE_ATTACHMENT_UPLOAD_RESPONSE_TYPE: 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_UPLOAD_RESPONSE_V1';
export const SERVICE_ATTACHMENT_OPEN_REQUEST_TYPE: 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_OPEN_REQUEST_V1';
export const SERVICE_ATTACHMENT_OPEN_RESPONSE_TYPE: 'AVANTALAB_VENDAS_SERVICE_ATTACHMENT_OPEN_RESPONSE_V1';
export function createServiceAttachmentUploadRequest(input?: Record<string, any>): Record<string, any> | null;
export function createServiceAttachmentOpenRequest(input?: Record<string, any>): Record<string, any> | null;
export function parseServiceAttachmentResponse(data: unknown): Record<string, any> | null;
