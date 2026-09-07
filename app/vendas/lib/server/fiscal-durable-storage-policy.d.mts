export type FiscalStorageError = { code: string; field: string; message: string };
export type FiscalDurableStorageConfiguration = {
  id?: string;
  environment?: string;
  provider?: string;
  configured?: boolean;
  privateAccess?: boolean;
  directBrowserAccess?: boolean;
  encryption?: { atRest?: boolean; inTransit?: boolean; mode?: 'provider_managed' | 'customer_managed' | string };
  immutability?: { versioning?: boolean; writeOnce?: boolean; checksumAlgorithm?: string };
  signedRead?: { enabled?: boolean; serverSideOnly?: boolean; maxTtlSeconds?: number };
  backup?: { enabled?: boolean; encrypted?: boolean; immutable?: boolean; separateFailureDomain?: boolean; restoreTestedAt?: string; maxRestoreTestAgeDays?: number };
  retention?: { enforced?: boolean; legalHoldSupported?: boolean };
};
export const FISCAL_DURABLE_STORAGE_POLICY_REFERENCE: '2026-09-03';
export const FISCAL_DOCUMENT_DOWNLOAD_PERMISSIONS: Readonly<{ processed_xml: 'fiscal.documents.xml.download'; danfe_pdf: 'fiscal.documents.danfe.download' }>;
export function validateFiscalDurableStorageConfiguration(input?: FiscalDurableStorageConfiguration, options?: { now?: string }): { valid: boolean; productionReady: boolean; configuration: Readonly<Record<string, string | number | boolean>>; errors: readonly FiscalStorageError[] };
export function evaluateNfeArtifactRetention(input?: { authorizedAt?: string; retainUntil?: string; legalHoldUntil?: string; indefiniteLegalHold?: boolean }, options?: { now?: string }): { valid: boolean; deletionAllowed: boolean; rule?: string; baselineUntil?: string; effectiveUntil?: string; indefiniteLegalHold?: boolean; requiresLegalReviewBeforeDeletion?: boolean; errors: FiscalStorageError[] };
