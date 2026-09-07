export function nfeCancellationStorageKey(accessKey: unknown): string;
export function buildNfeCancellationArtifact(input?: { processedEventXml?: unknown; expectedAccessKey?: unknown }): Record<string, any>;
export function persistNfeCancellationArtifact(input?: { artifact?: any; provider?: any }): Promise<Record<string, any>>;
