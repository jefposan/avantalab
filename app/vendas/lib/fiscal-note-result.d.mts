import type { FiscalEmissionStatus, FiscalStatusArtifact } from './fiscal-status-bridge.mjs';
export function fiscalNoteResult(status?: FiscalEmissionStatus, fallbackState?: string): {authorized: boolean; canceled: boolean; rejected: boolean; pending: boolean; retryAvailable: boolean; tone: string; title: string; description: string; xml?: FiscalStatusArtifact; danfe?: FiscalStatusArtifact};
export function nfeStandardCancellationAvailability(status?: {state?: string; accessKey?: string; authorizedAt?: string}, now?: number): {allowed: boolean; reason: string};

export function nfePublicConsultationUrl(environment?: string): string;
