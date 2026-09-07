export type IcpBrasilRevocationEvidence = Readonly<{
  status: 'good' | 'revoked' | 'unknown';
  source: 'crl';
  verified: boolean;
  checkedAt: string;
  nextUpdate: string;
}>;

export const ICP_BRASIL_CRL_CHECKER_REFERENCE: string;
export function validateIcpBrasilCrlDistributionUrl(value: unknown): { valid: boolean; url: string };
export function extractIcpBrasilCrlDistributionUrls(certificatePem: string): readonly string[];
export function createIcpBrasilCrlRevocationChecker(options?: {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  maxBytes?: number;
  timeoutMs?: number;
}): Readonly<{
  id: string;
  reference: string;
  configured: boolean;
  check(input?: { certificatePem?: string; chainPem?: string[] }): Promise<IcpBrasilRevocationEvidence>;
}>;
