import { createHash } from 'node:crypto';
import { createDisabledNfeArtifactStorage } from './nfe-processed-artifact.mjs';
import { buildProcessedNfeArtifact } from './nfe-processed-artifact.mjs';

export const NFE_PROTOCOL_ARTIFACT_REFERENCE = '2026-09-05';

const issue = (code, field, message) => ({ code, field, message });

export function nfeProtocolStorageKey(accessKey) {
  const normalized = String(accessKey || '').trim();
  if (!/^\d{44}$/.test(normalized)) return '';
  return `fiscal/nfe/${normalized.slice(6, 20)}/20${normalized.slice(2, 4)}/${normalized.slice(4, 6)}/${normalized}-protocolNFe.xml`;
}

export function buildNfeProtocolArtifact({ signedXml, protocolXml, expectedAccessKey } = {}) {
  const validated = buildProcessedNfeArtifact({ signedXml, protocolXml, expectedAccessKey });
  if (!validated.valid || !validated.authorized) return { valid: false, errors: validated.errors, accessKey: validated.accessKey || '', protocolXml: '', checksum: '', byteLength: 0, storageKey: '' };
  const source = typeof protocolXml === 'string' ? protocolXml.trim() : '';
  if (!source) return { valid: false, errors: [issue('AV-NFE-PROTOCOL-EMPTY', 'protocol', 'O protocolo autorizado não foi fornecido.')], accessKey: validated.accessKey, protocolXml: '', checksum: '', byteLength: 0, storageKey: '' };
  return {
    valid: true,
    errors: [],
    accessKey: validated.accessKey,
    protocolNumber: validated.protocolNumber,
    receivedAt: validated.receivedAt,
    status: validated.status,
    reason: validated.reason,
    protocolXml: source,
    checksum: createHash('sha256').update(source, 'utf8').digest('hex'),
    byteLength: Buffer.byteLength(source, 'utf8'),
    storageKey: nfeProtocolStorageKey(validated.accessKey),
    immutable: true,
  };
}

export async function persistNfeProtocolArtifact({ artifact, provider = createDisabledNfeArtifactStorage() } = {}) {
  const result = { ok: true, valid: false, persisted: false, reused: false, accessKey: artifact?.accessKey || '', storageKey: artifact?.storageKey || '', checksum: artifact?.checksum || '', storageReference: '', storageVersion: '', storedAt: '', protocolContentReturned: false, errors: [] };
  if (!artifact?.valid || !artifact?.protocolXml || !/^\d{44}$/.test(artifact?.accessKey || '')) result.errors.push(issue('AV-NFE-PROTOCOL-ARTIFACT', 'artifact', 'Somente um protocolo autorizado e validado pode ser armazenado.'));
  if (provider?.configured !== true || typeof provider.putImmutable !== 'function') result.errors.push(issue('AV-NFE-PROTOCOL-PROVIDER', 'provider', 'O armazenamento fiscal imutável ainda não está configurado.'));
  if (result.errors.length) return result;
  const existing = typeof provider.findByAccessKey === 'function' ? await provider.findByAccessKey({ accessKey: artifact.accessKey, storageKey: artifact.storageKey }) : null;
  if (existing) {
    if (existing.checksum !== artifact.checksum) return { ...result, errors: [issue('AV-NFE-PROTOCOL-CONFLICT', 'artifact.checksum', 'Já existe outro protocolo para esta chave de acesso.')] };
    return { ...result, valid: true, persisted: true, reused: true, storageReference: String(existing.storageReference || ''), storageVersion: String(existing.versionId || ''), storedAt: String(existing.storedAt || '') };
  }
  try {
    const stored = await provider.putImmutable({ accessKey: artifact.accessKey, storageKey: artifact.storageKey, contentType: 'application/xml', content: artifact.protocolXml, checksum: artifact.checksum, byteLength: artifact.byteLength, metadata: { documentType: 'nfe', artifactType: 'protocol_xml', environment: 'homologacao', protocolNumber: artifact.protocolNumber } });
    if (!stored?.storageReference || !stored?.storedAt) return { ...result, errors: [issue('AV-NFE-PROTOCOL-RECEIPT', 'provider', 'O armazenamento não devolveu uma referência persistente válida.')] };
    return { ...result, valid: true, persisted: true, reused: Boolean(stored.reused), storageReference: String(stored.storageReference), storageVersion: String(stored.versionId || ''), storedAt: String(stored.storedAt) };
  } catch {
    return { ...result, errors: [issue('AV-NFE-PROTOCOL-WRITE', 'provider', 'O protocolo autorizado não pôde ser guardado no armazenamento fiscal.')] };
  }
}
