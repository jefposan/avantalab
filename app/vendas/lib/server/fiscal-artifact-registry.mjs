export const FISCAL_ARTIFACT_REGISTRY_REFERENCE = '2026-09-03';

const ARTIFACT_CONTENT_TYPES = Object.freeze({
  signed_xml: 'application/xml',
  protocol_xml: 'application/xml',
  processed_xml: 'application/xml',
  danfe_pdf: 'application/pdf',
});

function error(code, field, message) {
  return { code, field, message };
}

function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function safeReference(value) {
  const reference = text(value);
  return reference.length <= 700
    && /^(?:avantalab-fiscal|supabase|s3):\/\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(reference)
    && !reference.includes('..')
    && !reference.includes('\\');
}

function normalize(input = {}, clock) {
  const artifact = {
    companyId: text(input.companyId),
    emissionId: text(input.emissionId),
    artifactType: text(input.artifactType),
    storageReference: text(input.storageReference),
    storageVersion: text(input.storageVersion),
    checksum: text(input.checksum).toLowerCase(),
    byteLength: Number(input.byteLength),
    contentType: text(input.contentType),
    createdAt: text(input.createdAt) || clock(),
  };
  const errors = [];
  if (!artifact.companyId || !artifact.emissionId) errors.push(error('AV-FISCAL-ARTIFACT-TARGET', 'emissionId', 'Empresa e emissão são obrigatórias para registrar o artefato.'));
  if (!Object.hasOwn(ARTIFACT_CONTENT_TYPES, artifact.artifactType)) errors.push(error('AV-FISCAL-ARTIFACT-TYPE', 'artifactType', 'O tipo de artefato fiscal não é reconhecido.'));
  if (ARTIFACT_CONTENT_TYPES[artifact.artifactType] && artifact.contentType !== ARTIFACT_CONTENT_TYPES[artifact.artifactType]) errors.push(error('AV-FISCAL-ARTIFACT-CONTENT-TYPE', 'contentType', 'O tipo de conteúdo não corresponde ao artefato fiscal.'));
  if (!safeReference(artifact.storageReference)) errors.push(error('AV-FISCAL-ARTIFACT-REFERENCE', 'storageReference', 'A referência do artefato fiscal não é segura.'));
  if (artifact.storageVersion.length > 180) errors.push(error('AV-FISCAL-ARTIFACT-VERSION', 'storageVersion', 'A versão do armazenamento excede o limite permitido.'));
  if (!/^[a-f0-9]{64}$/.test(artifact.checksum)) errors.push(error('AV-FISCAL-ARTIFACT-CHECKSUM', 'checksum', 'O checksum SHA-256 do artefato é obrigatório.'));
  if (!Number.isSafeInteger(artifact.byteLength) || artifact.byteLength <= 0 || artifact.byteLength > 10 * 1024 * 1024) errors.push(error('AV-FISCAL-ARTIFACT-SIZE', 'byteLength', 'O tamanho do artefato fiscal é inválido.'));
  if (!Number.isFinite(Date.parse(artifact.createdAt))) errors.push(error('AV-FISCAL-ARTIFACT-DATE', 'createdAt', 'A data de armazenamento do artefato é inválida.'));
  return { artifact, errors };
}

function sameArtifact(left, right) {
  return left?.storageReference === right.storageReference
    && String(left?.storageVersion || '') === right.storageVersion
    && left?.checksum === right.checksum
    && Number(left?.byteLength) === right.byteLength
    && left?.contentType === right.contentType;
}

export function createFiscalArtifactRegistry({ repository, clock = () => new Date().toISOString() } = {}) {
  return Object.freeze({
    id: 'avantalab-fiscal-artifact-registry-v1',
    async register(input = {}) {
      const validation = normalize(input, clock);
      if (validation.errors.length) return { ok: false, valid: false, persisted: false, reused: false, artifact: null, errors: validation.errors };
      if (repository?.configured !== true || typeof repository.runInTransaction !== 'function') return { ok: false, valid: false, persisted: false, reused: false, artifact: null, errors: [error('AV-FISCAL-ARTIFACT-REPOSITORY', 'repository', 'O registro fiscal persistente ainda não está configurado.')] };
      const artifact = validation.artifact;
      return repository.runInTransaction(async (tx) => {
        await tx.lockKey?.('artifact', artifact.companyId, artifact.emissionId, artifact.artifactType);
        const existing = await tx.findArtifact(artifact.companyId, artifact.emissionId, artifact.artifactType);
        if (existing) {
          if (!sameArtifact(existing, artifact)) return { ok: false, valid: false, persisted: false, reused: false, artifact: existing, errors: [error('AV-FISCAL-ARTIFACT-CONFLICT', 'artifactType', 'Já existe outro conteúdo registrado para este artefato fiscal imutável.')] };
          return { ok: true, valid: true, persisted: true, reused: true, artifact: existing, errors: [] };
        }
        const stored = await tx.insertArtifact(artifact);
        return { ok: Boolean(stored), valid: Boolean(stored), persisted: Boolean(stored), reused: false, artifact: stored, errors: stored ? [] : [error('AV-FISCAL-ARTIFACT-REGISTER', 'artifact', 'O metadado do artefato fiscal não pôde ser registrado.')] };
      });
    },
  });
}
