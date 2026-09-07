export const FISCAL_ARTIFACT_REGISTRY_REFERENCE: string;
export function createFiscalArtifactRegistry(options?: { repository?: any; clock?: () => string }): { id: string; register(input?: Record<string, any>): Promise<Record<string, any>> };
