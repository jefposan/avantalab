import { createHash } from 'node:crypto';
import { createDisabledNfeArtifactStorage } from './nfe-processed-artifact.mjs';

export const NFE_DANFE_ARTIFACT_REFERENCE = '2026-09-03';

function error(code, field, message) {
  return { code, field, message };
}

export function nfeDanfeStorageKey(accessKey) {
  const normalized = String(accessKey || '').trim();
  if (!/^\d{44}$/.test(normalized)) return '';
  const issuerDocument = normalized.slice(6, 20);
  const year = `20${normalized.slice(2, 4)}`;
  const month = normalized.slice(4, 6);
  return `fiscal/nfe/${issuerDocument}/${year}/${month}/${normalized}-danfe.pdf`;
}

export function buildNfeDanfeArtifact({ danfe } = {}) {
  const errors = [];
  const accessKey = String(danfe?.accessKey || '').trim();
  const pdf = danfe?.pdf instanceof Uint8Array ? new Uint8Array(danfe.pdf) : new Uint8Array();
  if (danfe?.valid !== true || !/^\d{44}$/.test(accessKey)) errors.push(error('AV-NFE-DANFE-STORE-SOURCE', 'danfe', 'Somente um DANFE validado e vinculado a uma chave de acesso pode ser armazenado.'));
  if (danfe?.sampleMode === true) errors.push(error('AV-NFE-DANFE-STORE-SAMPLE', 'danfe.sampleMode', 'Uma amostra técnica não pode ser registrada como DANFE fiscal.'));
  if (pdf.length === 0 || pdf.length > 10 * 1024 * 1024 || !Buffer.from(pdf.subarray(0, 8)).toString('ascii').startsWith('%PDF-')) errors.push(error('AV-NFE-DANFE-STORE-PDF', 'danfe.pdf', 'O conteúdo não é um PDF fiscal válido para armazenamento.'));
  if (errors.length) return { valid: false, errors, accessKey, content: new Uint8Array(), checksum: '', byteLength: 0, storageKey: '', contentType: 'application/pdf', immutable: true };
  return {
    valid: true,
    errors: [],
    accessKey,
    content: pdf,
    checksum: createHash('sha256').update(pdf).digest('hex'),
    byteLength: pdf.length,
    storageKey: nfeDanfeStorageKey(accessKey),
    contentType: 'application/pdf',
    immutable: true,
  };
}

export async function persistNfeDanfeArtifact({ artifact, provider = createDisabledNfeArtifactStorage(), auditWriter } = {}) {
  const result = { ok: false, valid: false, persisted: false, reused: false, accessKey: artifact?.accessKey || '', storageKey: artifact?.storageKey || '', checksum: artifact?.checksum || '', byteLength: Number(artifact?.byteLength || 0), storageReference: '', versionId: '', storedAt: '', pdfReturned: false, errors: [], warnings: [] };
  if (!artifact?.valid || !(artifact?.content instanceof Uint8Array) || !/^\d{44}$/.test(artifact?.accessKey || '')) result.errors.push(error('AV-NFE-DANFE-STORE-ARTIFACT', 'artifact', 'Somente um DANFE fiscal validado pode ser armazenado.'));
  if (provider?.configured !== true || typeof provider.putImmutable !== 'function') result.errors.push(error('AV-NFE-DANFE-STORE-PROVIDER', 'provider', 'O armazenamento fiscal imutável ainda não está configurado.'));
  if (result.errors.length) { result.warnings = ['Nenhum DANFE foi gravado.']; return result; }
  const existing = typeof provider.findByAccessKey === 'function' ? await provider.findByAccessKey({ accessKey: artifact.accessKey, storageKey: artifact.storageKey }) : null;
  if (existing) {
    if (existing.checksum !== artifact.checksum) {
      result.errors.push(error('AV-NFE-DANFE-STORE-CONFLICT', 'artifact.checksum', 'Já existe outro DANFE para esta chave de acesso; a guarda é imutável.'));
      return result;
    }
    return { ...result, ok: true, valid: true, persisted: true, reused: true, storageReference: String(existing.storageReference || ''), versionId: String(existing.versionId || ''), storedAt: String(existing.storedAt || '') };
  }
  let stored;
  try {
    stored = await provider.putImmutable({ storageKey: artifact.storageKey, accessKey: artifact.accessKey, contentType: artifact.contentType, content: artifact.content, checksum: artifact.checksum, byteLength: artifact.byteLength, metadata: { documentType: 'nfe', environment: 'homologacao', artifactType: 'danfe_pdf' } });
  } catch {
    result.errors.push(error('AV-NFE-DANFE-STORE-WRITE', 'provider', 'O DANFE não pôde ser gravado no armazenamento fiscal.'));
    return result;
  }
  if (!stored?.storageReference || !stored?.storedAt) {
    result.errors.push(error('AV-NFE-DANFE-STORE-RECEIPT', 'provider', 'O armazenamento não devolveu uma referência persistente válida para o DANFE.'));
    return result;
  }
  if (typeof auditWriter === 'function') await auditWriter({ event: 'nfe.danfe.stored', accessKey: artifact.accessKey, checksum: artifact.checksum, storageReference: stored.storageReference, occurredAt: stored.storedAt });
  return { ...result, ok: true, valid: true, persisted: true, storageReference: String(stored.storageReference), versionId: String(stored.versionId || ''), storedAt: String(stored.storedAt) };
}
