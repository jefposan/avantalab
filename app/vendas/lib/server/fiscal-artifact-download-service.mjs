import { evaluateAccessDecision } from '../access-control.mjs';
import { FISCAL_DOCUMENT_DOWNLOAD_PERMISSIONS } from './fiscal-durable-storage-policy.mjs';

export const FISCAL_ARTIFACT_DOWNLOAD_REFERENCE = '2026-09-03';

const DOWNLOADABLE_ARTIFACTS = Object.freeze({
  processed_xml: { contentType: 'application/xml', suffix: 'procNFe.xml' },
  danfe_pdf: { contentType: 'application/pdf', suffix: 'DANFE.pdf' },
});

function error(code, field, message) {
  return { code, field, message };
}

function text(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function denied(reason, errors) {
  return { ok: false, authorized: false, grantIssued: false, reason, download: null, errors };
}

function safeFilename(artifact) {
  const accessKey = /^[0-9]{44}$/.test(text(artifact.accessKey)) ? text(artifact.accessKey) : text(artifact.emissionId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48);
  return `NFe-${accessKey || 'documento'}-${DOWNLOADABLE_ARTIFACTS[artifact.artifactType].suffix}`;
}

function validGrant(grant, now, requestedTtlSeconds) {
  const expiresAt = new Date(text(grant?.expiresAt));
  const url = text(grant?.url);
  const lifetime = expiresAt.getTime() - now.getTime();
  return /^https:\/\//i.test(url)
    && Number.isFinite(expiresAt.getTime())
    && lifetime > 0
    && lifetime <= requestedTtlSeconds * 1000 + 1000;
}

export function createFiscalArtifactDownloadService({ repository, storageProvider, auditWriter, clock = () => new Date().toISOString(), maxTtlSeconds = 120 } = {}) {
  const serviceTtl = Number(maxTtlSeconds);
  if (!Number.isInteger(serviceTtl) || serviceTtl < 30 || serviceTtl > 300) throw new TypeError('O prazo do acesso fiscal deve estar entre 30 e 300 segundos.');
  return Object.freeze({
    id: 'avantalab-fiscal-artifact-download-v1',
    async authorize(input = {}) {
      const artifactType = text(input.artifactType);
      const artifactDefinition = DOWNLOADABLE_ARTIFACTS[artifactType];
      if (!artifactDefinition) return denied('artifact_not_downloadable', [error('AV-FISCAL-DOWNLOAD-TYPE', 'artifactType', 'Somente o XML autorizado e o DANFE podem ser baixados por este fluxo.')]);
      if (auditWriter?.configured !== true || typeof auditWriter.appendArtifactAccessEvent !== 'function') return denied('audit_unavailable', [error('AV-FISCAL-DOWNLOAD-AUDIT', 'auditWriter', 'A trilha de auditoria fiscal não está disponível.')]);
      const permission = FISCAL_DOCUMENT_DOWNLOAD_PERMISSIONS[artifactType];
      const access = evaluateAccessDecision({ boundary: input.boundary, effectivePermissions: input.effectivePermissions, permission });
      const occurredAt = clock();
      const baseEvent = {
        companyId: access.session.companyId,
        actorId: access.session.userId,
        artifactId: text(input.artifactId),
        artifactType,
        permission,
        occurredAt,
      };
      if (!access.allowed) {
        if (access.session.authenticated && access.session.userId && access.session.companyId) await auditWriter.appendArtifactAccessEvent({ ...baseEvent, outcome: 'denied', reasonCode: access.reason });
        return denied(access.reason, [error('AV-FISCAL-DOWNLOAD-ACCESS', 'permission', 'Este usuário não possui acesso a este documento fiscal.')]);
      }
      if (repository?.configured !== true || typeof repository.findArtifactForDownload !== 'function') return denied('repository_unavailable', [error('AV-FISCAL-DOWNLOAD-REPOSITORY', 'repository', 'O catálogo privado de documentos fiscais não está disponível.')]);
      const storageReady = storageProvider?.environment === 'production'
        ? storageProvider?.productionReady === true
        : storageProvider?.environment === 'homologacao' && storageProvider?.homologationReady === true;
      if (storageProvider?.configured !== true || !storageReady || typeof storageProvider.createReadGrant !== 'function') return denied('storage_unavailable', [error('AV-FISCAL-DOWNLOAD-STORAGE', 'storageProvider', 'A guarda fiscal privada não está disponível ou não passou pelas proteções do ambiente atual.')]);
      const artifact = await repository.findArtifactForDownload({ companyId: access.session.companyId, artifactId: text(input.artifactId), artifactType });
      if (!artifact || text(artifact.companyId) !== access.session.companyId || artifact.artifactType !== artifactType || artifact.contentType !== artifactDefinition.contentType) {
        await auditWriter.appendArtifactAccessEvent({ ...baseEvent, outcome: 'denied', reasonCode: 'artifact_not_found' });
        return denied('artifact_not_found', [error('AV-FISCAL-DOWNLOAD-NOT-FOUND', 'artifactId', 'O documento fiscal não foi encontrado nesta empresa.')]);
      }
      const requestedTtl = Number(input.ttlSeconds ?? serviceTtl);
      const ttlSeconds = Number.isInteger(requestedTtl) ? Math.min(serviceTtl, Math.max(30, requestedTtl)) : serviceTtl;
      let grant;
      try {
        grant = await storageProvider.createReadGrant({
          storageReference: artifact.storageReference,
          storageVersion: artifact.storageVersion,
          checksum: artifact.checksum,
          contentType: artifact.contentType,
          filename: safeFilename(artifact),
          ttlSeconds,
        });
      } catch {
        await auditWriter.appendArtifactAccessEvent({ ...baseEvent, emissionId: artifact.emissionId, outcome: 'failed', reasonCode: 'grant_failed' });
        return denied('grant_failed', [error('AV-FISCAL-DOWNLOAD-GRANT', 'storageProvider', 'Não foi possível preparar o acesso temporário ao documento fiscal.')]);
      }
      const now = new Date(occurredAt);
      if (!validGrant(grant, now, ttlSeconds)) {
        await auditWriter.appendArtifactAccessEvent({ ...baseEvent, emissionId: artifact.emissionId, outcome: 'failed', reasonCode: 'invalid_grant' });
        return denied('invalid_grant', [error('AV-FISCAL-DOWNLOAD-GRANT-INVALID', 'storageProvider', 'O provedor não retornou um acesso temporário seguro.')]);
      }
      try {
        await auditWriter.appendArtifactAccessEvent({ ...baseEvent, emissionId: artifact.emissionId, outcome: 'granted', reasonCode: 'allowed', grantExpiresAt: grant.expiresAt });
      } catch {
        return denied('audit_failed', [error('AV-FISCAL-DOWNLOAD-AUDIT-WRITE', 'auditWriter', 'O acesso foi bloqueado porque a auditoria não pôde ser registrada.')]);
      }
      return {
        ok: true,
        authorized: true,
        grantIssued: true,
        reason: 'allowed',
        download: Object.freeze({ url: grant.url, expiresAt: grant.expiresAt, filename: safeFilename(artifact), contentType: artifact.contentType }),
        errors: [],
      };
    },
  });
}
