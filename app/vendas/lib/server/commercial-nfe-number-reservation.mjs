export const COMMERCIAL_NFE_NUMBER_RESERVATION_REFERENCE = '2026-09-04';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const clean = (value) => String(value ?? '').trim();
const issue = (code, field, message) => ({ code, field, message });

function accessError(context) {
  if (!context || !UUID.test(clean(context.companyId)) || !UUID.test(clean(context.actorId))) {
    return issue('AV-COMMERCIAL-SESSION', 'session', 'Confirme novamente a sessão e a empresa ativa.');
  }
  if (context.moduleId && context.moduleId !== 'vendas') {
    return issue('AV-COMMERCIAL-MODULE', 'module', 'O acesso não pertence ao módulo Vendas e Serviços.');
  }
  if (!context.active || !context.moduleActive || context.effectivePermissions?.['fiscal.issue'] !== true) {
    return issue('AV-COMMERCIAL-PERMISSION', 'permission', 'Seu acesso não permite confirmar a emissão da nota.');
  }
  return null;
}

function publicResult(result) {
  const emission = result.emission || {};
  return {
    emissionId: emission.id || '',
    draftId: emission.draftId || '',
    orderId: emission.originId || '',
    documentType: emission.documentType || 'nfe',
    model: emission.model || '55',
    environment: emission.environment || 'homologacao',
    state: emission.state || 'number_reserved',
    version: Number(emission.version || 0),
    series: emission.series || '',
    number: Number(emission.number || 0),
    reused: result.reused === true,
    numberReserved: true,
    certificateInspected: false,
    signed: false,
    transmitted: false,
  };
}

export function createCommercialNfeNumberReservationService({ emissionLifecycle } = {}) {
  if (!emissionLifecycle?.reserveNumber) throw new TypeError('Informe o ciclo fiscal com reserva transacional de numeração.');
  return Object.freeze({
    async reserve({ context, emissionId, expectedVersion, idempotencyKey } = {}) {
      const denied = accessError(context);
      if (denied) return { ok: false, errors: [denied] };
      const normalizedEmissionId = clean(emissionId);
      const normalizedKey = clean(idempotencyKey);
      if (!UUID.test(normalizedEmissionId) || !Number.isInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(normalizedKey)) {
        return { ok: false, errors: [issue('AV-NFE-NUMBER-INPUT', 'emission', 'Atualize a Central Fiscal e tente novamente.')] };
      }
      try {
        const result = await emissionLifecycle.reserveNumber({
          companyId: context.companyId,
          emissionId: normalizedEmissionId,
          expectedVersion,
          operationKey: normalizedKey,
          actorId: context.actorId,
          publicPayload: {
            source: 'commercial_confirmation',
            numberReservationRequested: true,
            externalCredentialUsed: false,
            signatureAttempted: false,
            transmissionAttempted: false,
          },
        });
        if (!result?.ok) {
          return {
            ok: false,
            errors: Array.isArray(result?.errors) && result.errors.length
              ? result.errors
              : [issue('AV-NFE-NUMBER-LIFECYCLE', 'fiscal', 'Não foi possível reservar a numeração da NF-e.')],
          };
        }
        return { ok: true, result: publicResult(result), errors: [] };
      } catch (cause) {
        const known = {
          'AV-FISCAL-NUMBER-IDEMPOTENCY': ['idempotencyKey', 'Esta solicitação já pertence a outra reserva fiscal.'],
          'AV-FISCAL-NUMBER-SEQUENCE': ['numbering', 'Configure uma série ativa antes de confirmar a emissão.'],
          'AV-FISCAL-NUMBER-EXHAUSTED': ['numbering', 'A série fiscal não possui numeração disponível.'],
        }[cause?.code];
        return {
          ok: false,
          errors: [known
            ? issue(cause.code, known[0], known[1])
            : issue('AV-NFE-NUMBER-STORAGE', 'storage', 'Não foi possível reservar a numeração fiscal. Tente novamente.')],
        };
      }
    },
  });
}
