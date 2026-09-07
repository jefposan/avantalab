export const NFE_A1_MTLS_RETURN_TRANSPORT_REFERENCE: string;

export function createNfeA1MtlsReturnTransport(options?: {
  secretLoader?: { configured?: boolean; load?: (reference: string) => Promise<{ pkcs12: Buffer | Uint8Array; passphrase: string }> };
  chainResolver?: { configured?: boolean; resolve?: (...args: unknown[]) => Promise<unknown> };
  requestImpl?: (...args: unknown[]) => unknown;
  identityPreparer?: (options: { pkcs12: Buffer; passphrase: string; chainResolver: unknown }) => Promise<Buffer>;
}): Readonly<{
  id: string;
  configured: boolean;
  postSoap(request?: Record<string, unknown>): Promise<{ status: number; body: string }>;
}>;
