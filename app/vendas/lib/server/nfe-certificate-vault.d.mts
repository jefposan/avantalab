export type NfeCertificateDiagnosticError = { code: string; field: string; message: string };
export type NfeCertificateVaultRecord = {
  certificatePem: string;
  chainPem: string[];
  mode: string;
  privateKeyExportable: false;
  capabilities: { xmlSignature: boolean; mutualTls: boolean };
  revocation: { status: 'good' | 'revoked' | 'unknown'; source: 'crl' | 'ocsp'; verified: boolean; checkedAt: string; nextUpdate: string };
};
export type NfeCertificateVaultProvider = {
  id: string;
  configured: boolean;
  inspect(reference: string): Promise<NfeCertificateVaultRecord>;
  checkRevocation?(input: { certificatePem: string; chainPem: string[] }): Promise<NfeCertificateVaultRecord['revocation']>;
};
export type NfeCertificateChainResolver = {
  configured: boolean;
  resolve(input: { certificatePem: string; chainPem: string[]; now: Date }): Promise<{ resolved: boolean; chainPem: string[]; source: string }>;
};
export type NfeCertificateVaultDiagnostic = {
  ok: true; valid: boolean; mode: 'diagnostico-certificado-digital'; environment: 'homologacao'; reference: string; referenceValid: boolean;
  adapterConfigured: boolean; realCertificateInspected: boolean; subjectDocumentSource: string; ownerVerified: boolean; validityVerified: boolean;
  keyUsageVerified: boolean; chainVerified: boolean; rootPinned: boolean; revocationVerified: boolean; signingAvailable: boolean; mutualTlsAvailable: boolean;
  readyForXmlSignature: boolean; readyForMutualTls: boolean; readyForExternalHomologation: false; certificateFingerprint: string; certificateValidFrom: string;
  certificateValidTo: string; keyType: string; keyBits: number; sensitiveMaterialReturned: false; signingAttempted: false; transmissionAttempted: false;
  errors: NfeCertificateDiagnosticError[]; warnings: string[];
};
export const ICP_BRASIL_CNPJ_OTHERNAME_OID: string;
export const NFE_CERTIFICATE_VAULT_REFERENCE: string;
export function normalizeSecureCertificateReference(value: unknown): string;
export function validateSecureCertificateReference(value: unknown): { reference: string; valid: boolean; error: string };
export function extractIcpBrasilCnpjFromCertificate(certificatePem: string): string;
export function createDisabledNfeCertificateVaultProvider(): NfeCertificateVaultProvider;
export function createNfeCertificateVaultAdapter(options?: { provider?: NfeCertificateVaultProvider; trustedRootFingerprints?: string[]; chainResolver?: NfeCertificateChainResolver | null }): {
  id: string; configured: boolean;
  inspectBinding(input?: { secureReference?: string; expectedDocument?: string; expectedMode?: string; now?: Date }): Promise<NfeCertificateVaultDiagnostic>;
};
