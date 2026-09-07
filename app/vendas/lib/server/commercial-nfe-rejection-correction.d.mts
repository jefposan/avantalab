export const COMMERCIAL_NFE_REJECTION_CORRECTION_REFERENCE: string;
export const NFE_REJECTION_CORRECTION_CONFIRMATION: string;
export function createPostgresCommercialNfeRejectionCorrectionRepository(options?: { pool?: any }): any;
export function createCommercialNfeRejectionCorrectionService(options?: { repository?: any; emissionLifecycle?: any; fiscalRuleResolver?: any; preparationBuilder?: any; clock?: () => string }): any;
