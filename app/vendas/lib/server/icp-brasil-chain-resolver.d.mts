export type IcpBrasilResolvedCertificateChain = {
  resolved: boolean;
  chainPem: string[];
  source: 'provided' | 'official-bundle' | 'unavailable';
};

export type IcpBrasilCertificateChainResolver = {
  id: string;
  configured: boolean;
  resolve(input?: { certificatePem?: string; chainPem?: string[]; now?: Date }): Promise<IcpBrasilResolvedCertificateChain>;
};

export const ICP_BRASIL_CHAIN_RESOLVER_REFERENCE: string;
export function createIcpBrasilChainResolver(options?: {
  fetchImpl?: typeof fetch;
  bundleUrl?: string;
  expectedSha512?: string;
  trustedRootFingerprints?: string[];
  timeoutMs?: number;
  maxZipBytes?: number;
  maxExpandedBytes?: number;
}): IcpBrasilCertificateChainResolver;
