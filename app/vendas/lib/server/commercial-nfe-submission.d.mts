export const COMMERCIAL_NFE_SUBMISSION_REFERENCE: string;
export function deriveNfeLotId(operationKey: string, emissionId: string): string;
export function createPostgresCommercialNfeSubmissionRepository(options?: { pool?: any }): any;
export function createCommercialNfeSubmissionService(options?: Record<string, any>): { id: string; submit(input?: Record<string, any>): Promise<Record<string, any>> };
