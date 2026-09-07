export type NfeA1DiagnosticError = { code: string; field: string; message: string };
export type NfeA1CertificateDiagnostic = {
  ok: true; valid: boolean; mode: 'validacao-local-certificado-a1'; passwordAccepted: boolean; leafCertificateLocated: boolean;
  privateKeyLocated: boolean; privateKeyMatchesCertificate: boolean; ownerVerified: boolean; validityVerified: boolean;
  keyUsageVerified: boolean; clientAuthenticationVerified: boolean; certificateFingerprint: string; certificateValidFrom: string;
  certificateValidTo: string; keyType: string; keyBits: number; chainLength: number; readyForServerInstallation: boolean;
  certificateActive: false; sensitiveMaterialReturned: false; networkAttempted: false; errors: NfeA1DiagnosticError[]; warnings: string[];
};
export type NfeA1SecretLoader = { configured: boolean; load(reference: string): Promise<{ pkcs12: Buffer | Uint8Array; passphrase: string }> };
export type NfeA1RevocationChecker = { configured: boolean; check(input: { certificatePem: string; chainPem: string[] }): Promise<{ status: 'good' | 'revoked' | 'unknown'; source: 'crl' | 'ocsp'; verified: boolean; checkedAt: string; nextUpdate: string }> };
export const NFE_A1_CERTIFICATE_REFERENCE: string;
export const NFE_A1_MAX_PKCS12_BYTES: number;
export function inspectNfeA1Pkcs12(input?: { pkcs12?: Buffer | Uint8Array; passphrase?: string; expectedDocument?: string; now?: Date }): Promise<NfeA1CertificateDiagnostic>;
export function prepareNfeA1Pkcs12ForProtectedStorage(input?: { pkcs12?: Buffer | Uint8Array; passphrase?: string; expectedDocument?: string; now?: Date }): Promise<
  { ok: false; diagnostic: NfeA1CertificateDiagnostic }
  | { ok: true; diagnostic: NfeA1CertificateDiagnostic; protectedPkcs12: Buffer; internalPassphrase: string; originalPassphraseRetained: false }
>;
export function prepareNfeA1Pkcs12ForMutualTls(input?: {
  pkcs12?: Buffer | Uint8Array;
  passphrase?: string;
  chainResolver?: {
    configured: boolean;
    resolve(input: { certificatePem: string; chainPem: string[]; now: Date }): Promise<{ resolved: boolean; chainPem: string[] }>;
  };
  now?: Date;
}): Promise<Buffer>;
export function createNfeA1CertificateProvider(options?: { secretLoader?: NfeA1SecretLoader; revocationChecker?: NfeA1RevocationChecker }): {
  id: string; configured: boolean; inspect(reference: string): Promise<{ certificatePem: string; chainPem: string[]; mode: 'Certificado A1'; privateKeyExportable: false; capabilities: { xmlSignature: boolean; mutualTls: boolean }; revocation: { status: 'good' | 'revoked' | 'unknown'; source: 'crl' | 'ocsp'; verified: boolean; checkedAt: string; nextUpdate: string } }>;
  checkRevocation(input: { certificatePem: string; chainPem: string[] }): Promise<{ status: 'good' | 'revoked' | 'unknown'; source: 'crl' | 'ocsp'; verified: boolean; checkedAt: string; nextUpdate: string }>;
  signXml(input?: { reference?: string; unsignedXml?: string; expectedAccessKey?: string; expectedIssuerDocument?: string }): Promise<{ signedXml: string; accessKey: string; checksum: string; byteLength: number; signerFingerprint: string; signatureVerified: true; signedXsdValid: true; schemaPackage: string; sensitiveMaterialReturned: false }>;
  signEventXml(input?: { reference?: string; unsignedEventXml?: string; expectedAccessKey?: string; expectedIssuerDocument?: string }): Promise<{ signedEventXml: string; accessKey: string; eventId: string; checksum: string; byteLength: number; signerFingerprint: string; signatureVerified: true; signedXsdValid: true; schemaPackage: string; sensitiveMaterialReturned: false }>;
};
