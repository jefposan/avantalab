export const FISCAL_EMISSION_STATUS_REFERENCE: string;
export function createFiscalEmissionStatusService(options?: { repository?: any; reconcile?: (input: {companyId: string; emissionId: string}) => Promise<unknown> }): {
  id: string;
  consult(input?: Record<string, any>): Promise<Record<string, any>>;
  get(input?: Record<string, any>): Promise<Record<string, any>>;
};
