export type IcpBrasilTrustAnchor = Readonly<{
  version: string;
  fingerprint256: string;
  validFrom: string;
  validTo: string;
  source: string;
}>;

export const ICP_BRASIL_TRUST_ANCHORS_REFERENCE: string;
export const ICP_BRASIL_CURRENT_BUNDLE_SHA512: string;
export const ICP_BRASIL_CURRENT_BUNDLE_URL: string;
export const ICP_BRASIL_CURRENT_BUNDLE_HASH_URL: string;
export const ICP_BRASIL_OFFICIAL_SIGNING_ROOTS: readonly IcpBrasilTrustAnchor[];
export function resolveIcpBrasilTrustedRootFingerprints(additional?: string | readonly string[], options?: { now?: Date }): readonly string[];

