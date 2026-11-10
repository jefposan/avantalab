import { createSupabaseFiscalArtifactStorage } from './supabase-fiscal-artifact-storage.mjs';

function projectRef(url) {
  const parsed = new URL(url);
  const match = /^([a-z0-9]+)\.supabase\.co$/.exec(parsed.hostname);
  if (!match || parsed.origin !== url || parsed.protocol !== 'https:') throw new TypeError('Informe a origem oficial do projeto Supabase.');
  return match[1];
}

export function createSupabaseFiscalBackup({ primary, primaryUrl, backupClient, backupUrl, backupBucket, backupWriter }) {
  if (projectRef(primaryUrl) === projectRef(backupUrl) || primary.client === backupClient) {
    throw new TypeError('A cópia fiscal exige outro projeto Supabase.');
  }
  const source = createSupabaseFiscalArtifactStorage({
    ...primary,
    independentCopy: primary.productionReadiness?.configuration?.independentCopy === true
      && Boolean(backupWriter),
  });
  const backup = createSupabaseFiscalArtifactStorage({ client: backupClient, writer: backupWriter ?? backupClient, bucket: backupBucket });

  return Object.freeze({
    ...source,
    get homologationReady() { return source.homologationReady; },
    async inspectReadiness() {
      const [main, copy] = await Promise.all([source.inspectReadiness(), backup.inspectReadiness()]);
      return { ...main, backupReady: copy.homologationReady === true,
        productionReady: main.productionReady === true && copy.homologationReady === true };
    },
    async putImmutable(input) {
      // A tentativa só confirma a guarda depois que os dois projetos conferem os bytes.
      await backup.putImmutable(input);
      return source.putImmutable(input);
    },
    async restore({ accessKey, storageKey, contentType, expectedChecksum }) {
      const saved = await backup.readVerified({ accessKey, storageKey, contentType, expectedChecksum });
      return source.putImmutable({ accessKey, storageKey, contentType, content: saved.content,
        checksum: saved.checksum, byteLength: saved.byteLength });
    },
  });
}
