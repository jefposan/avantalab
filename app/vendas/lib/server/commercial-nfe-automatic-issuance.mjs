import { createHash } from 'node:crypto';

export const COMMERCIAL_NFE_AUTOMATIC_ISSUANCE_REFERENCE = '2026-09-05';

const clean = (value) => String(value ?? '').trim();
const issue = (code, field, message) => ({ code, field, message });

function stageKey(stage, idempotencyKey, emissionId) {
  const digest = createHash('sha256').update(`${stage}:${clean(idempotencyKey)}:${clean(emissionId)}`).digest('hex').slice(0, 48);
  return `${stage}:${digest}`;
}

export function createCommercialNfeAutomaticIssuanceService({ signingPreparationService, signingService, submissionService, emissionStateResolver } = {}) {
  if (!signingPreparationService?.prepare || !signingService?.sign || !submissionService?.submit) {
    throw new TypeError('Informe as etapas protegidas da emissão automática da NF-e.');
  }
  return Object.freeze({
    id: 'avantalab-commercial-nfe-automatic-issuance-v1',
    async continue({ context, emissionId, expectedVersion, idempotencyKey } = {}) {
      const current = typeof emissionStateResolver === 'function'
        ? await emissionStateResolver({ context, emissionId })
        : { state: 'number_reserved', version: expectedVersion };
      if (!current || Number(current.version) !== Number(expectedVersion)) {
        return { ok: false, errors: [issue('AV-NFE-AUTOMATIC-CONFLICT', 'expectedVersion', 'A emissão foi alterada. Atualize a Central Fiscal antes de continuar.')] };
      }
      if (['authorized', 'processing', 'rejected'].includes(clean(current.state))) {
        return { ok: true, result: { emissionId, state: clean(current.state), version: Number(current.version), series: clean(current.series), number: Number(current.number), signed: true, persisted: true, submitted: true, transmitted: true, authorized: current.state === 'authorized', processing: current.state === 'processing', rejected: current.state === 'rejected', statusCode: clean(current.statusCode), statusReason: clean(current.statusReason), protocolStored: current.state === 'authorized', receiptConsultationPending: current.state === 'processing', externalContentReturned: false, sensitiveMaterialReturned: false }, errors: [] };
      }
      let signedResult;
      if (current.state === 'signed') {
        signedResult = { emissionId, state: 'signed', version: Number(current.version), series: clean(current.series), number: Number(current.number), signed: true, persisted: true };
      } else if (current.state === 'number_reserved') {
        const prepared = await signingPreparationService.prepare({ context, emissionId, expectedVersion, idempotencyKey: stageKey('prepare', idempotencyKey, emissionId) });
        if (!prepared?.ok) return prepared;
        const signed = await signingService.sign({ context, emissionId, expectedVersion: prepared.result.version, idempotencyKey: stageKey('sign', idempotencyKey, emissionId) });
        if (!signed?.ok) return signed;
        signedResult = signed.result;
      } else {
        return { ok: false, errors: [issue('AV-NFE-AUTOMATIC-STATE', 'state', 'A NF-e não está pronta para continuar a emissão.')] };
      }
      if (signedResult?.state !== 'signed' || signedResult?.signed !== true || signedResult?.persisted !== true) return { ok: false, errors: [issue('AV-NFE-AUTOMATIC-SIGNATURE', 'signature', 'A assinatura automática da NF-e não pôde ser confirmada.')] };
      const submitted = await submissionService.submit({
        context,
        emissionId,
        expectedVersion: signedResult.version,
        idempotencyKey: stageKey('submit', idempotencyKey, emissionId),
      });
      if (!submitted?.ok) return { ...submitted, signed: true, persisted: true };
      return {
        ok: true,
        result: {
          emissionId: clean(submitted.result?.emissionId),
          state: clean(submitted.result?.state),
          version: Number(submitted.result?.version),
          series: clean(signedResult?.series),
          number: Number(signedResult?.number),
          signed: true,
          persisted: true,
          submitted: true,
          transmitted: true,
          authorized: submitted.result?.authorized === true,
          processing: submitted.result?.state === 'processing',
          rejected: submitted.result?.rejected === true,
          statusCode: clean(submitted.result?.statusCode),
          statusReason: clean(submitted.result?.statusReason),
          protocolStored: submitted.result?.protocolStored === true,
          receiptConsultationPending: submitted.result?.receiptConsultationPending === true,
          externalContentReturned: false,
          sensitiveMaterialReturned: false,
        },
        errors: [],
      };
    },
  });
}
