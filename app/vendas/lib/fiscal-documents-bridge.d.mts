export const FISCAL_DOCUMENTS_MESSAGE_TYPE: 'AVANTALAB_VENDAS_FISCAL_DOCUMENTS_V1';
export const STANDALONE_FISCAL_SAVE_REQUEST_TYPE: 'AVANTALAB_VENDAS_FISCAL_AVULSA_SAVE_V1';
export const STANDALONE_FISCAL_SAVE_RESPONSE_TYPE: 'AVANTALAB_VENDAS_FISCAL_AVULSA_SAVED_V1';
export type PersistedFiscalDocument = Readonly<Record<string, any>>;
export function parseFiscalDocumentsMessage(data: unknown): Readonly<{ companyId: string; documents: readonly PersistedFiscalDocument[] }> | null;
