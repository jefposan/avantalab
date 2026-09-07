export const NFE_PROCESSED_ARTIFACT_REFERENCE: string;
export function nfeProcessedStorageKey(accessKey: unknown): string;
export function buildProcessedNfeArtifact(options?: { signedXml?: string; protocolXml?: string; expectedAccessKey?: string }): Record<string, any>;
export function createDisabledNfeArtifactStorage(): { id: string; configured: false; findByAccessKey(): Promise<null>; putImmutable(): Promise<never> };
export function persistProcessedNfeArtifact(options?: { artifact?: any; provider?: any; auditWriter?: (entry: Record<string, any>) => unknown | Promise<unknown> }): Promise<Record<string, any>>;
