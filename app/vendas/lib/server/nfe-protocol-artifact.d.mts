export const NFE_PROTOCOL_ARTIFACT_REFERENCE: string;
export function nfeProtocolStorageKey(accessKey: string): string;
export function buildNfeProtocolArtifact(input?: Record<string, any>): Record<string, any>;
export function persistNfeProtocolArtifact(input?: Record<string, any>): Promise<Record<string, any>>;
