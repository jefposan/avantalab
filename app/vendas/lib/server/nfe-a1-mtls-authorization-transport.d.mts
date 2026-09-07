import type { NfeA1SecretLoader } from './nfe-a1-certificate.mjs';

export const NFE_A1_MTLS_AUTHORIZATION_TRANSPORT_REFERENCE: string;
export function createNfeA1MtlsAuthorizationTransport(options?: {
  secretLoader?: NfeA1SecretLoader;
  chainResolver?: { configured: boolean; resolve(input: { certificatePem: string; chainPem: string[]; now: Date }): Promise<{ resolved: boolean; chainPem: string[] }> };
  requestImpl?: (...args: any[]) => any;
  identityPreparer?: (input: { pkcs12: Buffer; passphrase: string; chainResolver: any }) => Promise<Buffer>;
}): {
  id: string;
  configured: boolean;
  postSoap(request: Record<string, any>): Promise<{ body: string; status: number }>;
};
