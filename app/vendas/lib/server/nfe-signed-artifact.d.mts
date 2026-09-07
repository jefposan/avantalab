export const NFE_SIGNED_ARTIFACT_REFERENCE: string;
export function nfeSignedStorageKey(accessKey: string): string;
export function buildSignedNfeArtifact(input?: { signedXml?: string; expectedAccessKey?: string; expectedIssuerDocument?: string }): Promise<Record<string, any>>;
export function persistSignedNfeArtifact(input?: { artifact?: Record<string, any>; provider?: any }): Promise<Record<string, any>>;
