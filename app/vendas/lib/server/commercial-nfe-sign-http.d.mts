export type CommercialNfeSignHttpRuntime = {
  configured?: boolean;
  accessResolver?: { resolve(request: Request, input: { companyId: string }): Promise<any> } | null;
  nfeSigningService?: { sign(input: Record<string, unknown>): Promise<any> } | null;
};

export function handleCommercialNfeSignRequest(input?: {
  request?: Request;
  runtime?: CommercialNfeSignHttpRuntime;
  companyId?: unknown;
  emissionId?: unknown;
}): Promise<Response>;
