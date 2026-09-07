export const FISCAL_DOCUMENTS_MESSAGE_TYPE: 'AVANTALAB_VENDAS_FISCAL_DOCUMENTS_V1';
export type PersistedFiscalDocument = Readonly<Record<string, any>>;
export function parseFiscalDocumentsMessage(data: unknown): Readonly<{ companyId: string; documents: readonly PersistedFiscalDocument[] }> | null;
