import type { NfeA1SecretLoader } from './nfe-a1-certificate.mjs';
import type { NfeStatusServiceTransport, NfeStatusServiceTransportRequest } from './nfe-status-service.mjs';

export const NFE_A1_MTLS_STATUS_TRANSPORT_REFERENCE: string;
export function createNfeA1MtlsStatusTransport(options?: {
  secretLoader?: NfeA1SecretLoader;
  chainResolver?: { configured: boolean; resolve(input: { certificatePem: string; chainPem: string[]; now: Date }): Promise<{ resolved: boolean; chainPem: string[] }> };
  requestImpl?: (...args: any[]) => any;
  identityPreparer?: (input: { pkcs12: Buffer; passphrase: string; chainResolver: NonNullable<Parameters<typeof createNfeA1MtlsStatusTransport>[0]>['chainResolver'] }) => Promise<Buffer>;
}): NfeStatusServiceTransport & {
  postSoap(request: NfeStatusServiceTransportRequest): Promise<{ body: string; status: number }>;
};
