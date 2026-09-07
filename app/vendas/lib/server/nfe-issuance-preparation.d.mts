export type NfeIssuancePreparationError = { code: string; field: string; message: string };
export type NfeIssuancePreparation = {
  ok: boolean; valid: boolean; mode: 'preparacao-emissao-sem-reserva'; environment: 'homologacao'; reference: string;
  preparationId: string; documentType: 'nfe'; draftId: string; originId: string; series: string; candidateNumber: number; technicalNumericCode: string;
  numberPreviouslyReserved: boolean; numberReservationAttempted: false; numberingMutated: false; accessKeyPreview: string;
  preXmlBuilt: boolean; schemaValidationExecuted: boolean; schemaValid: boolean; documentReadyForSecureConnector: boolean;
  certificateInspected: false; statusServiceChecked: false; signatureAttempted: false; authorizationAttempted: false;
  transmissionAttempted: false; readyForExternalHomologation: false; errors: NfeIssuancePreparationError[]; warnings: string[];
  steps: Array<{ id: string; label: string; state: 'ready' | 'waiting' | 'blocked' }>;
};

export const NFE_ISSUANCE_PREPARATION_REFERENCE: string;
export function deriveNfeNumericCode(attemptKey: string, draftId: string, issuerDocument: string): string;
export function buildNfeIssuancePreparation(options?: { draft?: Record<string, any>; client?: Record<string, any>; config?: Record<string, any>; numberingLedger?: unknown; attemptKey?: string; issuedAt?: string }): Promise<NfeIssuancePreparation>;
