import { createHash } from 'node:crypto';

export const SUPABASE_FISCAL_ARTIFACT_STORAGE_REFERENCE = '2026-09-03';

const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(['application/xml', 'application/pdf']);
const STORAGE_KEY_PATTERN = /^fiscal\/nfe\/(\d{14})\/(20\d{2})\/(0[1-9]|1[0-2])\/(\d{44})-(signedNFe\.xml|protocolNFe\.xml|procNFe\.xml|danfe\.pdf)$/;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{2,61}[a-z0-9]$/;

function storageError(code, message) {
  return Object.assign(new Error(message), { code });
}

function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function toBuffer(content) {
  if (typeof content === 'string') return Buffer.from(content, 'utf8');
  if (content instanceof Uint8Array) return Buffer.from(content);
  throw storageError('AV-FISCAL-SUPABASE-CONTENT', 'O conteúdo fiscal precisa ser texto ou bytes.');
}

async function blobToBuffer(blob) {
  if (!blob || typeof blob.arrayBuffer !== 'function') throw storageError('AV-FISCAL-SUPABASE-DOWNLOAD', 'O Storage não devolveu um arquivo fiscal válido.');
  return Buffer.from(await blob.arrayBuffer());
}

function validateBucketName(value) {
  const bucket = text(value);
  if (!BUCKET_PATTERN.test(bucket) || !bucket.includes('fiscal') || !bucket.includes('private')) throw new TypeError('O bucket fiscal privado possui identificação inválida.');
  return bucket;
}

function validateStorageKey(storageKey, accessKey, contentType) {
  const key = text(storageKey);
  const normalizedAccessKey = text(accessKey);
  const match = STORAGE_KEY_PATTERN.exec(key);
  if (!match || match[4] !== normalizedAccessKey) throw storageError('AV-FISCAL-SUPABASE-KEY', 'A chave do objeto fiscal não é válida.');
  if (match[1] !== normalizedAccessKey.slice(6, 20) || match[2] !== `20${normalizedAccessKey.slice(2, 4)}` || match[3] !== normalizedAccessKey.slice(4, 6)) throw storageError('AV-FISCAL-SUPABASE-ROUTE', 'A rota do objeto não corresponde à chave de acesso.');
  const expectedContentType = match[5].endsWith('.xml') ? 'application/xml' : 'application/pdf';
  if (contentType && text(contentType) !== expectedContentType) throw storageError('AV-FISCAL-SUPABASE-CONTENT-TYPE', 'O tipo de conteúdo não corresponde ao documento fiscal.');
  return { key, contentType: expectedContentType };
}

function parseStorageReference(storageReference, expectedBucket) {
  const prefix = `supabase://${expectedBucket}/`;
  const reference = text(storageReference);
  if (!reference.startsWith(prefix)) throw storageError('AV-FISCAL-SUPABASE-REFERENCE', 'A referência não pertence ao bucket fiscal configurado.');
  const key = reference.slice(prefix.length);
  if (!key || key.includes('..') || key.includes('\\') || !STORAGE_KEY_PATTERN.test(key)) throw storageError('AV-FISCAL-SUPABASE-REFERENCE', 'A referência do objeto fiscal não é segura.');
  return key;
}

function isAlreadyExists(cause) {
  const status = Number(cause?.status ?? cause?.statusCode);
  return status === 400 || status === 409 || /already exists|duplicate/i.test(text(cause?.message));
}

function assertClient(client) {
  if (!client?.storage || typeof client.storage.from !== 'function' || typeof client.storage.getBucket !== 'function') throw new TypeError('Informe um cliente Supabase server-side compatível com Storage.');
}

async function currentObject(bucketApi, key, expectedChecksum, storageVersion = '') {
  const options = storageVersion ? { versionId: storageVersion } : undefined;
  const downloaded = await bucketApi.download(key, options);
  if (downloaded.error) throw downloaded.error;
  const content = await blobToBuffer(downloaded.data);
  const actualChecksum = sha256(content);
  if (expectedChecksum && actualChecksum !== expectedChecksum) throw storageError('AV-FISCAL-SUPABASE-CONFLICT', 'O objeto existente possui outro conteúdo.');
  const inspected = await bucketApi.info(key, options);
  if (inspected.error) throw inspected.error;
  return { content, checksum: actualChecksum, versionId: text(inspected.data?.version) || actualChecksum };
}

function receipt(bucket, key, stored, clock, reused) {
  return {
    storageReference: `supabase://${bucket}/${key}`,
    versionId: stored.versionId,
    checksum: stored.checksum,
    storedAt: clock(),
    reused,
  };
}

export function createSupabaseFiscalArtifactStorage({ client, bucket: bucketInput, environment = 'local-lab', productionReadiness, clock = () => new Date().toISOString() } = {}) {
  assertClient(client);
  const bucket = validateBucketName(bucketInput);
  const normalizedEnvironment = text(environment);
  if (!['local-lab', 'production'].includes(normalizedEnvironment)) throw new TypeError('O ambiente do Storage fiscal não é permitido.');
  const productionReady = normalizedEnvironment === 'production' && productionReadiness?.productionReady === true;
  const bucketApi = client.storage.from(bucket);
  return Object.freeze({
    id: 'avantalab-supabase-fiscal-artifact-storage-v1',
    configured: true,
    environment: normalizedEnvironment,
    productionReady,
    bucket,
    async inspectReadiness() {
      const response = await client.storage.getBucket(bucket);
      if (response.error) return { valid: false, productionReady: false, errors: [{ code: 'AV-FISCAL-SUPABASE-BUCKET-MISSING', field: 'bucket', message: 'O bucket fiscal privado não está disponível.' }] };
      const details = response.data || {};
      const mimeTypes = Array.isArray(details.allowed_mime_types) ? details.allowed_mime_types : [];
      const fileSizeLimit = Number(details.file_size_limit);
      const errors = [];
      const warnings = [];
      const nativeVersioning = details.versioning_status === 'ENABLED';
      if (details.public !== false) errors.push({ code: 'AV-FISCAL-SUPABASE-BUCKET-PUBLIC', field: 'bucket.public', message: 'O bucket fiscal não pode ser público.' });
      if (!nativeVersioning) {
        const issue = { code: 'AV-FISCAL-SUPABASE-BUCKET-VERSIONING', field: 'bucket.versioning', message: 'O versionamento nativo do bucket fiscal precisa estar ativo em produção.' };
        if (normalizedEnvironment === 'production') errors.push(issue);
        else warnings.push({ ...issue, code: 'AV-FISCAL-SUPABASE-BUCKET-VERSIONING-LAB', message: 'O Storage local não oferece versionamento nativo; o laboratório usa rota imutável e versão lógica SHA-256.' });
      }
      if (!Number.isFinite(fileSizeLimit) || fileSizeLimit <= 0 || fileSizeLimit > MAX_ARTIFACT_BYTES) errors.push({ code: 'AV-FISCAL-SUPABASE-BUCKET-SIZE', field: 'bucket.fileSizeLimit', message: 'O limite do bucket fiscal deve ser de no máximo 10 MiB.' });
      for (const required of ALLOWED_CONTENT_TYPES) if (!mimeTypes.includes(required)) errors.push({ code: 'AV-FISCAL-SUPABASE-BUCKET-MIME', field: 'bucket.allowedMimeTypes', message: `O bucket fiscal precisa aceitar ${required}.` });
      return { valid: errors.length === 0, productionReady: errors.length === 0 && nativeVersioning && productionReady, bucket: { id: bucket, public: false, versioning: nativeVersioning ? 'ENABLED' : 'LOGICAL_SHA256', nativeVersioning, fileSizeLimit, allowedMimeTypes: [...mimeTypes] }, warnings, errors };
    },
    async putImmutable({ accessKey, storageKey, contentType, content, checksum: expectedChecksum, byteLength } = {}) {
      const validated = validateStorageKey(storageKey, accessKey, contentType);
      const body = toBuffer(content);
      if (body.length === 0 || body.length > MAX_ARTIFACT_BYTES || Number(byteLength) !== body.length) throw storageError('AV-FISCAL-SUPABASE-SIZE', 'O tamanho do documento fiscal é inválido.');
      const contentChecksum = sha256(body);
      if (!/^[a-f0-9]{64}$/.test(text(expectedChecksum)) || expectedChecksum !== contentChecksum) throw storageError('AV-FISCAL-SUPABASE-CHECKSUM', 'A integridade do documento fiscal não foi confirmada.');
      const uploaded = await bucketApi.upload(validated.key, body, { cacheControl: '0', contentType: validated.contentType, upsert: false, metadata: { sha256: contentChecksum } });
      if (uploaded.error) {
        if (!isAlreadyExists(uploaded.error)) throw storageError('AV-FISCAL-SUPABASE-UPLOAD', 'O Storage não conseguiu guardar o documento fiscal.');
        const existing = await currentObject(bucketApi, validated.key, contentChecksum);
        return receipt(bucket, validated.key, existing, clock, true);
      }
      const stored = await currentObject(bucketApi, validated.key, contentChecksum);
      return receipt(bucket, validated.key, stored, clock, false);
    },
    async readVerified({ accessKey, storageKey, contentType, expectedChecksum, storageVersion } = {}) {
      const validated = validateStorageKey(storageKey, accessKey, contentType);
      const stored = await currentObject(bucketApi, validated.key, text(expectedChecksum), text(storageVersion));
      return { content: new Uint8Array(stored.content), contentType: validated.contentType, byteLength: stored.content.length, storageReference: `supabase://${bucket}/${validated.key}`, versionId: stored.versionId, checksum: stored.checksum };
    },
    async readByReference({ accessKey, storageReference, contentType, expectedChecksum, storageVersion } = {}) {
      const storageKey = parseStorageReference(storageReference, bucket);
      const validated = validateStorageKey(storageKey, accessKey, contentType);
      const stored = await currentObject(bucketApi, validated.key, text(expectedChecksum), text(storageVersion));
      return { content: new Uint8Array(stored.content), contentType: validated.contentType, byteLength: stored.content.length, storageReference: `supabase://${bucket}/${validated.key}`, versionId: stored.versionId, checksum: stored.checksum };
    },
    async createReadGrant({ storageReference, storageVersion, contentType, filename, ttlSeconds } = {}) {
      const key = parseStorageReference(storageReference, bucket);
      const validated = validateStorageKey(key, STORAGE_KEY_PATTERN.exec(key)?.[4], contentType);
      const ttl = Number(ttlSeconds);
      if (!Number.isInteger(ttl) || ttl < 30 || ttl > 300) throw storageError('AV-FISCAL-SUPABASE-TTL', 'O acesso temporário deve durar de 30 a 300 segundos.');
      if (!text(storageVersion)) throw storageError('AV-FISCAL-SUPABASE-VERSION', 'A versão imutável do objeto fiscal é obrigatória.');
      const downloadName = text(filename);
      if (!/^[A-Za-z0-9._-]{5,120}$/.test(downloadName)) throw storageError('AV-FISCAL-SUPABASE-FILENAME', 'O nome do arquivo para download não é seguro.');
      const checked = await currentObject(bucketApi, validated.key, '', text(storageVersion));
      if (checked.versionId !== text(storageVersion)) throw storageError('AV-FISCAL-SUPABASE-VERSION', 'A versão solicitada não corresponde ao objeto fiscal.');
      const response = await bucketApi.createSignedUrl(validated.key, ttl, { download: downloadName });
      if (response.error || !text(response.data?.signedUrl)) throw storageError('AV-FISCAL-SUPABASE-GRANT', 'O Storage não criou o acesso temporário.');
      const issuedAt = new Date(clock());
      return { url: response.data.signedUrl, expiresAt: new Date(issuedAt.getTime() + ttl * 1000).toISOString() };
    },
  });
}
