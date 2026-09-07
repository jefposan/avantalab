export const NFE_DANFE_ARTIFACT_REFERENCE: string;
export function nfeDanfeStorageKey(accessKey: unknown): string;
export function buildNfeDanfeArtifact(options?: { danfe?: Record<string, any> }): Record<string, any>;
export function persistNfeDanfeArtifact(options?: { artifact?: any; provider?: any; auditWriter?: (entry: Record<string, any>) => unknown | Promise<unknown> }): Promise<Record<string, any>>;
