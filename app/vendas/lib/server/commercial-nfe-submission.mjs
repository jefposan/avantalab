import { createHash } from 'node:crypto';
import { buildNfeProtocolArtifact, persistNfeProtocolArtifact } from './nfe-protocol-artifact.mjs';
import { verifyProtectedSignedNfeXml } from './nfe-signature-lab.mjs';

export const COMMERCIAL_NFE_SUBMISSION_REFERENCE = '2026-09-05';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const clean = (value) => String(value ?? '').trim();
const issue = (code, field, message) => ({ code, field, message });

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.issue'] !== true) return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite transmitir a nota.');
  return null;
}

export function deriveNfeLotId(operationKey, emissionId) {
  const digest = createHash('sha256').update(`${clean(operationKey)}:${clean(emissionId)}`).digest('hex');
  return String((BigInt(`0x${digest.slice(0, 16)}`) % 999999999999999n) + 1n);
}

function followupKey(prefix, operationKey, emissionId) {
  return `${prefix}:${createHash('sha256').update(`${clean(operationKey)}:${clean(emissionId)}`).digest('hex').slice(0, 48)}`;
}

function validateLoaded(data, expectedVersion) {
  const emission = data?.emission;
  const draft = data?.draft;
  const artifact = data?.signedArtifact;
  if (!emission || !draft || !artifact) return issue('AV-NFE-SUBMISSION-NOT-FOUND', 'emission', 'A NF-e assinada não foi localizada nesta empresa.');
  if (emission.version !== expectedVersion) return issue('AV-NFE-SUBMISSION-CONFLICT', 'expectedVersion', 'A emissão foi alterada; atualize a Central Fiscal antes de enviar.');
  if (emission.state !== 'signed' || emission.documentType !== 'nfe' || emission.model !== '55' || emission.environment !== 'homologacao') return issue('AV-NFE-SUBMISSION-STATE', 'state', 'Somente uma NF-e assinada em homologação pode iniciar o envio.');
  if (!/^\d{44}$/.test(emission.accessKey) || !/^[a-f0-9]{64}$/.test(emission.signedChecksum)) return issue('AV-NFE-SUBMISSION-INTEGRITY', 'signature', 'A identificação do XML assinado está incompleta.');
  if (artifact.artifactType !== 'signed_xml' || artifact.checksum !== emission.signedChecksum || artifact.contentType !== 'application/xml') return issue('AV-NFE-SUBMISSION-ARTIFACT', 'artifact', 'O artefato assinado não corresponde à emissão preparada.');
  if (draft.companyId !== emission.companyId || draft.id !== emission.draftId || draft.issuerSnapshot?.establishmentId !== emission.establishmentId) return issue('AV-NFE-SUBMISSION-LINK', 'draft', 'O vínculo entre emissão, rascunho e empresa não pôde ser confirmado.');
  return null;
}

export function createPostgresCommercialNfeSubmissionRepository({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async load({ companyId, emissionId }) {
      const result = await pool.query(`
        select e.*,r.empresa_id as rascunho_empresa_id,
          coalesce(c.issuer_snapshot,r.emitente_retrato) as emitente_retrato,
          a.id as artefato_id,a.artifact_type,a.storage_reference,a.storage_version,
          a.checksum_sha256,a.byte_length,a.content_type,a.created_at as artefato_criado_em
        from fiscal_private.emissions e
        join public.vendas_fiscal_rascunhos r on r.empresa_id=e.company_id and r.id::text=e.draft_id
        left join lateral (
          select x.* from fiscal_private.emission_corrections x
          where x.company_id=e.company_id and x.emission_id=e.id
          order by x.revision desc limit 1
        ) c on true
        join lateral (
          select x.* from fiscal_private.artifacts x
          where x.company_id=e.company_id and x.emission_id=e.id and x.artifact_type='signed_xml'
            and x.checksum_sha256=e.signed_checksum
          order by x.revision desc limit 1
        ) a on true
        where e.company_id=$1 and e.id=$2
      `, [companyId, emissionId]);
      const row = result.rows?.[0];
      if (!row) return null;
      return {
        emission: { id: row.id, companyId: row.company_id, establishmentId: row.establishment_id, draftId: row.draft_id, documentType: row.document_type, model: row.model, environment: row.environment, state: row.state, version: Number(row.version), series: row.series || '', number: Number(row.number || 0), reservationId: row.reservation_id || '', accessKey: row.access_key || '', signedChecksum: row.signed_checksum || '' },
        draft: { id: row.draft_id, companyId: row.rascunho_empresa_id, issuerSnapshot: row.emitente_retrato || {} },
        signedArtifact: { id: row.artefato_id, companyId: row.company_id, emissionId: row.id, artifactType: row.artifact_type, storageReference: row.storage_reference, storageVersion: row.storage_version || '', checksum: row.checksum_sha256, byteLength: Number(row.byte_length), contentType: row.content_type, createdAt: row.artefato_criado_em instanceof Date ? row.artefato_criado_em.toISOString() : String(row.artefato_criado_em || '') },
      };
    },
  });
}

export function createCommercialNfeSubmissionService({ repository, certificateBindingResolver, artifactStorage, authorizationAdapter, lifecycle, internalErrorReporter } = {}) {
  if (!repository?.load || typeof certificateBindingResolver !== 'function') throw new TypeError('Informe o repositório e o resolvedor interno do envio.');
  if (!artifactStorage?.readByReference || !artifactStorage?.putImmutable) throw new TypeError('Informe o armazenamento fiscal imutável com leitura protegida.');
  if (!authorizationAdapter?.authorizeProtected || !lifecycle?.beginSubmission || !lifecycle?.commitAuthorization || !lifecycle?.transition) throw new TypeError('Informe o autorizador protegido e o ciclo fiscal transacional.');
  return Object.freeze({
    id: 'avantalab-commercial-nfe-submission-v1',
    async submit({ context, emissionId, expectedVersion, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      const normalizedEmissionId = clean(emissionId);
      const normalizedKey = clean(idempotencyKey);
      if (!UUID.test(normalizedEmissionId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(normalizedKey)) return { ok: false, errors: [issue('AV-NFE-SUBMISSION-INPUT', 'emission', 'Atualize a Central Fiscal e tente novamente.')] };
      try {
        const data = await repository.load({ companyId: context.companyId, emissionId: normalizedEmissionId });
        const invalid = validateLoaded(data, expectedVersion);
        if (invalid) return { ok: false, errors: [invalid] };
        const loaded = await artifactStorage.readByReference({ accessKey: data.emission.accessKey, storageReference: data.signedArtifact.storageReference, storageVersion: data.signedArtifact.storageVersion, contentType: 'application/xml', expectedChecksum: data.signedArtifact.checksum });
        const signedXml = new TextDecoder().decode(loaded.content);
        const verification = await verifyProtectedSignedNfeXml(signedXml, data.draft.issuerSnapshot.document);
        if (!verification.valid || verification.accessKey !== data.emission.accessKey) return { ok: false, errors: [issue('AV-NFE-SUBMISSION-VERIFY', 'signature', 'O XML assinado armazenado não passou pela conferência anterior ao envio.')] };
        const binding = await certificateBindingResolver({ companyId: context.companyId, establishmentId: data.emission.establishmentId, documentType: 'nfe' });
        if (!binding?.secureReference) return { ok: false, errors: [issue('AV-NFE-SUBMISSION-CERTIFICATE', 'certificate', 'Ative o certificado digital da empresa antes de transmitir a NF-e.')] };
        const batchId = deriveNfeLotId(normalizedKey, normalizedEmissionId);
        const begun = await lifecycle.beginSubmission({ companyId: context.companyId, emissionId: normalizedEmissionId, expectedVersion, operationKey: normalizedKey, actorId: context.actorId, accessKey: data.emission.accessKey, signedChecksum: data.emission.signedChecksum, batchId, publicPayload: { authority: 'SEFAZ/SP', environment: 'homologacao', synchronous: true } });
        if (!begun?.ok) return begun;
        const authorization = await authorizationAdapter.authorizeProtected({ signedXml, lotId: batchId, secureReference: binding.secureReference, expectedDocument: data.draft.issuerSnapshot.document, expectedMode: binding.expectedMode || 'Certificado A1', expectedAccessKey: data.emission.accessKey });
        if (authorization.authorized === true && authorization.valid === true && authorization.protocolXml) {
          const protocol = buildNfeProtocolArtifact({ signedXml, protocolXml: authorization.protocolXml, expectedAccessKey: data.emission.accessKey });
          if (!protocol.valid) return { ok: false, pendingRecovery: true, state: begun.emission.state, errors: [issue('AV-NFE-SUBMISSION-PROTOCOL', 'protocol', 'A autorização foi recebida, mas o protocolo aguarda reconciliação segura.')] };
          const stored = await persistNfeProtocolArtifact({ artifact: protocol, provider: artifactStorage });
          if (!stored.valid) return { ok: false, pendingRecovery: true, state: begun.emission.state, errors: stored.errors };
          const committed = await lifecycle.commitAuthorization({ companyId: context.companyId, emissionId: normalizedEmissionId, expectedVersion: begun.emission.version, operationKey: followupKey('authorize', normalizedKey, normalizedEmissionId), actorId: context.actorId, accessKey: data.emission.accessKey, protocolNumber: protocol.protocolNumber, authorizedAt: protocol.receivedAt, statusReason: protocol.reason, artifact: { artifactType: 'protocol_xml', storageReference: stored.storageReference, storageVersion: stored.storageVersion, checksum: protocol.checksum, byteLength: protocol.byteLength, contentType: 'application/xml', createdAt: stored.storedAt }, publicPayload: { batchStatus: authorization.batchStatus, statusCode: protocol.status, authority: 'SEFAZ/SP', environment: 'homologacao' } });
          if (!committed?.ok) return committed;
          return { ok: true, result: { emissionId: committed.emission.id, state: committed.emission.state, version: committed.emission.version, batchId, accessKey: committed.emission.accessKey, authorized: true, protocolNumber: committed.emission.protocolNumber, protocolStored: true, processedDocumentPending: true, externalContentReturned: false, sensitiveMaterialReturned: false }, errors: [] };
        }
        if (authorization.valid === true && authorization.needsReceiptConsultation === true) {
          const processing = await lifecycle.transition({ companyId: context.companyId, emissionId: normalizedEmissionId, expectedVersion: begun.emission.version, operationKey: followupKey('receipt', normalizedKey, normalizedEmissionId), actorId: context.actorId, toState: 'processing', patch: { receiptNumber: authorization.receiptNumber }, eventType: 'emission.processing', publicPayload: { batchStatus: authorization.batchStatus, authority: 'SEFAZ/SP', environment: 'homologacao' } });
          if (!processing?.ok) return processing;
          return { ok: true, result: { emissionId: processing.emission.id, state: processing.emission.state, version: processing.emission.version, batchId, receiptNumber: processing.emission.receiptNumber, authorized: false, receiptConsultationPending: true, externalContentReturned: false, sensitiveMaterialReturned: false }, errors: [] };
        }
        if (authorization.valid === true && authorization.batchProcessed === true && /^\d{3}$/.test(clean(authorization.protocolStatus)) && authorization.protocolStatus !== '100') {
          const rejected = await lifecycle.transition({ companyId: context.companyId, emissionId: normalizedEmissionId, expectedVersion: begun.emission.version, operationKey: followupKey('reject', normalizedKey, normalizedEmissionId), actorId: context.actorId, toState: 'rejected', patch: { statusCode: authorization.protocolStatus, statusReason: authorization.protocolReason || authorization.batchReason }, eventType: 'emission.rejected', publicPayload: { batchStatus: authorization.batchStatus, statusCode: authorization.protocolStatus, authority: 'SEFAZ/SP', environment: 'homologacao' } });
          if (!rejected?.ok) return rejected;
          return { ok: true, result: { emissionId: rejected.emission.id, state: rejected.emission.state, version: rejected.emission.version, batchId, authorized: false, rejected: true, statusCode: rejected.emission.statusCode, statusReason: rejected.emission.statusReason, externalContentReturned: false, sensitiveMaterialReturned: false }, errors: [] };
        }
        return { ok: false, pendingRecovery: true, state: begun.emission.state, version: begun.emission.version, errors: [issue('AV-NFE-SUBMISSION-PENDING', 'authorization', 'O envio foi registrado e será consultado com segurança antes de qualquer nova transmissão.')] };
      } catch (cause) {
        if (typeof internalErrorReporter === 'function') {
          try { await internalErrorReporter({ service: 'commercial-nfe-submission', cause }); } catch {}
        }
        return { ok: false, errors: [issue('AV-NFE-SUBMISSION-SERVER', 'submission', 'Não foi possível concluir o envio controlado. Consulte a Central Fiscal antes de tentar novamente.')] };
      }
    },
  });
}
