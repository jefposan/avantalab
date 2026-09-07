import { createHash } from 'node:crypto';
import { createFiscalEmissionLifecycleService } from './fiscal-emission-lifecycle.mjs';
import { buildNfeDanfe } from './nfe-danfe.mjs';
import { buildNfeDanfeArtifact, nfeDanfeStorageKey, persistNfeDanfeArtifact } from './nfe-danfe-artifact.mjs';
import { buildProcessedNfeArtifact, nfeProcessedStorageKey, persistProcessedNfeArtifact } from './nfe-processed-artifact.mjs';
import { buildNfeProtocolArtifact, persistNfeProtocolArtifact } from './nfe-protocol-artifact.mjs';

export const FISCAL_ARTIFACT_RECOVERY_REFERENCE = '2026-09-05';

function failure(failureCode, failureReason) {
  return { ok: false, failureCode, failureReason, contentReturned: false };
}

function xmlBlock(xml, localName) {
  return new RegExp(`<(?:(?:[A-Za-z_][\\w.-]*):)?${localName}\\b[^>]*>[\\s\\S]*?<\\/(?:(?:[A-Za-z_][\\w.-]*):)?${localName}>`, 'i').exec(xml)?.[0] || '';
}

function laterThanAuthorization(state) {
  return ['artifacts_stored', 'danfe_ready', 'canceled'].includes(state);
}

function operationKey(prefix, job) {
  return `${prefix}:${createHash('sha256').update(`${job.companyId}:${job.emissionId}:${job.id}`).digest('hex').slice(0, 48)}`;
}

async function snapshot(repository, job, artifactTypes = []) {
  return repository.runInTransaction(async (tx) => {
    const emission = await tx.getEmission(job.emissionId);
    const artifacts = {};
    for (const artifactType of artifactTypes) artifacts[artifactType] = await tx.findArtifact(job.companyId, job.emissionId, artifactType);
    return { emission, artifacts };
  });
}

function available(repository, storageProvider) {
  return repository?.configured === true
    && typeof repository.runInTransaction === 'function'
    && storageProvider?.configured === true
    && typeof storageProvider.readVerified === 'function';
}

export function createFiscalArtifactRecoveryHandlers({ repository, storageProvider, returnAdapter, certificateBindingResolver, issuerDocumentResolver, internalErrorReporter, clock = () => new Date().toISOString() } = {}) {
  const lifecycle = createFiscalEmissionLifecycleService({ repository, clock });

  async function reconcileAuthorization(job = {}) {
    if (!repository?.configured || typeof repository.runInTransaction !== 'function') return failure('AV-FISCAL-RECOVERY-REPOSITORY', 'O repositório fiscal não está disponível para a consulta.');
    if (!available(repository, storageProvider) || typeof storageProvider.readByReference !== 'function') return failure('AV-FISCAL-RECOVERY-STORAGE', 'A guarda fiscal privada não está disponível para reconciliar a consulta.');
    const current = await snapshot(repository, job);
    const emission = current.emission;
    if (!emission || emission.companyId !== job.companyId || !/^\d{44}$/.test(emission.accessKey || '')) return failure('AV-FISCAL-RECOVERY-EMISSION', 'A emissão fiscal da tarefa não foi encontrada ou está incompleta.');
    if (['authorized', 'artifacts_stored', 'danfe_ready', 'rejected', 'failed', 'canceled'].includes(emission.state)) return { ok: true, reconciled: true, stale: true, state: emission.state, contentReturned: false };
    if (!['submitted', 'processing'].includes(emission.state)) return failure('AV-FISCAL-RECOVERY-STATE', 'A emissão não está aguardando consulta de autorização.');
    if (!returnAdapter?.queryReceiptProtected || !returnAdapter?.queryProtocolProtected || typeof certificateBindingResolver !== 'function' || typeof issuerDocumentResolver !== 'function') return failure('AV-FISCAL-RECOVERY-RETURN-ADAPTER', 'A consulta segura de retorno fiscal ainda não está configurada.');
    let binding;
    let expectedDocument;
    try {
      [binding, expectedDocument] = await Promise.all([
        certificateBindingResolver({ companyId: job.companyId, establishmentId: emission.establishmentId, documentType: 'nfe' }),
        issuerDocumentResolver({ companyId: job.companyId, establishmentId: emission.establishmentId }),
      ]);
    } catch {
      return failure('AV-FISCAL-RECOVERY-CERTIFICATE', 'O certificado e o cadastro do emissor não puderam ser confirmados.');
    }
    if (!binding?.secureReference || !/^\d{14}$/.test(String(expectedDocument || '').replace(/\D/g, ''))) return failure('AV-FISCAL-RECOVERY-CERTIFICATE', 'O certificado ativo e o CNPJ do emissor são necessários para consultar a SEFAZ.');
    const options = { secureReference: binding.secureReference, expectedDocument, expectedMode: binding.expectedMode || 'Certificado A1', expectedAccessKey: emission.accessKey };
    let result;
    try {
      result = emission.state === 'processing'
        ? await returnAdapter.queryReceiptProtected({ ...options, receiptNumber: emission.receiptNumber })
        : await returnAdapter.queryProtocolProtected({ ...options, accessKey: emission.accessKey });
      if (result?.needsProtocolConsultation === true) result = await returnAdapter.queryProtocolProtected({ ...options, accessKey: emission.accessKey });
    } catch (cause) {
      if (typeof internalErrorReporter === 'function') {
        try { await internalErrorReporter({ service: 'fiscal-authorization-recovery', cause }); } catch {}
      }
      return failure('AV-FISCAL-RECOVERY-QUERY', 'A consulta segura não foi concluída e será tentada novamente.');
    }
    if (result?.pending === true) return failure('AV-FISCAL-RECOVERY-PENDING', 'A SEFAZ ainda está processando o lote; a consulta será repetida sem retransmissão.');
    if (result?.valid !== true) return failure('AV-FISCAL-RECOVERY-RETURN', 'A resposta da consulta não pôde ser validada com segurança.');
    if (result.authorized === true && result.protocolXml) {
      let signedLoaded;
      const signed = await snapshot(repository, job, ['signed_xml']);
      if (!signed.artifacts.signed_xml) return failure('AV-FISCAL-RECOVERY-SIGNED-MISSING', 'O XML assinado imutável não foi localizado para reconciliar a autorização.');
      try {
        signedLoaded = await storageProvider.readByReference({ accessKey: emission.accessKey, storageReference: signed.artifacts.signed_xml.storageReference, storageVersion: signed.artifacts.signed_xml.storageVersion, contentType: 'application/xml', expectedChecksum: signed.artifacts.signed_xml.checksum });
      } catch {
        return failure('AV-FISCAL-RECOVERY-SIGNED-MISSING', 'O XML assinado não está disponível ou não passou na verificação de integridade.');
      }
      const signedXml = new TextDecoder().decode(signedLoaded.content);
      const protocol = buildNfeProtocolArtifact({ signedXml, protocolXml: result.protocolXml, expectedAccessKey: emission.accessKey });
      if (!protocol.valid) return failure('AV-FISCAL-RECOVERY-PROTOCOL', 'O protocolo consultado não corresponde ao XML assinado.');
      const stored = await persistNfeProtocolArtifact({ artifact: protocol, provider: storageProvider });
      if (!stored.valid) return failure('AV-FISCAL-RECOVERY-PROTOCOL-STORE', 'O protocolo autorizado não pôde ser gravado na guarda fiscal.');
      const committed = await lifecycle.commitAuthorization({ companyId: job.companyId, emissionId: job.emissionId, expectedVersion: emission.version, operationKey: operationKey('recover-authorize', job), accessKey: emission.accessKey, protocolNumber: protocol.protocolNumber, authorizedAt: protocol.receivedAt, statusReason: protocol.reason, artifact: { artifactType: 'protocol_xml', storageReference: stored.storageReference, storageVersion: stored.versionId, checksum: protocol.checksum, byteLength: protocol.byteLength, contentType: 'application/xml', createdAt: stored.storedAt }, publicPayload: { recoveryJobId: job.id, authority: 'SEFAZ/SP', environment: 'homologacao', queryKind: emission.state === 'processing' ? 'receipt' : 'protocol' } });
      if (!committed.ok) return failure('AV-FISCAL-RECOVERY-AUTHORIZATION-COMMIT', 'O protocolo foi conferido, mas o estado fiscal precisa ser reconciliado novamente.');
      return { ok: true, reconciled: true, authorized: true, state: committed.emission.state, protocolStored: true, contentReturned: false };
    }
    if (result.canceled === true) return failure('AV-FISCAL-RECOVERY-CANCELED', 'A consulta encontrou cancelamento e exige reconciliação fiscal específica antes de alterar o estado.');
    const rejectionCode = String(result.protocolStatus || '');
    if (/^\d{3}$/.test(rejectionCode) && rejectionCode !== '100') {
      const rejected = await lifecycle.transition({ companyId: job.companyId, emissionId: job.emissionId, expectedVersion: emission.version, operationKey: operationKey('recover-reject', job), toState: 'rejected', patch: { statusCode: rejectionCode, statusReason: result.protocolReason || result.reason }, eventType: 'emission.rejected.after_query', publicPayload: { recoveryJobId: job.id, authority: 'SEFAZ/SP', environment: 'homologacao', statusCode: rejectionCode } });
      if (!rejected.ok) return failure('AV-FISCAL-RECOVERY-REJECTION-COMMIT', 'A rejeição foi consultada, mas o estado fiscal precisa ser reconciliado novamente.');
      return { ok: true, reconciled: true, rejected: true, state: rejected.emission.state, contentReturned: false };
    }
    return failure('AV-FISCAL-RECOVERY-NOT-FOUND', 'A autorização ainda não foi localizada; a consulta será repetida sem retransmissão.');
  }

  async function recoverProcessedArtifact(job = {}) {
    if (!available(repository, storageProvider)) return failure('AV-FISCAL-RECOVERY-STORAGE', 'A guarda fiscal privada não está disponível para a recuperação.');
    const current = await snapshot(repository, job, ['signed_xml', 'protocol_xml', 'processed_xml']);
    const emission = current.emission;
    if (!emission || emission.companyId !== job.companyId || !/^\d{44}$/.test(emission.accessKey || '')) return failure('AV-FISCAL-RECOVERY-EMISSION', 'A emissão fiscal da tarefa não foi encontrada ou está incompleta.');
    if (emission.state !== 'authorized' && !laterThanAuthorization(emission.state)) return failure('AV-FISCAL-RECOVERY-STATE', 'A emissão ainda não está autorizada para guardar o XML processado.');
    const storageKey = nfeProcessedStorageKey(emission.accessKey);
    if (!current.artifacts.processed_xml && emission.state === 'authorized') {
      if (!current.artifacts.signed_xml || !current.artifacts.protocol_xml) return failure('AV-FISCAL-RECOVERY-PROCESSED-MISSING', 'O XML assinado e o protocolo autorizado são necessários para formar o XML final.');
      if (typeof storageProvider.readByReference !== 'function') return failure('AV-FISCAL-RECOVERY-STORAGE', 'A leitura protegida da guarda fiscal não está disponível.');
      let signed;
      let protocol;
      try {
        [signed, protocol] = await Promise.all([
          storageProvider.readByReference({ accessKey: emission.accessKey, storageReference: current.artifacts.signed_xml.storageReference, storageVersion: current.artifacts.signed_xml.storageVersion, contentType: 'application/xml', expectedChecksum: current.artifacts.signed_xml.checksum }),
          storageProvider.readByReference({ accessKey: emission.accessKey, storageReference: current.artifacts.protocol_xml.storageReference, storageVersion: current.artifacts.protocol_xml.storageVersion, contentType: 'application/xml', expectedChecksum: current.artifacts.protocol_xml.checksum }),
        ]);
      } catch {
        return failure('AV-FISCAL-RECOVERY-PROCESSED-SOURCE', 'O XML assinado ou o protocolo não passou na verificação de integridade.');
      }
      const artifact = buildProcessedNfeArtifact({ signedXml: new TextDecoder().decode(signed.content), protocolXml: new TextDecoder().decode(protocol.content), expectedAccessKey: emission.accessKey });
      if (!artifact.valid) return failure('AV-FISCAL-RECOVERY-PROCESSED-BUILD', 'O XML autorizado não pôde ser formado a partir dos documentos conferidos.');
      const stored = await persistProcessedNfeArtifact({ artifact, provider: storageProvider });
      if (!stored.valid) return failure('AV-FISCAL-RECOVERY-PROCESSED-STORE', 'O XML autorizado não pôde ser gravado na guarda fiscal.');
      const committed = await lifecycle.commitProcessedArtifact({ companyId: job.companyId, emissionId: job.emissionId, expectedVersion: emission.version, operationKey: operationKey('recover-processed', job), artifact: { artifactType: 'processed_xml', storageReference: stored.storageReference, storageVersion: stored.versionId, checksum: artifact.checksum, byteLength: artifact.byteLength, contentType: 'application/xml', createdAt: stored.storedAt }, publicPayload: { recoveryJobId: job.id, artifactType: 'processed_xml' } });
      if (!committed.ok) return failure('AV-FISCAL-RECOVERY-PROCESSED-TRANSITION', 'O XML foi gravado, mas o estado fiscal precisa ser reconciliado novamente.');
      return { ok: true, artifactType: 'processed_xml', persisted: true, reused: stored.reused || committed.reused, contentReturned: false };
    }
    let loaded;
    try {
      loaded = await storageProvider.readVerified({ accessKey: emission.accessKey, storageKey, contentType: 'application/xml', expectedChecksum: current.artifacts.processed_xml?.checksum || emission.processedChecksum || undefined });
    } catch {
      return failure('AV-FISCAL-RECOVERY-PROCESSED-MISSING', 'O XML autorizado não está disponível ou não passou na verificação de integridade.');
    }
    const processedXml = new TextDecoder().decode(loaded.content);
    const validated = buildProcessedNfeArtifact({ signedXml: xmlBlock(processedXml, 'NFe'), protocolXml: xmlBlock(processedXml, 'protNFe'), expectedAccessKey: emission.accessKey });
    if (!validated.valid || validated.checksum !== loaded.checksum) return failure('AV-FISCAL-RECOVERY-PROCESSED-INTEGRITY', 'O XML autorizado não corresponde à emissão fiscal registrada.');
    if (emission.state === 'authorized') {
      const transitioned = await lifecycle.commitProcessedArtifact({ companyId: job.companyId, emissionId: job.emissionId, expectedVersion: emission.version, operationKey: operationKey('recover-processed', job), artifact: { artifactType: 'processed_xml', storageReference: loaded.storageReference, storageVersion: loaded.versionId, checksum: loaded.checksum, byteLength: loaded.byteLength, contentType: 'application/xml', createdAt: loaded.storedAt }, publicPayload: { recoveryJobId: job.id, artifactType: 'processed_xml' } });
      if (!transitioned.ok) return failure('AV-FISCAL-RECOVERY-PROCESSED-TRANSITION', 'O XML foi conferido, mas o estado fiscal precisa ser reconciliado novamente.');
    } else if (emission.processedStorageReference !== loaded.storageReference || emission.processedChecksum !== loaded.checksum) {
      return failure('AV-FISCAL-RECOVERY-PROCESSED-CONFLICT', 'A referência do XML autorizado diverge do estado fiscal imutável.');
    }
    return { ok: true, artifactType: 'processed_xml', persisted: true, reused: true, contentReturned: false };
  }

  async function recoverDanfeArtifact(job = {}) {
    if (!available(repository, storageProvider)) return failure('AV-FISCAL-RECOVERY-STORAGE', 'A guarda fiscal privada não está disponível para a recuperação.');
    const current = await snapshot(repository, job, ['processed_xml', 'danfe_pdf']);
    const emission = current.emission;
    if (!emission || emission.companyId !== job.companyId || !/^\d{44}$/.test(emission.accessKey || '')) return failure('AV-FISCAL-RECOVERY-EMISSION', 'A emissão fiscal da tarefa não foi encontrada ou está incompleta.');
    if (!['artifacts_stored', 'danfe_ready', 'canceled'].includes(emission.state) || !current.artifacts.processed_xml) return failure('AV-FISCAL-RECOVERY-DANFE-PREREQUISITE', 'O XML autorizado ainda não está registrado para gerar o DANFE.');
    let loadedXml;
    try {
      loadedXml = await storageProvider.readVerified({ accessKey: emission.accessKey, storageKey: nfeProcessedStorageKey(emission.accessKey), contentType: 'application/xml', expectedChecksum: current.artifacts.processed_xml.checksum });
    } catch {
      return failure('AV-FISCAL-RECOVERY-PROCESSED-MISSING', 'O XML autorizado não está disponível ou não passou na verificação de integridade.');
    }
    if (emission.processedStorageReference !== loadedXml.storageReference || emission.processedChecksum !== loadedXml.checksum) return failure('AV-FISCAL-RECOVERY-PROCESSED-CONFLICT', 'A referência do XML autorizado diverge do estado fiscal imutável.');
    const danfe = buildNfeDanfe({ processedXml: new TextDecoder().decode(loadedXml.content), expectedAccessKey: emission.accessKey });
    const artifact = buildNfeDanfeArtifact({ danfe });
    if (!artifact.valid || artifact.storageKey !== nfeDanfeStorageKey(emission.accessKey)) return failure('AV-FISCAL-RECOVERY-DANFE-BUILD', 'O DANFE não pôde ser reconstruído a partir do XML autorizado.');
    const stored = await persistNfeDanfeArtifact({ artifact, provider: storageProvider });
    if (!stored.ok) return failure('AV-FISCAL-RECOVERY-DANFE-STORE', 'O DANFE não pôde ser gravado ou reconciliado na guarda privada.');
    if (emission.state === 'artifacts_stored') {
      const transitioned = await lifecycle.commitDanfeArtifact({ companyId: job.companyId, emissionId: job.emissionId, expectedVersion: emission.version, operationKey: operationKey('recover-danfe', job), artifact: { artifactType: 'danfe_pdf', storageReference: stored.storageReference, storageVersion: stored.versionId, checksum: artifact.checksum, byteLength: artifact.byteLength, contentType: 'application/pdf', createdAt: stored.storedAt }, publicPayload: { recoveryJobId: job.id, artifactType: 'danfe_pdf' } });
      if (!transitioned.ok) return failure('AV-FISCAL-RECOVERY-DANFE-TRANSITION', 'O DANFE foi conferido, mas o estado fiscal precisa ser reconciliado novamente.');
    } else if (emission.danfeStorageReference !== stored.storageReference || emission.danfeChecksum !== artifact.checksum) {
      return failure('AV-FISCAL-RECOVERY-DANFE-CONFLICT', 'A referência do DANFE diverge do estado fiscal imutável.');
    }
    return { ok: true, artifactType: 'danfe_pdf', persisted: true, reused: stored.reused, contentReturned: false };
  }

  return Object.freeze({
    authorization_status: reconcileAuthorization,
    receipt_status: reconcileAuthorization,
    processed_artifact: recoverProcessedArtifact,
    danfe_generation: recoverDanfeArtifact,
  });
}
