export type FiscalDocumentType = 'nfe' | 'nfce' | 'nfse';
export type FiscalWorkflowState = 'ready' | 'pending' | 'blocked' | 'planned';
export type FiscalDocumentProfile = {
  type: FiscalDocumentType;
  label: string;
  model: string;
  authority: string;
  payload: string;
  primaryDocument: string;
  auxiliaryDocument: string;
  technicalReferences: readonly string[];
  requiredCatalogFields: readonly string[];
  events: readonly string[];
};
export const FISCAL_REFERENCE_DATE: '2026-08-28';
export const fiscalDocumentProfiles: Readonly<Record<FiscalDocumentType, FiscalDocumentProfile>>;
export function getFiscalDocumentProfile(documentType: FiscalDocumentType): FiscalDocumentProfile;
export function buildFiscalWorkflow(input: {
  documentType: FiscalDocumentType;
  draftReady?: boolean;
  taxReviewConfirmed?: boolean;
  taxReformReviewConfirmed?: boolean;
  authorityDefined?: boolean;
  certificateReady?: boolean;
  providerReady?: boolean;
}): {
  profile: FiscalDocumentProfile;
  transmissionReady: boolean;
  steps: Array<{ id: string; label: string; detail: string; state: FiscalWorkflowState }>;
};
