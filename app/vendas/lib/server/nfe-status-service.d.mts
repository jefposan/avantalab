import type { NfeCertificateVaultDiagnostic } from './nfe-certificate-vault.mjs';

export type NfeStatusServiceError = { code: string; field: string; message: string };
export type NfeStatusServiceTransportRequest = {
  endpoint: string; action: string; contentType: string; body: string; secureCertificateReference: string;
  timeoutMs: number; maxResponseBytes: number; followRedirects: false;
};
export type NfeStatusServiceTransport = {
  id: string; configured: boolean;
  postSoap(request: NfeStatusServiceTransportRequest): Promise<{ body: string; status?: number }>;
};
export type NfeStatusServiceDiagnostic = {
  ok: true; valid: boolean; mode: 'diagnostico-status-sefaz'; environment: 'homologacao'; authority: 'SEFAZ/SP'; endpoint: string;
  endpointValidated: boolean; requestBuilt: boolean; certificateActive: boolean; mutualTlsReady: boolean; transportConfigured: boolean;
  networkAttempted: boolean; responseReceived: boolean; serviceOperational: boolean; cStat: string; xMotivo: string; receivedAt: string;
  latencyMs: number; sensitiveMaterialReturned: false; transmissionAttempted: false; errors: NfeStatusServiceError[]; warnings: string[];
};
export const NFE_STATUS_SERVICE_REFERENCE: string;
export const NFE_STATUS_SERVICE_ENDPOINT: string;
export const NFE_STATUS_SERVICE_ACTION: string;
export const NFE_STATUS_SERVICE_CONTENT_TYPE: string;
export const NFE_STATUS_SERVICE_RESPONSE_LIMIT: number;
export const NFE_STATUS_SERVICE_TIMEOUT_MS: number;
export function validateNfeStatusServiceEndpoint(endpoint: string): { valid: boolean; error: string };
export function buildNfeStatusServiceSoapRequest(): { endpoint: string; action: string; contentType: string; environment: 'homologacao'; stateCode: string; version: string; payload: string; envelope: string };
export function parseNfeStatusServiceSoapResponse(value: unknown): { valid: boolean; serviceOperational: boolean; environment: string; stateCode: string; version: string; cStat: string; xMotivo: string; receivedAt: string; errors: NfeStatusServiceError[] };
export function createDisabledNfeStatusServiceTransport(): NfeStatusServiceTransport;
export function createNfeStatusServiceAdapter(options?: {
  certificateAdapter?: { inspectBinding(input?: { secureReference?: string; expectedDocument?: string; expectedMode?: string }): Promise<NfeCertificateVaultDiagnostic> };
  transport?: NfeStatusServiceTransport; endpoint?: string; now?: () => number;
}): { id: string; checkAvailability(input?: { secureReference?: string; expectedDocument?: string; expectedMode?: string }): Promise<NfeStatusServiceDiagnostic> };
