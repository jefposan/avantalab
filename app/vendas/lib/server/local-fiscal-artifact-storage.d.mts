export const LOCAL_FISCAL_ARTIFACT_STORAGE_REFERENCE: string;
export function createLocalFiscalArtifactStorage(options?: { rootDirectory?: string; clock?: () => string }): {
  id: string;
  configured: true;
  environment: 'local-lab';
  findByAccessKey(input?: Record<string, any>): Promise<Record<string, any> | null>;
  putImmutable(input?: Record<string, any>): Promise<Record<string, any>>;
  readVerified(input?: Record<string, any>): Promise<Record<string, any>>;
  readByReference(input?: Record<string, any>): Promise<Record<string, any>>;
  inspect(input?: Record<string, any>): Promise<Record<string, any> | null>;
};
