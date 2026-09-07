export const NFE_ISSUANCE_ORCHESTRATOR_REFERENCE: string;
export const NFE_ISSUANCE_ORCHESTRATOR_SCOPE: string;
export const NFE_ISSUANCE_ORCHESTRATOR_CONFIRMATION: string;

export function createNfeIssuanceOrchestrator(options?: {
  enabled?: boolean;
  environment?: string;
  scope?: string;
  confirmation?: string;
  activationToken?: string;
  automaticIssuanceService?: { continue?: (input?: Record<string, unknown>) => Promise<Record<string, unknown>> };
  recoveryWorker?: { runOnce?: (input?: Record<string, unknown>) => Promise<Record<string, unknown>> };
}): Readonly<{
  id: string;
  configured: boolean;
  environment: string;
  scope: string;
  reason: string;
  transmissionAllowed: boolean;
  continueProtected(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
  runRecoveryOnceProtected(input?: Record<string, unknown>): Promise<Record<string, unknown>>;
}>;
