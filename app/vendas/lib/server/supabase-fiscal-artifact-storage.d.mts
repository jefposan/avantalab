export const SUPABASE_FISCAL_ARTIFACT_STORAGE_REFERENCE: '2026-09-03';
export function createSupabaseFiscalArtifactStorage(options?: {
  client: Record<string, any>;
  bucket: string;
  environment?: 'local-lab' | 'homologacao' | 'production';
  productionReadiness?: { productionReady?: boolean };
  clock?: () => string;
}): {
  id: string;
  configured: true;
  environment: 'local-lab' | 'homologacao' | 'production';
  productionReady: boolean;
  readonly homologationReady: boolean;
  bucket: string;
  inspectReadiness(): Promise<Record<string, any>>;
  putImmutable(input?: Record<string, any>): Promise<Record<string, any>>;
  readVerified(input?: Record<string, any>): Promise<Record<string, any>>;
  readByReference(input?: Record<string, any>): Promise<Record<string, any>>;
  createReadGrant(input?: Record<string, any>): Promise<{ url: string; expiresAt: string }>;
};
