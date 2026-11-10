import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createSupabaseFiscalArtifactStorage } from '../../app/vendas/lib/server/supabase-fiscal-artifact-storage.mjs';

const ACCESS_KEY = '35260912345678000195550010000000011000000019';
const LOGICAL_KEY = `fiscal/nfe/12345678000195/2026/09/${ACCESS_KEY}-signedNFe.xml`;

function storageFixture() {
  const objects = new Map();
  const bucketApi = {
    async upload(key, body, options) {
      if (objects.has(key)) return { data: null, error: { status: 409, message: 'already exists' } };
      objects.set(key, { body: Buffer.from(body), options });
      return { data: { path: key }, error: null };
    },
    async download(key) {
      const stored = objects.get(key);
      return stored ? { data: new Blob([stored.body]), error: null } : { data: null, error: { status: 404 } };
    },
    async createSignedUrl(key, ttl, options) {
      return objects.has(key) ? { data: { signedUrl: `https://storage.example/${encodeURIComponent(key)}?ttl=${ttl}&download=${options.download}` }, error: null } : { data: null, error: { status: 404 } };
    },
  };
  return {
    objects,
    client: {
      storage: {
        from(bucket) { assert.equal(bucket, 'avantalab-fiscal-private'); return bucketApi; },
        async getBucket() {
          return { data: { public: false, file_size_limit: 10 * 1024 * 1024, allowed_mime_types: ['application/xml', 'application/pdf'] }, error: null };
        },
      },
    },
  };
}

test('bucket privado com versão lógica fica pronto somente para homologação', async () => {
  const fixture = storageFixture();
  const provider = createSupabaseFiscalArtifactStorage({ client: fixture.client, bucket: 'avantalab-fiscal-private', environment: 'homologacao' });
  const readiness = await provider.inspectReadiness();
  assert.equal(readiness.homologationReady, true);
  assert.equal(readiness.productionReady, false);
  assert.equal(readiness.bucket.public, false);
  assert.equal(readiness.bucket.versioning, 'LOGICAL_SHA256');
});

test('cada conteúdo fiscal recebe caminho físico imutável por SHA-256', async () => {
  const fixture = storageFixture();
  const provider = createSupabaseFiscalArtifactStorage({ client: fixture.client, bucket: 'avantalab-fiscal-private', environment: 'homologacao', clock: () => '2026-09-12T15:00:00.000Z' });
  const firstBody = '<NFe>primeira-versao</NFe>';
  const secondBody = '<NFe>segunda-versao</NFe>';
  const firstChecksum = createHash('sha256').update(firstBody).digest('hex');
  const secondChecksum = createHash('sha256').update(secondBody).digest('hex');
  const first = await provider.putImmutable({ accessKey: ACCESS_KEY, storageKey: LOGICAL_KEY, contentType: 'application/xml', content: firstBody, checksum: firstChecksum, byteLength: Buffer.byteLength(firstBody) });
  const second = await provider.putImmutable({ accessKey: ACCESS_KEY, storageKey: LOGICAL_KEY, contentType: 'application/xml', content: secondBody, checksum: secondChecksum, byteLength: Buffer.byteLength(secondBody) });
  assert.notEqual(first.storageReference, second.storageReference);
  assert.match(first.storageReference, new RegExp(`/versions/${firstChecksum}-signedNFe\\.xml$`));
  assert.match(second.storageReference, new RegExp(`/versions/${secondChecksum}-signedNFe\\.xml$`));
  assert.equal(fixture.objects.size, 2);
  const loaded = await provider.readByReference({ accessKey: ACCESS_KEY, storageReference: second.storageReference, storageVersion: second.versionId, contentType: 'application/xml', expectedChecksum: secondChecksum });
  assert.equal(new TextDecoder().decode(loaded.content), secondBody);
});

test('migração cria bucket privado sem liberar policies ao navegador', async () => {
  const migration = await readFile('supabase/migrations/20260912123000_vendas_fiscal_storage_homologacao.sql', 'utf8');
  assert.match(migration, /'avantalab-fiscal-private'/);
  assert.match(migration, /public, file_size_limit, allowed_mime_types/);
  assert.match(migration, /10485760/);
  assert.doesNotMatch(migration, /create policy/i);
});

test('restaura XML e DANFE a partir de outro projeto e rejeita cópia corrompida', async () => {
  const { createSupabaseFiscalBackup } = await import('../../app/vendas/lib/server/supabase-fiscal-backup.mjs');
  const source = storageFixture();
  const copy = storageFixture();
  const options = {
    primary: { client: source.client, bucket: 'avantalab-fiscal-private' },
    primaryUrl: 'https://primary.supabase.co', backupUrl: 'https://backup.supabase.co',
    backupClient: copy.client, backupBucket: 'avantalab-fiscal-private',
  };
  assert.throws(() => createSupabaseFiscalBackup({ ...options, backupUrl: options.primaryUrl }), /outro projeto/);
  const storage = createSupabaseFiscalBackup(options);
  assert.equal((await storage.inspectReadiness()).backupReady, true);
  for (const [suffix, contentType, body] of [
    ['procNFe.xml', 'application/xml', '<synthetic/>'],
    ['danfe.pdf', 'application/pdf', '%PDF-synthetic'],
  ]) {
    const storageKey = LOGICAL_KEY.replace('signedNFe.xml', suffix);
    const checksum = createHash('sha256').update(body).digest('hex');
    const target = { accessKey: ACCESS_KEY, storageKey, contentType };
    const input = { ...target, content: body, checksum, byteLength: Buffer.byteLength(body) };
    await storage.putImmutable(input);
    source.objects.clear();
    const query = { ...target, expectedChecksum: checksum };
    await storage.restore(query);
    assert.equal(Buffer.from((await storage.readVerified(query)).content).toString(), body);
    const physicalKey = [...copy.objects.keys()].find(key => key.endsWith(suffix));
    copy.objects.get(physicalKey).body = Buffer.from('corrompido');
    await assert.rejects(storage.restore(query));
  }
});

test('guarda de produção com versão lógica exige cópia independente e os dois gravadores dedicados', async () => {
  const { createSupabaseFiscalBackup } = await import('../../app/vendas/lib/server/supabase-fiscal-backup.mjs');
  const source = storageFixture();
  const copy = storageFixture();
  const primary = {
    client: source.client, writer: { ...source.client }, bucket: 'avantalab-fiscal-private',
    environment: 'production',
    productionReadiness: { productionReady: true, configuration: { independentCopy: true } },
  };
  const options = {
    primary, primaryUrl: 'https://primary.supabase.co', backupUrl: 'https://backup.supabase.co',
    backupClient: copy.client, backupWriter: copy.client, backupBucket: 'avantalab-fiscal-private',
  };
  assert.equal((await createSupabaseFiscalBackup(options).inspectReadiness()).productionReady, true);
  assert.equal((await createSupabaseFiscalBackup({ ...options, backupWriter: undefined }).inspectReadiness()).productionReady, false);
  assert.equal((await createSupabaseFiscalBackup({ ...options, primary: { ...primary, writer: undefined } }).inspectReadiness()).productionReady, false);
});
