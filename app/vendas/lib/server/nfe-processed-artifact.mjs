import { createHash } from 'node:crypto';
import { validateSignedNfeForAuthorization } from './nfe-authorization-service.mjs';

export const NFE_PROCESSED_ARTIFACT_REFERENCE = '2026-09-02';
const NFE_NAMESPACE = 'http://www.portalfiscal.inf.br/nfe';
const MAX_PROTOCOL_XML_BYTES = 512 * 1024;

function error(code, field, message) {
  return { code, field, message };
}

function xmlText(value) {
  return String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
}

function tagBlock(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml)?.[0] || '';
}

function tagValue(xml, localName) {
  const match = new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\s*>`, 'i').exec(xml);
  return match ? xmlText(match[1].replace(/<[^>]+>/g, '')) : '';
}

function rootAttributes(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b([^>]*)>`, 'i').exec(xml)?.[1] || '';
}

function attributeValue(attributes, name) {
  return new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(attributes)?.[2]?.trim() || '';
}

export function nfeProcessedStorageKey(accessKey) {
  const normalized = String(accessKey || '').trim();
  if (!/^\d{44}$/.test(normalized)) return '';
  const issuerDocument = normalized.slice(6, 20);
  const year = `20${normalized.slice(2, 4)}`;
  const month = normalized.slice(4, 6);
  return `fiscal/nfe/${issuerDocument}/${year}/${month}/${normalized}-procNFe.xml`;
}

export function buildProcessedNfeArtifact({ signedXml, protocolXml, expectedAccessKey } = {}) {
  const signed = validateSignedNfeForAuthorization(signedXml);
  const errors = [...signed.errors];
  const source = typeof protocolXml === 'string' ? protocolXml.trim() : '';
  if (!source) errors.push(error('AV-NFE-PROC-PROTOCOL-EMPTY', 'protocolXml', 'O protocolo de autorização não foi fornecido.'));
  if (source && Buffer.byteLength(source, 'utf8') > MAX_PROTOCOL_XML_BYTES) errors.push(error('AV-NFE-PROC-PROTOCOL-SIZE', 'protocolXml', 'O protocolo excedeu o limite seguro de 512 KB.'));
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) errors.push(error('AV-NFE-PROC-PROTOCOL-DOCTYPE', 'protocolXml', 'O protocolo contém declaração externa proibida.'));
  const protocolBlock = tagBlock(source, 'protNFe');
  const infoBlock = tagBlock(protocolBlock, 'infProt');
  const protocolVersion = attributeValue(rootAttributes(protocolBlock, 'protNFe'), 'versao');
  const environment = tagValue(infoBlock, 'tpAmb');
  const accessKey = tagValue(infoBlock, 'chNFe');
  const receivedAt = tagValue(infoBlock, 'dhRecbto');
  const protocolNumber = tagValue(infoBlock, 'nProt');
  const status = tagValue(infoBlock, 'cStat');
  const reason = tagValue(infoBlock, 'xMotivo');
  if (!protocolBlock || !infoBlock) errors.push(error('AV-NFE-PROC-PROTOCOL', 'protocolXml.protNFe', 'O conteúdo não possui um protocolo NF-e reconhecível.'));
  if (protocolVersion && protocolVersion !== '4.00') errors.push(error('AV-NFE-PROC-VERSION', 'protocolXml.versao', 'O protocolo não usa o leiaute 4.00.'));
  if (environment && environment !== '2') errors.push(error('AV-NFE-PROC-ENVIRONMENT', 'protocolXml.tpAmb', 'Somente protocolo de homologação pode ser processado nesta etapa.'));
  if (status && status !== '100') errors.push(error('AV-NFE-PROC-STATUS', 'protocolXml.cStat', 'Somente uma NF-e autorizada com situação 100 pode gerar procNFe.'));
  if (!/^\d{44}$/.test(accessKey)) errors.push(error('AV-NFE-PROC-KEY', 'protocolXml.chNFe', 'O protocolo não contém uma chave de acesso válida.'));
  if (!protocolNumber) errors.push(error('AV-NFE-PROC-NUMBER', 'protocolXml.nProt', 'O protocolo de autorização não contém número.'));
  if (!receivedAt) errors.push(error('AV-NFE-PROC-DATE', 'protocolXml.dhRecbto', 'O protocolo de autorização não contém data de recebimento.'));
  if (signed.accessKey && accessKey && signed.accessKey !== accessKey) errors.push(error('AV-NFE-PROC-KEY-MISMATCH', 'protocolXml.chNFe', 'O protocolo pertence a outra NF-e.'));
  if (expectedAccessKey && accessKey && String(expectedAccessKey) !== accessKey) errors.push(error('AV-NFE-PROC-EXPECTED-KEY', 'protocolXml.chNFe', 'O protocolo não corresponde à tentativa fiscal preparada.'));
  if (errors.length) return { valid: false, errors, authorized: false, accessKey: accessKey || signed.accessKey, protocolNumber, processedXml: '', checksum: '', byteLength: 0, storageKey: '' };
  const normalizedNfe = signed.nfeBlock.replace(/^<([A-Za-z_][\w.-]*:)?NFe\b([^>]*)>/i, (match, prefix, attributes) => /\bxmlns\s*=/.test(attributes) ? match : `<${prefix || ''}NFe xmlns="${NFE_NAMESPACE}"${attributes}>`);
  const normalizedProtocol = protocolBlock.replace(/^<([A-Za-z_][\w.-]*:)?protNFe\b([^>]*)>/i, (match, prefix, attributes) => /\bxmlns\s*=/.test(attributes) ? match : `<${prefix || ''}protNFe xmlns="${NFE_NAMESPACE}"${attributes}>`);
  const processedXml = `<?xml version="1.0" encoding="utf-8"?><nfeProc xmlns="${NFE_NAMESPACE}" versao="4.00">${normalizedNfe}${normalizedProtocol}</nfeProc>`;
  return {
    valid: true,
    errors: [],
    authorized: true,
    environment: 'homologacao',
    accessKey,
    protocolNumber,
    receivedAt,
    status,
    reason,
    processedXml,
    checksum: createHash('sha256').update(processedXml, 'utf8').digest('hex'),
    byteLength: Buffer.byteLength(processedXml, 'utf8'),
    storageKey: nfeProcessedStorageKey(accessKey),
    immutable: true,
  };
}

export function createDisabledNfeArtifactStorage() {
  return Object.freeze({ id: 'armazenamento-fiscal-nao-configurado', configured: false, async findByAccessKey() { return null; }, async putImmutable() { throw new Error('O armazenamento fiscal imutável ainda não foi instalado.'); } });
}

export async function persistProcessedNfeArtifact({ artifact, provider = createDisabledNfeArtifactStorage(), auditWriter } = {}) {
  const result = { ok: true, valid: false, persisted: false, reused: false, accessKey: artifact?.accessKey || '', storageKey: artifact?.storageKey || '', checksum: artifact?.checksum || '', storageReference: '', versionId: '', storedAt: '', xmlReturned: false, errors: [], warnings: [] };
  if (!artifact?.valid || !artifact?.authorized || !artifact?.processedXml || !/^\d{44}$/.test(artifact?.accessKey || '')) result.errors.push(error('AV-NFE-STORE-ARTIFACT', 'artifact', 'Somente um procNFe autorizado e validado pode ser armazenado.'));
  if (provider?.configured !== true || typeof provider.putImmutable !== 'function') result.errors.push(error('AV-NFE-STORE-PROVIDER', 'provider', 'O armazenamento fiscal imutável ainda não está configurado.'));
  if (result.errors.length) { result.warnings = ['Nenhum XML foi gravado.']; return result; }
  const existing = typeof provider.findByAccessKey === 'function' ? await provider.findByAccessKey({ accessKey: artifact.accessKey, storageKey: artifact.storageKey }) : null;
  if (existing) {
    if (existing.checksum !== artifact.checksum) {
      result.errors.push(error('AV-NFE-STORE-CONFLICT', 'artifact.checksum', 'Já existe um XML diferente para esta chave de acesso; a guarda é imutável.'));
      return result;
    }
    return { ...result, valid: true, persisted: true, reused: true, storageReference: String(existing.storageReference || ''), versionId: String(existing.versionId || ''), storedAt: String(existing.storedAt || '') };
  }
  let stored;
  try {
    stored = await provider.putImmutable({ storageKey: artifact.storageKey, accessKey: artifact.accessKey, contentType: 'application/xml', content: artifact.processedXml, checksum: artifact.checksum, byteLength: artifact.byteLength, metadata: { documentType: 'nfe', environment: 'homologacao', protocolNumber: artifact.protocolNumber, receivedAt: artifact.receivedAt } });
  } catch {
    result.errors.push(error('AV-NFE-STORE-WRITE', 'provider', 'O XML autorizado não pôde ser gravado no armazenamento fiscal.'));
    return result;
  }
  if (!stored?.storageReference || !stored?.storedAt) {
    result.errors.push(error('AV-NFE-STORE-RECEIPT', 'provider', 'O armazenamento não devolveu uma referência persistente válida.'));
    return result;
  }
  if (typeof auditWriter === 'function') await auditWriter({ event: 'nfe.procNFe.stored', accessKey: artifact.accessKey, protocolNumber: artifact.protocolNumber, checksum: artifact.checksum, storageReference: stored.storageReference, occurredAt: stored.storedAt });
  return { ...result, valid: true, persisted: true, storageReference: String(stored.storageReference), versionId: String(stored.versionId || ''), storedAt: String(stored.storedAt) };
}
