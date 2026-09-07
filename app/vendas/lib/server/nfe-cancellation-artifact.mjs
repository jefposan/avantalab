import { createHash } from 'node:crypto';
import { createDisabledNfeArtifactStorage } from './nfe-processed-artifact.mjs';

export const NFE_CANCELLATION_ARTIFACT_REFERENCE = '2026-09-07';

const issue = (code, field, message) => ({ code, field, message });
const text = (value) => String(value ?? '').trim();
const tag = (xml, name) => text(xml).match(new RegExp(`<(?:[A-Za-z_][\\w.-]*:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z_][\\w.-]*:)?${name}>`, 'i'))?.[1]?.trim() || '';

export function nfeCancellationStorageKey(accessKey) {
  const normalized = text(accessKey);
  if (!/^\d{44}$/.test(normalized)) return '';
  return `fiscal/nfe/${normalized.slice(6, 20)}/20${normalized.slice(2, 4)}/${normalized.slice(4, 6)}/${normalized}-procEventoCancNFe.xml`;
}

export function buildNfeCancellationArtifact({ processedEventXml, expectedAccessKey } = {}) {
  const source = text(processedEventXml);
  const expected = text(expectedAccessKey);
  const accessKey = tag(source, 'chNFe');
  const eventType = tag(source, 'tpEvento');
  const statusCode = tag(source, 'cStat');
  const protocolNumber = tag(source, 'nProt');
  const registeredAt = tag(source, 'dhRegEvento');
  const errors = [];
  if (!source || Buffer.byteLength(source, 'utf8') > 1024 * 1024 || /<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--/i.test(source)) errors.push(issue('AV-NFE-CANCEL-XML', 'event', 'O evento de cancelamento processado é inválido.'));
  if (!/^\d{44}$/.test(expected) || accessKey !== expected) errors.push(issue('AV-NFE-CANCEL-KEY', 'accessKey', 'O evento não corresponde à chave de acesso da NF-e.'));
  if (eventType !== '110111') errors.push(issue('AV-NFE-CANCEL-TYPE', 'eventType', 'O retorno não corresponde ao evento de cancelamento da NF-e.'));
  if (!['135', '155'].includes(statusCode)) errors.push(issue('AV-NFE-CANCEL-STATUS', 'statusCode', 'O autorizador não confirmou o registro do cancelamento.'));
  if (!/^\d{15,17}$/.test(protocolNumber)) errors.push(issue('AV-NFE-CANCEL-PROTOCOL', 'protocolNumber', 'O protocolo do evento de cancelamento é inválido.'));
  if (!Number.isFinite(Date.parse(registeredAt))) errors.push(issue('AV-NFE-CANCEL-DATE', 'registeredAt', 'A data de registro do cancelamento é inválida.'));
  const storageKey = nfeCancellationStorageKey(accessKey);
  return {
    valid: errors.length === 0,
    errors,
    accessKey,
    statusCode,
    protocolNumber,
    registeredAt,
    processedEventXml: errors.length ? '' : source,
    checksum: errors.length ? '' : createHash('sha256').update(source, 'utf8').digest('hex'),
    byteLength: errors.length ? 0 : Buffer.byteLength(source, 'utf8'),
    storageKey,
    immutable: true,
  };
}

export async function persistNfeCancellationArtifact({ artifact, provider = createDisabledNfeArtifactStorage() } = {}) {
  const result = { ok: true, valid: false, persisted: false, reused: false, accessKey: artifact?.accessKey || '', storageReference: '', storageVersion: '', storedAt: '', eventContentReturned: false, errors: [] };
  if (!artifact?.valid || !artifact?.processedEventXml || !artifact?.storageKey) result.errors.push(issue('AV-NFE-CANCEL-ARTIFACT', 'artifact', 'Somente um evento de cancelamento confirmado pode ser armazenado.'));
  if (provider?.configured !== true || typeof provider.putImmutable !== 'function') result.errors.push(issue('AV-NFE-CANCEL-STORAGE', 'provider', 'O armazenamento fiscal imutável ainda não está configurado.'));
  if (result.errors.length) return result;
  const existing = typeof provider.findByAccessKey === 'function' ? await provider.findByAccessKey({ accessKey: artifact.accessKey, storageKey: artifact.storageKey }) : null;
  if (existing) {
    if (existing.checksum !== artifact.checksum) return { ...result, errors: [issue('AV-NFE-CANCEL-CONFLICT', 'artifact', 'Já existe outro evento de cancelamento para esta NF-e.')] };
    return { ...result, valid: true, persisted: true, reused: true, storageReference: String(existing.storageReference || ''), storageVersion: String(existing.versionId || ''), storedAt: String(existing.storedAt || '') };
  }
  try {
    const stored = await provider.putImmutable({ accessKey: artifact.accessKey, storageKey: artifact.storageKey, contentType: 'application/xml', content: artifact.processedEventXml, checksum: artifact.checksum, byteLength: artifact.byteLength, metadata: { documentType: 'nfe', artifactType: 'cancellation_event_xml', environment: 'homologacao', protocolNumber: artifact.protocolNumber } });
    if (!stored?.storageReference || !stored?.storedAt) return { ...result, errors: [issue('AV-NFE-CANCEL-STORAGE-RECEIPT', 'provider', 'O armazenamento não confirmou a guarda do evento de cancelamento.')] };
    return { ...result, valid: true, persisted: true, reused: Boolean(stored.reused), storageReference: String(stored.storageReference), storageVersion: String(stored.versionId || ''), storedAt: String(stored.storedAt) };
  } catch {
    return { ...result, errors: [issue('AV-NFE-CANCEL-STORAGE-WRITE', 'provider', 'O evento de cancelamento não pôde ser guardado no armazenamento fiscal.')] };
  }
}
