export type FiscalDownloadRuntime = {
  configured: boolean;
  reason: string;
  accessResolver: null | { resolve(request: Request, input: { companyId: string }): Promise<object> };
  downloadService: null | { authorize(input: object): Promise<object> };
};
export function createFiscalDownloadRuntimeFromEnvironment(environment?: Record<string,string | undefined>): Promise<FiscalDownloadRuntime>;
export function getFiscalDownloadRuntime(): Promise<FiscalDownloadRuntime>;
