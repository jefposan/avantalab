import type { FiscalEmissionStatus } from './fiscal-status-bridge.mjs';
export const FISCAL_CHECKOUT_REQUEST_TYPE: string;
export const FISCAL_CHECKOUT_RESPONSE_TYPE: string;
export function canResumeFiscalDraft(draft: {remoteState?: string} | null, remote?: {state?: string; authorized?: boolean}): boolean;
export function fiscalDraftForReview<T extends {status: string; remoteState?: string}>(draft: T, remote?: {state?: string; authorized?: boolean}): T;
export type FiscalCheckoutResult = {ok: boolean; message: string; draftId?: string; status?: FiscalEmissionStatus; emission?: {emissionId: string; state: string; version: number; series?: string; number?: number; authorized?: boolean; processing?: boolean}; code?: string; field?: string; numbering?: {exists: boolean; series: string; nextNumber: number | null; lastReservedNumber: number; version: number}};
