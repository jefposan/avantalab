export const NFE_CANCELLATION_CONFIRMATION: 'CANCELAR_NFE_AUTORIZADA';
export function normalizeNfeCancellationJustification(value: unknown): string;
export function createDisabledNfeCancellationAdapter(): { id: string; configured: false; cancelProtected(input?: Record<string, any>): Promise<never> };
export function createPostgresCommercialNfeCancellationRepository(options?: { pool?: any }): any;
export function createCommercialNfeCancellationService(options?: Record<string, any>): { id: string; cancel(input?: Record<string, any>): Promise<Record<string, any>> };
