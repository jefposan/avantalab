export const NFE_CERTIFICATE_PROTECTED_STORAGE_REFERENCE: string;
export type NfeCertificateSealedPayload = Readonly<{ reference: string; keyId: string; iv: Buffer; authTag: Buffer; encryptedPayload: Buffer }>;
export function createNfeCertificateEnvelopeCipher(options?: { key?: string | Buffer | Uint8Array; keyId?: string }): {
  id: string; keyId: string;
  seal(input?: { companyId?: string; certificateId?: string; pkcs12?: Buffer | Uint8Array; passphrase?: string }): NfeCertificateSealedPayload;
  open(input?: Partial<NfeCertificateSealedPayload>): { pkcs12: Buffer; passphrase: string };
};
export function createPostgresNfeCertificateProtectedRepository(options?: { pool?: any; cipher?: any }): {
  configured: true;
  install(input?: { companyId?: string; certificateId?: string; actorId?: string; pkcs12?: Buffer | Uint8Array; passphrase?: string; metadata?: Record<string, any> }): Promise<{ summary: Record<string, any> | null; reference: string; replaced: boolean }>;
  getActiveSummary(input?: { companyId?: string }): Promise<Record<string, any> | null>;
  getActiveBinding(input?: { companyId?: string }): Promise<{ secureReference: string; expectedMode: 'Certificado A1' } | null>;
  getPendingBinding(input?: { companyId?: string; certificateId?: string }): Promise<{ certificateId: string; secureReference: string; expectedMode: 'Certificado A1'; summary: Record<string, any> } | null>;
  activate(input?: { companyId?: string; certificateId?: string; actorId?: string; evidence?: Record<string, any> }): Promise<{ summary: Record<string, any>; reused: boolean }>;
  loadForValidation(reference: string): Promise<{ pkcs12: Buffer; passphrase: string }>;
  load(reference: string): Promise<{ pkcs12: Buffer; passphrase: string }>;
};
export function createNfeCertificateSecretLoader(repository: any): { configured: boolean; load(reference: string): Promise<{ pkcs12: Buffer; passphrase: string }> };
export function createNfeCertificateValidationLoader(repository: any): { configured: boolean; load(reference: string): Promise<{ pkcs12: Buffer; passphrase: string }> };
