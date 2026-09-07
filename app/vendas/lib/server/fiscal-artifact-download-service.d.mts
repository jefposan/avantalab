import type { AccessBoundary } from '../access-control.mjs';
export type FiscalArtifactType = 'processed_xml' | 'danfe_pdf';
export type FiscalArtifactDownloadResult = { ok: boolean; authorized: boolean; grantIssued: boolean; reason: string; download: null | { url: string; expiresAt: string; filename: string; contentType: string }; errors: Array<{ code: string; field: string; message: string }> };
export const FISCAL_ARTIFACT_DOWNLOAD_REFERENCE: '2026-09-03';
export function createFiscalArtifactDownloadService(options?: {
  repository?: { configured?: boolean; findArtifactForDownload?: (input: { companyId: string; artifactId: string; artifactType: FiscalArtifactType }) => Promise<Record<string, string> | null> };
  storageProvider?: { configured?: boolean; environment?: string; productionReady?: boolean; createReadGrant?: (input: Record<string, string | number>) => Promise<{ url: string; expiresAt: string }> };
  auditWriter?: { configured?: boolean; appendArtifactAccessEvent?: (event: Record<string, string>) => Promise<unknown> };
  clock?: () => string;
  maxTtlSeconds?: number;
}): { id: string; authorize(input?: { boundary?: Partial<AccessBoundary>; effectivePermissions?: Record<string, boolean>; artifactId?: string; artifactType?: FiscalArtifactType | string; ttlSeconds?: number }): Promise<FiscalArtifactDownloadResult> };
