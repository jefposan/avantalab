export type NfeCertificateInstallationContext = {
  authenticated?: boolean; authorized?: boolean; secureTransport?: boolean; serverImporterConfigured?: boolean;
  protectedStorageConfigured?: boolean; auditConfigured?: boolean;
};
export type NfeCertificateInstallationCheck = { id: string; label: string; detail: string; ready: boolean };
export const NFE_CERTIFICATE_INSTALLATION_REFERENCE: string;
export const NFE_CERTIFICATE_INSTALLATION_REQUIREMENTS: readonly Array<{ id: string; label: string; detail: string }>;
export function evaluateNfeCertificateInstallationReadiness(value?: NfeCertificateInstallationContext): {
  reference: string; checks: NfeCertificateInstallationCheck[]; readyCount: number; totalCount: number; infrastructureReady: boolean;
  canRenderSensitiveForm: boolean; canAcceptCertificate: boolean; passwordPersistenceAllowed: false; browserStorageAllowed: false;
  clientSidePkcs12ParsingAllowed: false; currentStatus: 'Pronto para integração formal' | 'Bloqueado neste protótipo';
};
