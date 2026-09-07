export const NFE_DANFE_REFERENCE: string;
export const NFE_DANFE_MAX_ITEMS: number;
export function nfeDanfeFileName(accessKey: unknown): string;
export function buildNfeDanfe(options?: { processedXml?: string; expectedAccessKey?: string; sampleMode?: boolean }): { valid: boolean; errors: Array<{ code: string; field: string; message: string }>; pdf: Uint8Array; fileName: string; pageCount: number; accessKey: string; protocolNumber?: string; sampleMode: boolean; xmlReturned: false };
