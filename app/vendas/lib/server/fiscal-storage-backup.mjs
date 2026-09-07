import { createCipheriv, createDecipheriv, randomBytes as nodeRandomBytes } from 'node:crypto';

export const FISCAL_STORAGE_BACKUP_REFERENCE = '2026-09-03';

const FORMAT = 'AVANTALAB-FISCAL-BACKUP';
const VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;
const AAD = Buffer.from(`${FORMAT}:${VERSION}`, 'utf8');

function backupError(code, message) {
  return Object.assign(new Error(message), { code });
}

function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function encryptionKey(value) {
  const key = value instanceof Uint8Array ? Buffer.from(value) : null;
  if (!key || key.length !== 32) throw new TypeError('A chave da cópia fiscal precisa ter exatamente 32 bytes.');
  return key;
}

function parseEnvelope(value) {
  let envelope;
  try {
    envelope = JSON.parse(Buffer.from(value).toString('utf8'));
  } catch {
    throw backupError('AV-FISCAL-BACKUP-FORMAT', 'A cópia fiscal criptografada possui formato inválido.');
  }
  if (envelope?.format !== FORMAT || envelope?.version !== VERSION || envelope?.algorithm !== ALGORITHM) {
    throw backupError('AV-FISCAL-BACKUP-FORMAT', 'A versão da cópia fiscal não é compatível.');
  }
  for (const field of ['iv', 'tag', 'ciphertext']) {
    if (!text(envelope[field])) throw backupError('AV-FISCAL-BACKUP-FORMAT', 'A cópia fiscal criptografada está incompleta.');
  }
  return envelope;
}

function parsePayload(value) {
  let payload;
  try {
    payload = JSON.parse(value.toString('utf8'));
  } catch {
    throw backupError('AV-FISCAL-BACKUP-PAYLOAD', 'O conteúdo restaurado não é um pacote fiscal válido.');
  }
  const content = Buffer.from(text(payload.contentBase64), 'base64');
  if (!payload.accessKey || !payload.storageKey || !payload.contentType || !payload.checksum || content.length === 0 || content.length > MAX_ARTIFACT_BYTES) {
    throw backupError('AV-FISCAL-BACKUP-PAYLOAD', 'O pacote fiscal restaurado está incompleto.');
  }
  return { ...payload, content };
}

export function createFiscalStorageBackupService({ sourceStorage, targetStorage = sourceStorage, key, clock = () => new Date().toISOString(), randomBytes = nodeRandomBytes } = {}) {
  if (!sourceStorage?.readVerified || !targetStorage?.putImmutable) throw new TypeError('Informe provedores fiscais compatíveis para cópia e restauração.');
  const secret = encryptionKey(key);
  return Object.freeze({
    id: 'avantalab-fiscal-storage-backup-v1',
    async createBackup(input = {}) {
      const artifact = await sourceStorage.readVerified(input);
      const payload = Buffer.from(JSON.stringify({
        format: FORMAT,
        version: VERSION,
        backedUpAt: clock(),
        accessKey: text(input.accessKey),
        storageKey: text(input.storageKey),
        contentType: artifact.contentType,
        checksum: artifact.checksum,
        byteLength: artifact.byteLength,
        sourceVersion: artifact.versionId,
        contentBase64: Buffer.from(artifact.content).toString('base64'),
      }), 'utf8');
      const iv = Buffer.from(randomBytes(12));
      if (iv.length !== 12) throw new TypeError('O gerador de aleatoriedade da cópia fiscal é inválido.');
      const cipher = createCipheriv(ALGORITHM, secret, iv);
      cipher.setAAD(AAD);
      const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
      const envelope = Buffer.from(JSON.stringify({
        format: FORMAT,
        version: VERSION,
        algorithm: ALGORITHM,
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        ciphertext: ciphertext.toString('base64'),
      }), 'utf8');
      return { envelope: new Uint8Array(envelope), checksum: artifact.checksum, byteLength: artifact.byteLength, sourceVersion: artifact.versionId };
    },
    async restoreBackup(envelopeInput) {
      const envelope = parseEnvelope(envelopeInput);
      let plaintext;
      try {
        const decipher = createDecipheriv(ALGORITHM, secret, Buffer.from(envelope.iv, 'base64'));
        decipher.setAAD(AAD);
        decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
        plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]);
      } catch {
        throw backupError('AV-FISCAL-BACKUP-AUTH', 'A integridade ou a chave da cópia fiscal não foi confirmada.');
      }
      const payload = parsePayload(plaintext);
      const restored = await targetStorage.putImmutable({
        accessKey: payload.accessKey,
        storageKey: payload.storageKey,
        contentType: payload.contentType,
        content: payload.content,
        checksum: payload.checksum,
        byteLength: payload.byteLength,
      });
      if (restored.checksum !== payload.checksum) throw backupError('AV-FISCAL-BACKUP-CHECKSUM', 'O arquivo restaurado não corresponde à cópia fiscal.');
      return { ...restored, sourceVersion: payload.sourceVersion, restoredAt: clock() };
    },
  });
}
