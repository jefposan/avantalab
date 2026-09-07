import { NFE_CANCELLATION_CONFIRMATION, normalizeNfeCancellationJustification } from './commercial-nfe-cancellation.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function publicError(result) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = text(error?.code) || 'AV-NFE-CANCEL';
  const message = text(error?.message) || 'Não foi possível cancelar a NF-e.';
  const status = code.includes('PERMISSION') ? 403
    : code.includes('NOT-FOUND') ? 404
      : code.includes('CONNECTION') || code.includes('STORAGE') || code.includes('SERVER') ? 503
        : code.includes('STATE') || code.includes('CONFLICT') || code.includes('AUTHORIZATION') ? 409
          : 400;
  return { status, code, message };
}

export async function handleCommercialNfeCancellationRequest({ request, runtime, companyId, emissionId } = {}) {
  const safeCompanyId = text(companyId);
  const safeEmissionId = text(emissionId);
  if (!request || request.method !== 'POST' || !UUID.test(safeCompanyId) || !UUID.test(safeEmissionId)) {
    return reply(400, { ok: false, code: 'AV-NFE-CANCEL-REQUEST', message: 'A solicitação de cancelamento é inválida.' });
  }
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-NFE-CANCEL-BODY', message: 'Atualize a Central Fiscal e tente novamente.' }); }
  const expectedVersion = Number(body?.expectedVersion);
  const idempotencyKey = text(body?.idempotencyKey);
  const justification = normalizeNfeCancellationJustification(body?.justification);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || !KEY.test(idempotencyKey)
    || body?.confirmation !== NFE_CANCELLATION_CONFIRMATION || justification.length < 15 || justification.length > 255) {
    return reply(400, { ok: false, code: 'AV-NFE-CANCEL-CONFIRMATION', message: 'Informe uma justificativa de 15 a 255 caracteres e confirme o cancelamento.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.nfeCancellationService?.cancel) {
    return reply(503, { ok: false, code: 'AV-NFE-CANCEL-PENDING', message: 'O cancelamento seguro da NF-e ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-CANCEL-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-NFE-CANCEL-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  const boundary = access.boundary || {};
  const context = {
    companyId: boundary.companyId,
    actorId: boundary.userId,
    moduleId: boundary.moduleId,
    active: boundary.userActive === true && boundary.membershipActive === true && boundary.companyActive === true,
    moduleActive: boundary.moduleActive === true,
    effectivePermissions: access.effectivePermissions || {},
  };
  let result;
  try { result = await runtime.nfeCancellationService.cancel({ context, emissionId: safeEmissionId, expectedVersion, idempotencyKey, confirmation: body.confirmation, justification }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-CANCEL-UNAVAILABLE', message: 'Não foi possível concluir o cancelamento neste momento.' }); }
  if (!result?.ok) {
    const error = publicError(result);
    return reply(error.status, { ok: false, code: error.code, message: error.message });
  }
  const emission = result.result || {};
  if (emission.state !== 'canceled' || emission.canceled !== true || emission.eventStored !== true
    || emission.originalAuthorizationPreserved !== true || emission.externalContentReturned !== false
    || emission.sensitiveMaterialReturned !== false) {
    return reply(503, { ok: false, code: 'AV-NFE-CANCEL-RESULT', message: 'O cancelamento não pôde ser confirmado com segurança.' });
  }
  return reply(200, { ok: true, emission });
}
