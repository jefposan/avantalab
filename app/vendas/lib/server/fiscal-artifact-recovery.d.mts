export const FISCAL_ARTIFACT_RECOVERY_REFERENCE: string;
export function createFiscalArtifactRecoveryHandlers(options?: { repository?: any; storageProvider?: any; returnAdapter?: any; certificateBindingResolver?: (...args: any[]) => any; issuerDocumentResolver?: (...args: any[]) => any; internalErrorReporter?: (...args: any[]) => any; clock?: () => string }): {
  authorization_status(job?: Record<string, any>): Promise<Record<string, any>>;
  receipt_status(job?: Record<string, any>): Promise<Record<string, any>>;
  processed_artifact(job?: Record<string, any>): Promise<Record<string, any>>;
  danfe_generation(job?: Record<string, any>): Promise<Record<string, any>>;
};
