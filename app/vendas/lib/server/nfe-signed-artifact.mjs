import { createHash } from 'node:crypto';
import { createDisabledNfeArtifactStorage } from './nfe-processed-artifact.mjs';
import { verifyProtectedSignedNfeXml } from './nfe-signature-lab.mjs';

export const NFE_SIGNED_ARTIFACT_REFERENCE = '2026-09-05';

function error(code, field, message) {
  return { code, field, message };
}

export function nfeSignedStorageKey(accessKey) {
  const normalized = String(accessKey || '').trim();
  if (!/^\d{44}$/.test(normalized)) return '';
  return `fiscal/nfe/${normalized.slice(6, 20)}/20${normalized.slice(2, 4)}/${normalized.slice(4, 6)}/${normalized}-signedNFe.xml`;
}

export async function buildSignedNfeArtifact({ signedXml, expectedAccessKey, expectedIssuerDocument } = {}) {
  const source = typeof signedXml === 'string' ? signedXml : '';
  const verification = await verifyProtectedSignedNfeXml(source, expectedIssuerDocument);
  const errors = [...verification.errors];
  if (expectedAccessKey && verification.accessKey !== String(expectedAccessKey)) errors.push(error('AV-NFE-SIGNED-KEY', 'accessKey', 'O XML assinado não corresponde à chave de acesso preparada.'));
  if (!verification.signatureVerified || !verification.signedXsdValid) errors.push(error('AV-NFE-SIGNED-VALIDATION', 'signature', 'O XML assinado não passou pela validação criptográfica e fiscal.'));
  const accessKey = verification.accessKey || String(expectedAccessKey || '');
  if (errors.length) return { valid: false, errors, accessKey, signedXml: '', checksum: '', byteLength: 0, storageKey: '' };
  return {
    valid: true,
    errors: [],
    accessKey,
    signedXml: source,
    checksum: createHash('sha256').update(source, 'utf8').digest('hex'),
    byteLength: Buffer.byteLength(source, 'utf8'),
    storageKey: nfeSignedStorageKey(accessKey),
    signerFingerprint: verification.certificateFingerprint,
    schemaPackage: verification.schemaPackage,
    immutable: true,
  };
}

export async function persistSignedNfeArtifact({ artifact, provider = createDisabledNfeArtifactStorage() } = {}) {
  const result = { ok: true, valid: false, persisted: false, reused: false, accessKey: artifact?.accessKey || '', storageKey: artifact?.storageKey || '', checksum: artifact?.checksum || '', storageReference: '', storageVersion: '', storedAt: '', signedContentReturned: false, errors: [] };
  if (!artifact?.valid || !artifact?.signedXml || !/^\d{44}$/.test(artifact?.accessKey || '')) result.errors.push(error('AV-NFE-SIGNED-ARTIFACT', 'artifact', 'Somente um XML assinado e validado pode ser armazenado.'));
  if (provider?.configured !== true || typeof provider.putImmutable !== 'function') result.errors.push(error('AV-NFE-SIGNED-PROVIDER', 'provider', 'O armazenamento fiscal imutável ainda não está configurado.'));
  if (result.errors.length) return result;
  const existing = typeof provider.findByAccessKey === 'function' ? await provider.findByAccessKey({ accessKey: artifact.accessKey, storageKey: artifact.storageKey }) : null;
  if (existing) {
    if (existing.checksum !== artifact.checksum) return { ...result, errors: [error('AV-NFE-SIGNED-CONFLICT', 'artifact.checksum', 'Já existe outro XML assinado para esta chave de acesso.')] };
    return { ...result, valid: true, persisted: true, reused: true, storageReference: String(existing.storageReference || ''), storageVersion: String(existing.versionId || ''), storedAt: String(existing.storedAt || '') };
  }
  try {
    const stored = await provider.putImmutable({ accessKey: artifact.accessKey, storageKey: artifact.storageKey, contentType: 'application/xml', content: artifact.signedXml, checksum: artifact.checksum, byteLength: artifact.byteLength, metadata: { documentType: 'nfe', artifactType: 'signed_xml', environment: 'homologacao' } });
    if (!stored?.storageReference || !stored?.storedAt) return { ...result, errors: [error('AV-NFE-SIGNED-RECEIPT', 'provider', 'O armazenamento não devolveu uma referência persistente válida.')] };
    return { ...result, valid: true, persisted: true, reused: Boolean(stored.reused), storageReference: String(stored.storageReference), storageVersion: String(stored.versionId || ''), storedAt: String(stored.storedAt) };
  } catch {
    return { ...result, errors: [error('AV-NFE-SIGNED-WRITE', 'provider', 'O XML assinado não pôde ser guardado no armazenamento fiscal.')] };
  }
}
