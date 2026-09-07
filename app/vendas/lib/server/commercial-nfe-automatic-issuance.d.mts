export function createCommercialNfeAutomaticIssuanceService(input?: {
  signingPreparationService?: { prepare(input: Record<string, unknown>): Promise<any> };
  signingService?: { sign(input: Record<string, unknown>): Promise<any> };
  submissionService?: { submit(input: Record<string, unknown>): Promise<any> };
  emissionStateResolver?: (input: Record<string, unknown>) => Promise<any>;
}): Readonly<{ id: string; continue(input?: Record<string, unknown>): Promise<any> }>;
