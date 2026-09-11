export type FiscalProfileDocument = 'nfe' | 'nfce' | 'nfse';
export type FiscalProfile = Readonly<{ documentScope: FiscalProfileDocument[]; defaultDocument: FiscalProfileDocument | 'nenhum'; environment: 'homologacao' | 'producao'; version: number; updatedAt: string }>;
export const FISCAL_PROFILE_READY_TYPE: 'AVANTALAB_VENDAS_FISCAL_PROFILE_READY_V1';
export const FISCAL_PROFILE_SNAPSHOT_TYPE: 'AVANTALAB_VENDAS_FISCAL_PROFILE_SNAPSHOT_V1';
export const FISCAL_PROFILE_SAVE_REQUEST_TYPE: 'AVANTALAB_VENDAS_FISCAL_PROFILE_SAVE_REQUEST_V1';
export const FISCAL_PROFILE_SAVE_RESPONSE_TYPE: 'AVANTALAB_VENDAS_FISCAL_PROFILE_SAVE_RESPONSE_V1';
export function parseFiscalProfileSnapshot(value: unknown): Readonly<{ available: boolean; writable: boolean; message: string; profile: FiscalProfile | null }> | null;
export function createFiscalProfileSaveRequest(input?: { requestId?: unknown; expectedVersion?: unknown; documentScope?: unknown; defaultDocument?: unknown; environment?: unknown }): Readonly<{ type: typeof FISCAL_PROFILE_SAVE_REQUEST_TYPE; requestId: string; expectedVersion: number; documentScope: FiscalProfileDocument[]; defaultDocument: FiscalProfileDocument; environment: 'homologacao' | 'producao' }> | null;
export function parseFiscalProfileSaveResponse(value: unknown): Readonly<{ requestId: string; ok: boolean; message: string; profile: FiscalProfile | null }> | null;
