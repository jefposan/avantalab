export const FISCAL_EMISSION_STATUS_REFERENCE: string;
export function createFiscalEmissionStatusService(options?: { repository?: any }): {
  id: string;
  get(input?: Record<string, any>): Promise<Record<string, any>>;
};
