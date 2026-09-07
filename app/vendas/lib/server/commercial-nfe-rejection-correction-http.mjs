import { NFE_REJECTION_CORRECTION_CONFIRMATION } from './commercial-nfe-rejection-correction.mjs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const STATUS_PATTERN = /^\d{3}$/;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function publicError(result) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = text(error?.code) || 'AV-NFE-CORRECTION';
  const message = text(error?.message) || 'Não foi possível revisar os dados fiscais da NF-e.';
  const status = code.includes('PERMISSION') ? 403
    : code.includes('NOT-FOUND') ? 404
      : code.includes('STORAGE') || code.includes('LIFECYCLE') ? 503
        : code.includes('STATE') || code.includes('CONFLICT') || code.includes('LINK') || code.includes('NUMBER') ? 409
          : 400;
  return { status, code, message };
}

export async function handleCommercialNfeRejectionCorrectionRequest({ request, runtime, companyId, emissionId } = {}) {
  const safeCompanyId = text(companyId);
  const safeEmissionId = text(emissionId);
  if (!request || request.method !== 'POST' || !UUID_PATTERN.test(safeCompanyId) || !UUID_PATTERN.test(safeEmissionId)) {
    return reply(400, { ok: false, code: 'AV-NFE-CORRECTION-REQUEST', message: 'A revisão fiscal solicitada é inválida.' });
  }
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-NFE-CORRECTION-BODY', message: 'Atualize a Central Fiscal e tente novamente.' }); }
  const expectedVersion = Number(body?.expectedVersion);
  const idempotencyKey = text(body?.idempotencyKey);
  const rejectedStatusCode = text(body?.rejectedStatusCode);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || !KEY_PATTERN.test(idempotencyKey)
    || !STATUS_PATTERN.test(rejectedStatusCode) || body?.confirmation !== NFE_REJECTION_CORRECTION_CONFIRMATION) {
    return reply(400, { ok: false, code: 'AV-NFE-CORRECTION-CONFIRMATION', message: 'Confirme a revisão da NF-e rejeitada antes de continuar.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.nfeRejectionCorrectionService?.prepare) {
    return reply(503, { ok: false, code: 'AV-NFE-CORRECTION-PENDING', message: 'A revisão segura da NF-e ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-CORRECTION-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-NFE-CORRECTION-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
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
  try {
    result = await runtime.nfeRejectionCorrectionService.prepare({
      context,
      emissionId: safeEmissionId,
      expectedVersion,
      idempotencyKey,
      rejectedStatusCode,
      confirmation: body.confirmation,
      changes: body.changes,
    });
  } catch {
    return reply(503, { ok: false, code: 'AV-NFE-CORRECTION-UNAVAILABLE', message: 'Não foi possível revisar a NF-e neste momento.' });
  }
  if (!result?.ok) {
    const error = publicError(result);
    return reply(error.status, { ok: false, code: error.code, message: error.message });
  }
  return reply(200, { ok: true, emission: result.result });
}
