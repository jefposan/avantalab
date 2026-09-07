import type { FiscalMatrix } from './fiscal-matrix.mjs';

export type PublishedFiscalRulesConfiguration = Readonly<{
  status: 'publicada'; version: number; matrixVersion: string; matrix: FiscalMatrix;
  fiscalResponsible: string; reviewedAt: string; publishedAt: string;
  taxReviewConfirmed: boolean; taxReformReviewConfirmed: boolean;
}>;
export type FiscalRulesBridgeSnapshot = Readonly<{ available: boolean; writable: boolean; message: string; configuration: PublishedFiscalRulesConfiguration | null }>;
export const FISCAL_RULES_READY_TYPE: 'AVANTALAB_VENDAS_FISCAL_RULES_READY_V1';
export const FISCAL_RULES_SNAPSHOT_TYPE: 'AVANTALAB_VENDAS_FISCAL_RULES_SNAPSHOT_V1';
export const FISCAL_RULES_SAVE_REQUEST_TYPE: 'AVANTALAB_VENDAS_FISCAL_RULES_SAVE_REQUEST_V1';
export const FISCAL_RULES_SAVE_RESPONSE_TYPE: 'AVANTALAB_VENDAS_FISCAL_RULES_SAVE_RESPONSE_V1';
export function parseFiscalRulesSnapshot(value: unknown): FiscalRulesBridgeSnapshot | null;
export function createFiscalRulesSaveRequest(input?: { requestId?: unknown; expectedVersion?: unknown; matrix?: unknown; fiscalResponsible?: unknown; reviewedAt?: unknown; taxReviewConfirmed?: unknown; taxReformReviewConfirmed?: unknown }): Readonly<{ type: typeof FISCAL_RULES_SAVE_REQUEST_TYPE; requestId: string; expectedVersion: number; matrix: FiscalMatrix; fiscalResponsible: string; reviewedAt: string; taxReviewConfirmed: boolean; taxReformReviewConfirmed: boolean }> | null;
export function parseFiscalRulesSaveResponse(value: unknown): Readonly<{ requestId: string; ok: boolean; message: string; configuration: PublishedFiscalRulesConfiguration | null }> | null;
