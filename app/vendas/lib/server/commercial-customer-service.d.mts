import type { CommercialCustomerRecord } from './commercial-customer-repository.mjs';
export const COMMERCIAL_CUSTOMER_SERVICE_REFERENCE: string;
export function isValidCnpj(value: unknown): boolean;
export function normalizeCommercialCustomerInput(input?: Record<string, any>): { normalized: Record<string, any>; fiscalReady: boolean };
export function validateCommercialCustomerInput(input?: Record<string, any>): { valid: boolean; normalized: Record<string, any>; fiscalReady: boolean; errors: Array<{ code: string; field: string; message: string }>; warnings: Array<{ code: string; field: string; message: string }> };
export function createCommercialCustomerService(options?: { repository?: any }): {
  create(input?: Record<string, any>): Promise<{ ok: boolean; customer?: CommercialCustomerRecord; fiscalReady?: boolean; errors: any[]; warnings: any[] }>;
  update(input?: Record<string, any>): Promise<{ ok: boolean; customer?: CommercialCustomerRecord; fiscalReady?: boolean; errors: any[]; warnings: any[] }>;
  deactivate(input?: Record<string, any>): Promise<{ ok: boolean; customer?: CommercialCustomerRecord; errors: any[] }>;
  get(input?: Record<string, any>): Promise<{ ok: boolean; customer?: CommercialCustomerRecord | null; errors: any[] }>;
  list(input?: Record<string, any>): Promise<{ ok: boolean; customers: CommercialCustomerRecord[]; errors: any[] }>;
};
