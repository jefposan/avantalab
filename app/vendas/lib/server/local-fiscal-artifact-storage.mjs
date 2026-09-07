import { createHash, randomUUID } from 'node:crypto';
import { chmod, link, lstat, mkdir, open, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

export const LOCAL_FISCAL_ARTIFACT_STORAGE_REFERENCE = '2026-09-03';

const MAX_ARTIFACT_BYTES = 10 * 1024 * 1024;
const STORAGE_KEY_PATTERN = /^fiscal\/nfe\/(\d{14})\/(20\d{2})\/(0[1-9]|1[0-2])\/(\d{44})-(signedNFe\.xml|protocolNFe\.xml|procNFe\.xml|danfe\.pdf)$/;

function storageError(code, message) {
  return Object.assign(new Error(message), { code });
}

function checksum(content) {
  return createHash('sha256').update(content).digest('hex');
}

function validateRoot(rootDirectory) {
  const root = resolve(String(rootDirectory || ''));
  const temporaryRoot = resolve(tmpdir());
  const pathFromTemporaryRoot = relative(temporaryRoot, root);
  if (!rootDirectory || !isAbsolute(String(rootDirectory)) || pathFromTemporaryRoot.startsWith(`..${sep}`) || pathFromTemporaryRoot === '..' || isAbsolute(pathFromTemporaryRoot)) {
    throw new TypeError('O armazenamento fiscal local deve ficar dentro da pasta temporária do laboratório.');
  }
  return root;
}

function validateStorageKey(storageKey, accessKey, contentType) {
  const key = String(storageKey || '').trim();
  const normalizedAccessKey = String(accessKey || '').trim();
  const match = STORAGE_KEY_PATTERN.exec(key);
  if (!match || match[4] !== normalizedAccessKey) throw storageError('AV-FISCAL-STORAGE-KEY', 'A chave de armazenamento fiscal não é válida.');
  if (match[1] !== normalizedAccessKey.slice(6, 20) || match[2] !== `20${normalizedAccessKey.slice(2, 4)}` || match[3] !== normalizedAccessKey.slice(4, 6)) {
    throw storageError('AV-FISCAL-STORAGE-ROUTE', 'A rota do artefato não corresponde à chave de acesso.');
  }
  const expectedContentType = match[5].endsWith('.xml') ? 'application/xml' : 'application/pdf';
  if (contentType && contentType !== expectedContentType) throw storageError('AV-FISCAL-STORAGE-CONTENT-TYPE', 'O tipo do conteúdo não corresponde ao artefato fiscal.');
  return { key, contentType: expectedContentType };
}

function toBuffer(content) {
  if (typeof content === 'string') return Buffer.from(content, 'utf8');
  if (content instanceof Uint8Array) return Buffer.from(content);
  throw storageError('AV-FISCAL-STORAGE-CONTENT', 'O conteúdo fiscal precisa ser texto ou bytes.');
}

function storageReceipt(storageKey, contentChecksum, storedAt, reused = false) {
  return {
    storageReference: `avantalab-fiscal://${storageKey}`,
    versionId: contentChecksum,
    checksum: contentChecksum,
    storedAt,
    reused,
  };
}

function storageKeyFromReference(storageReference) {
  const prefix = 'avantalab-fiscal://';
  const reference = String(storageReference || '').trim();
  if (!reference.startsWith(prefix)) throw storageError('AV-FISCAL-STORAGE-REFERENCE', 'A referência não pertence ao armazenamento fiscal local.');
  const key = reference.slice(prefix.length);
  if (!key || key.includes('..') || key.includes('\\')) throw storageError('AV-FISCAL-STORAGE-REFERENCE', 'A referência do artefato fiscal não é segura.');
  return key;
}

async function ensurePrivateDirectory(root, storageKey) {
  await mkdir(root, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);
  const rootRealPath = await realpath(root);
  const directory = dirname(resolve(root, storageKey));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const directoryRealPath = await realpath(directory);
  if (directoryRealPath !== rootRealPath && !directoryRealPath.startsWith(`${rootRealPath}${sep}`)) {
    throw storageError('AV-FISCAL-STORAGE-PATH', 'A rota do artefato saiu da área privada permitida.');
  }
  return { directory, target: resolve(directory, basename(storageKey)) };
}

async function readExisting(target, storageKey, expectedChecksum) {
  let details;
  try {
    details = await lstat(target);
  } catch (cause) {
    if (cause?.code === 'ENOENT') return null;
    throw cause;
  }
  if (!details.isFile() || details.isSymbolicLink()) throw storageError('AV-FISCAL-STORAGE-FILE', 'O artefato fiscal existente não é um arquivo privado regular.');
  const content = await readFile(target);
  const actualChecksum = checksum(content);
  if (expectedChecksum && actualChecksum !== expectedChecksum) throw storageError('AV-FISCAL-STORAGE-CONFLICT', 'Já existe outro conteúdo para a mesma chave fiscal.');
  return { content, details, receipt: storageReceipt(storageKey, actualChecksum, details.birthtime.toISOString(), true) };
}

export function createLocalFiscalArtifactStorage({ rootDirectory, clock = () => new Date().toISOString() } = {}) {
  const root = validateRoot(rootDirectory);
  return Object.freeze({
    id: 'avantalab-local-fiscal-artifact-storage-v1',
    configured: true,
    environment: 'local-lab',
    async findByAccessKey({ accessKey, storageKey } = {}) {
      const validated = validateStorageKey(storageKey, accessKey);
      const { target } = await ensurePrivateDirectory(root, validated.key);
      const existing = await readExisting(target, validated.key);
      return existing?.receipt || null;
    },
    async putImmutable({ accessKey, storageKey, contentType, content, checksum: expectedChecksum, byteLength } = {}) {
      const validated = validateStorageKey(storageKey, accessKey, contentType);
      const body = toBuffer(content);
      if (body.length === 0 || body.length > MAX_ARTIFACT_BYTES) throw storageError('AV-FISCAL-STORAGE-SIZE', 'O artefato fiscal possui tamanho inválido para a guarda local.');
      if (Number(byteLength) !== body.length) throw storageError('AV-FISCAL-STORAGE-LENGTH', 'O tamanho informado não corresponde ao conteúdo fiscal.');
      const actualChecksum = checksum(body);
      if (!/^[a-f0-9]{64}$/.test(String(expectedChecksum || '')) || actualChecksum !== expectedChecksum) throw storageError('AV-FISCAL-STORAGE-CHECKSUM', 'A integridade do artefato fiscal não foi confirmada.');
      const { directory, target } = await ensurePrivateDirectory(root, validated.key);
      const existing = await readExisting(target, validated.key, actualChecksum);
      if (existing) return existing.receipt;

      const temporaryFile = resolve(directory, `.${basename(target)}.${randomUUID()}.tmp`);
      let handle;
      try {
        handle = await open(temporaryFile, 'wx', 0o600);
        await handle.writeFile(body);
        await handle.sync();
        await handle.close();
        handle = null;
        try {
          await link(temporaryFile, target);
        } catch (cause) {
          if (cause?.code !== 'EEXIST') throw cause;
          const concurrent = await readExisting(target, validated.key, actualChecksum);
          if (!concurrent) throw cause;
          return concurrent.receipt;
        }
        await chmod(target, 0o600);
        const directoryHandle = await open(directory, 'r');
        try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
        return storageReceipt(validated.key, actualChecksum, clock(), false);
      } finally {
        if (handle) await handle.close().catch(() => {});
        await rm(temporaryFile, { force: true }).catch(() => {});
      }
    },
    async readVerified({ accessKey, storageKey, contentType, expectedChecksum } = {}) {
      const validated = validateStorageKey(storageKey, accessKey, contentType);
      const { target } = await ensurePrivateDirectory(root, validated.key);
      const existing = await readExisting(target, validated.key, expectedChecksum);
      if (!existing) throw storageError('AV-FISCAL-STORAGE-NOT-FOUND', 'O artefato fiscal não foi encontrado.');
      return {
        content: new Uint8Array(existing.content),
        contentType: validated.contentType,
        byteLength: existing.content.length,
        ...existing.receipt,
      };
    },
    async readByReference({ accessKey, storageReference, contentType, expectedChecksum } = {}) {
      const storageKey = storageKeyFromReference(storageReference);
      const validated = validateStorageKey(storageKey, accessKey, contentType);
      const { target } = await ensurePrivateDirectory(root, validated.key);
      const existing = await readExisting(target, validated.key, expectedChecksum);
      if (!existing) throw storageError('AV-FISCAL-STORAGE-NOT-FOUND', 'O artefato fiscal não foi encontrado.');
      return { content: new Uint8Array(existing.content), contentType: validated.contentType, byteLength: existing.content.length, ...existing.receipt };
    },
    async inspect({ accessKey, storageKey } = {}) {
      const validated = validateStorageKey(storageKey, accessKey);
      const { target } = await ensurePrivateDirectory(root, validated.key);
      const existing = await readExisting(target, validated.key);
      if (!existing) return null;
      return {
        ...existing.receipt,
        byteLength: existing.content.length,
        fileMode: existing.details.mode & 0o777,
        rootMode: (await lstat(root)).mode & 0o777,
        contentReturned: false,
      };
    },
  });
}
