import { buildNfeCancellationArtifact, persistNfeCancellationArtifact } from './nfe-cancellation-artifact.mjs';

export const COMMERCIAL_NFE_CANCELLATION_REFERENCE = '2026-09-07';
export const NFE_CANCELLATION_CONFIRMATION = 'CANCELAR_NFE_AUTORIZADA';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const clean = (value) => String(value ?? '').trim();
const issue = (code, field, message) => ({ code, field, message });

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  if (context.moduleId && context.moduleId !== 'vendas') return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.cancel'] !== true) return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite cancelar notas fiscais.');
  return null;
}

export function normalizeNfeCancellationJustification(value) {
  return clean(value).replace(/\s+/g, ' ');
}

export function createDisabledNfeCancellationAdapter() {
  return Object.freeze({
    id: 'nfe-cancellation-transport-not-configured',
    configured: false,
    async cancelProtected() {
      throw new Error('O transporte do evento de cancelamento ainda não foi configurado.');
    },
  });
}

function validateLoaded(data, expectedVersion) {
  const emission = data?.emission;
  if (!emission || !data?.issuerDocument) return issue('AV-NFE-CANCEL-NOT-FOUND', 'emission', 'A NF-e autorizada não foi localizada nesta empresa.');
  if (emission.version !== expectedVersion) return issue('AV-NFE-CANCEL-CONFLICT', 'expectedVersion', 'A nota foi atualizada; consulte novamente antes de cancelar.');
  if (!['authorized', 'artifacts_stored', 'danfe_ready'].includes(emission.state) || emission.documentType !== 'nfe' || emission.model !== '55' || emission.environment !== 'homologacao') return issue('AV-NFE-CANCEL-STATE', 'state', 'Somente uma NF-e autorizada em homologação pode ser cancelada por este fluxo.');
  if (!/^\d{44}$/.test(emission.accessKey) || emission.statusCode !== '100' || !/^\d{15,17}$/.test(emission.protocolNumber) || !emission.authorizedAt) return issue('AV-NFE-CANCEL-AUTHORIZATION', 'authorization', 'A autorização original não possui chave e protocolo suficientes para o cancelamento.');
  if (emission.accessKey.slice(6, 20) !== clean(data.issuerDocument).replace(/\D/g, '')) return issue('AV-NFE-CANCEL-ISSUER', 'issuer', 'O CNPJ do emissor não corresponde à chave da NF-e autorizada.');
  return null;
}

export function createPostgresCommercialNfeCancellationRepository({ pool } = {}) {
  if (!pool?.query) throw new TypeError('Informe o pool PostgreSQL server-side.');
  return Object.freeze({
    async load({ companyId, emissionId }) {
      const result = await pool.query(`
        select e.*,coalesce(c.issuer_snapshot,r.emitente_retrato) as emitente_retrato
        from fiscal_private.emissions e
        join public.vendas_fiscal_rascunhos r on r.empresa_id=e.company_id and r.id::text=e.draft_id
        left join lateral (
          select x.* from fiscal_private.emission_corrections x
          where x.company_id=e.company_id and x.emission_id=e.id order by x.revision desc limit 1
        ) c on true
        where e.company_id=$1 and e.id=$2 limit 1
      `, [companyId, emissionId]);
      const row = result.rows?.[0];
      if (!row) return null;
      return {
        issuerDocument: row.emitente_retrato?.document || '',
        emission: {
          id: row.id, companyId: row.company_id, establishmentId: row.establishment_id,
          documentType: row.document_type, model: row.model, environment: row.environment,
          state: row.state, version: Number(row.version), series: row.series || '', number: Number(row.number || 0),
          accessKey: row.access_key || '', statusCode: row.status_code || '', protocolNumber: row.protocol_number || '',
          authorizedAt: row.authorized_at instanceof Date ? row.authorized_at.toISOString() : String(row.authorized_at || ''),
        },
      };
    },
  });
}

export function createCommercialNfeCancellationService({ repository, certificateBindingResolver, cancellationAdapter, artifactStorage, lifecycle, clock = () => new Date().toISOString(), internalErrorReporter } = {}) {
  if (!repository?.load || typeof certificateBindingResolver !== 'function') throw new TypeError('Informe o repositório e o resolvedor interno do cancelamento.');
  if (!cancellationAdapter?.cancelProtected || !artifactStorage?.putImmutable || !lifecycle?.commitCancellation) throw new TypeError('Informe o adaptador, armazenamento e ciclo fiscal do cancelamento.');
  return Object.freeze({
    id: 'avantalab-commercial-nfe-cancellation-v1',
    async cancel({ context, emissionId, expectedVersion, idempotencyKey, confirmation, justification } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      const safeEmissionId = clean(emissionId);
      const safeKey = clean(idempotencyKey);
      const reason = normalizeNfeCancellationJustification(justification);
      if (!UUID.test(safeEmissionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(safeKey)) return { ok: false, errors: [issue('AV-NFE-CANCEL-INPUT', 'emission', 'Atualize a Central Fiscal e tente novamente.')] };
      if (confirmation !== NFE_CANCELLATION_CONFIRMATION) return { ok: false, errors: [issue('AV-NFE-CANCEL-CONFIRMATION', 'confirmation', 'Confirme que deseja solicitar o cancelamento da NF-e.')] };
      if (reason.length < 15 || reason.length > 255) return { ok: false, errors: [issue('AV-NFE-CANCEL-JUSTIFICATION', 'justification', 'A justificativa deve ter entre 15 e 255 caracteres.')] };
      try {
        const data = await repository.load({ companyId: context.companyId, emissionId: safeEmissionId });
        const invalid = validateLoaded(data, expectedVersion);
        if (invalid) return { ok: false, errors: [invalid] };
        if (cancellationAdapter.configured !== true) return { ok: false, errors: [issue('AV-NFE-CANCEL-CONNECTION', 'authority', 'A conexão do cancelamento com o autorizador ainda não está liberada.')] };
        const binding = await certificateBindingResolver({ companyId: context.companyId, establishmentId: data.emission.establishmentId, documentType: 'nfe' });
        if (!binding?.secureReference) return { ok: false, errors: [issue('AV-NFE-CANCEL-CERTIFICATE', 'certificate', 'Ative o certificado digital da empresa antes de solicitar o cancelamento.')] };
        const response = await cancellationAdapter.cancelProtected({ accessKey: data.emission.accessKey, authorizationProtocol: data.emission.protocolNumber, justification: reason, eventSequence: 1, secureReference: binding.secureReference, expectedDocument: data.issuerDocument, expectedMode: binding.expectedMode || 'Certificado A1' });
        const artifact = buildNfeCancellationArtifact({ processedEventXml: response?.processedEventXml, expectedAccessKey: data.emission.accessKey });
        if (!response?.valid || !response?.canceled || !artifact.valid) return { ok: false, errors: artifact.errors.length ? artifact.errors : [issue('AV-NFE-CANCEL-AUTHORITY', 'authority', 'O autorizador não confirmou o cancelamento da NF-e.')] };
        const stored = await persistNfeCancellationArtifact({ artifact, provider: artifactStorage });
        if (!stored.valid) return { ok: false, errors: stored.errors };
        const committed = await lifecycle.commitCancellation({ companyId: context.companyId, emissionId: safeEmissionId, expectedVersion, operationKey: safeKey, actorId: context.actorId, cancellationProtocol: artifact.protocolNumber, cancellationStatusCode: artifact.statusCode, canceledAt: artifact.registeredAt || clock(), artifact: { artifactType: 'cancellation_event_xml', storageReference: stored.storageReference, storageVersion: stored.storageVersion, checksum: artifact.checksum, byteLength: artifact.byteLength, contentType: 'application/xml', createdAt: stored.storedAt }, publicPayload: { authority: 'SEFAZ/SP', environment: 'homologacao', eventType: '110111', justification: reason, originalAuthorizationPreserved: true } });
        if (!committed?.ok) return committed;
        return { ok: true, result: { emissionId: committed.emission.id, state: 'canceled', version: committed.emission.version, series: committed.emission.series, number: committed.emission.number, cancellationStatusCode: committed.emission.cancellationStatusCode, cancellationProtocol: committed.emission.cancellationProtocol, canceledAt: committed.emission.canceledAt, eventStored: true, transmitted: true, canceled: true, originalAuthorizationPreserved: true, externalContentReturned: false, sensitiveMaterialReturned: false }, errors: [] };
      } catch (cause) {
        if (typeof internalErrorReporter === 'function') { try { await internalErrorReporter({ service: 'commercial-nfe-cancellation', cause }); } catch {} }
        return { ok: false, errors: [issue('AV-NFE-CANCEL-SERVER', 'cancellation', 'Não foi possível concluir o cancelamento. Consulte a Central Fiscal antes de tentar novamente.')] };
      }
    },
  });
}
