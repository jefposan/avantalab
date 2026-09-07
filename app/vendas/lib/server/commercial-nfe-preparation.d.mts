export const COMMERCIAL_NFE_PREPARATION_REFERENCE: string;
export function buildCommercialNfePreparationInput(data: any, rules: any, idempotencyKey: string, issuedAt: string): any;
export function commercialNfeFiscalSnapshotDigest(data: any, rules: any, issuedAt: string): string;
export function createPostgresCommercialNfePreparationRepository(options?: { pool?: any }): any;
export function createCommercialNfePreparationService(options?: {
  repository?: any;
  emissionLifecycle?: any;
  fiscalRuleResolver?: any;
  preparationBuilder?: any;
  clock?: any;
}): any;
