export const COMMERCIAL_NFE_SIGNING_REFERENCE: string;
export function createCommercialNfeSigningService(options?: Record<string, any>): { id: string; sign(input?: Record<string, any>): Promise<Record<string, any>> };
