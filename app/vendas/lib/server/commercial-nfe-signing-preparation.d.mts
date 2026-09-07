export const COMMERCIAL_NFE_SIGNING_PREPARATION_REFERENCE: string;
export function validateCommercialNfeSigningSource(data: any, expectedVersion: number): Record<string, any> | null;
export function reconstructCommercialNfeSigningDocument(options?: Record<string, any>): Promise<Record<string, any>>;
export function createPostgresCommercialNfeSigningPreparationRepository(options?: { pool?: any }): any;
export function createCommercialNfeSigningPreparationService(options?: {
  repository?: any;
  fiscalRuleResolver?: any;
  schemaValidator?: any;
  signatureLab?: any;
}): any;
