import type { CommercialOperationRecord } from './commercial-operation-repository.mjs';
export const COMMERCIAL_OPERATION_SERVICE_REFERENCE: string;
export function createCommercialOperationService(options?: { repository?: any; customerResolver?: any; catalogResolver?: any }): {
  create(input?: Record<string, any>): Promise<{ ok: boolean; operation?: CommercialOperationRecord; reused?: boolean; errors: any[]; warnings: any[] }>;
  update(input?: Record<string, any>): Promise<{ ok: boolean; operation?: CommercialOperationRecord; errors: any[]; warnings: any[] }>;
  convertQuoteToOrder(input?: Record<string, any>): Promise<{ ok: boolean; operation?: CommercialOperationRecord; reused?: boolean; errors: any[] }>;
  get(input?: Record<string, any>): Promise<{ ok: boolean; operation?: CommercialOperationRecord | null; errors: any[] }>;
  list(input?: Record<string, any>): Promise<{ ok: boolean; operations: CommercialOperationRecord[]; errors: any[] }>;
};
