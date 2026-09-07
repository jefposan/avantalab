import type { FiscalDocumentType } from './fiscal-issuer-routing.mjs';

export type FiscalNumberingSequence = { documentType: FiscalDocumentType; series: string; nextNumber: number; lastReservedNumber: number; active: boolean; updatedAt: string };
export type FiscalNumberReservation = { id: string; idempotencyKey: string; draftId: string; originId: string; documentType: FiscalDocumentType; series: string; number: number; status: 'reserved' | 'authorized' | 'void_pending' | 'voided'; reservedAt: string; updatedAt: string };
export type FiscalNumberVoidRequest = { id: string; documentType: FiscalDocumentType; series: string; startNumber: number; endNumber: number; reason: string; status: 'pending' | 'confirmed' | 'rejected'; protocol: string; requestedAt: string; updatedAt: string };
export type FiscalNumberingAudit = { id: string; at: string; actor: string; action: string; description: string };
export type FiscalNumberingLedger = { version: 1; sequences: FiscalNumberingSequence[]; reservations: FiscalNumberReservation[]; voidRequests: FiscalNumberVoidRequest[]; audit: FiscalNumberingAudit[] };
export type FiscalNumberingResult = { ok: boolean; error?: string; ledger: FiscalNumberingLedger; reused?: boolean; reservation?: FiscalNumberReservation; request?: FiscalNumberVoidRequest };

export const FISCAL_NUMBERING_DOCUMENTS: FiscalDocumentType[];
export function createFiscalNumberingLedger(seriesByDocument?: Partial<Record<FiscalDocumentType, string>>): FiscalNumberingLedger;
export function normalizeFiscalNumberingLedger(input: unknown, seriesByDocument?: Partial<Record<FiscalDocumentType, string>>): FiscalNumberingLedger;
export function validateFiscalNumberingLedger(input: unknown): { valid: boolean; errors: string[] };
export function peekNextFiscalNumber(input: unknown, options: { documentType: FiscalDocumentType; series?: string }): { ok: boolean; error?: string; documentType?: FiscalDocumentType; series?: string; number?: number; ledger: FiscalNumberingLedger };
export function configureFiscalSequence(input: unknown, options: { documentType: FiscalDocumentType; series: string; nextNumber: number; actor?: string; now?: string }): FiscalNumberingResult;
export function reserveFiscalNumber(input: unknown, options: { documentType: FiscalDocumentType; series?: string; draftId: string; originId?: string; idempotencyKey: string; actor?: string; now?: string }): FiscalNumberingResult;
export function requestFiscalNumberVoid(input: unknown, options: { documentType: FiscalDocumentType; series?: string; startNumber: number; endNumber: number; reason: string; actor?: string; now?: string }): FiscalNumberingResult;
export function confirmFiscalNumberVoid(input: unknown, options: { requestId: string; protocol: string; actor?: string; now?: string }): FiscalNumberingResult;
