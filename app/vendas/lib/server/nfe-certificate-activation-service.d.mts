export const NFE_CERTIFICATE_ACTIVATION_SERVICE_REFERENCE: string;
export function createNfeCertificateActivationService(options?: { repository?: any; issuerResolver?: (input: { companyId: string }) => Promise<Record<string, any>>; certificateAdapter?: any; availabilityService?: any; now?: () => Date }): {
  id: string;
  activate(input?: { context?: Record<string, any>; certificateId?: string }): Promise<{ ok: boolean; result?: Readonly<{ status: 'pending_validation' | 'active'; certificateInstalled: true; certificateActive: boolean; validationChecked: boolean; blockers: readonly string[]; fiscalConnectionChecked?: boolean; fiscalConnectionAvailable?: boolean; summary: Record<string, any> | null }>; errors: Array<{ code: string; field: string; message: string }> }>;
};
