export const NFE_CERTIFICATE_INSTALLATION_SERVICE_REFERENCE: string;
export function createNfeCertificateInstallationService(options?: { repository?: any; issuerResolver?: (input: { companyId: string }) => Promise<Record<string, any>>; activationService?: any; prepareForStorage?: (...args: any[]) => any; now?: () => Date; idGenerator?: () => string }): {
  id: string;
  status(input?: { context?: Record<string, any> }): Promise<{ ok: boolean; result?: Record<string, any>; errors: Array<{ code: string; field: string; message: string }> }>;
  install(input?: { context?: Record<string, any>; pkcs12?: Buffer | Uint8Array; passphrase?: string }): Promise<{ ok: boolean; result?: Record<string, any>; errors: Array<{ code: string; field: string; message: string }> }>;
};
