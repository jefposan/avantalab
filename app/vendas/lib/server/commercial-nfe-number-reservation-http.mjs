const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function publicError(result) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = text(error?.code) || 'AV-NFE-NUMBER';
  const message = text(error?.message) || 'Não foi possível confirmar a numeração da NF-e.';
  const status = code.includes('PERMISSION') ? 403
    : code.includes('NOT-FOUND') ? 404
      : code.includes('STORAGE') || code.includes('LIFECYCLE') ? 503
        : code.includes('STATE') || code.includes('VERSION') || code.includes('IDEMPOTENCY') ? 409
          : 400;
  return { status, code, message };
}

export async function handleCommercialNfeNumberReservationRequest({ request, runtime, companyId, emissionId } = {}) {
  const safeCompanyId = text(companyId);
  const safeEmissionId = text(emissionId);
  if (!request || request.method !== 'POST' || !UUID_PATTERN.test(safeCompanyId) || !UUID_PATTERN.test(safeEmissionId)) {
    return reply(400, { ok: false, code: 'AV-NFE-NUMBER-REQUEST', message: 'A confirmação da NF-e solicitada é inválida.' });
  }
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-NFE-NUMBER-BODY', message: 'Atualize a Central Fiscal e tente novamente.' }); }
  const idempotencyKey = text(body?.idempotencyKey);
  const expectedVersion = Number(body?.expectedVersion);
  if (!KEY_PATTERN.test(idempotencyKey) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    return reply(400, { ok: false, code: 'AV-NFE-NUMBER-INPUT', message: 'Atualize a situação fiscal e tente novamente.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.nfeNumberReservationService?.reserve) {
    return reply(503, { ok: false, code: 'AV-NFE-NUMBER-PENDING', message: 'A confirmação da NF-e ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-NUMBER-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-NFE-NUMBER-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
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
  try { result = await runtime.nfeNumberReservationService.reserve({ context, emissionId: safeEmissionId, expectedVersion, idempotencyKey }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-NUMBER-UNAVAILABLE', message: 'Não foi possível confirmar a NF-e neste momento.' }); }
  if (!result?.ok) {
    const error = publicError(result);
    return reply(error.status, { ok: false, code: error.code, message: error.message });
  }
  return reply(200, { ok: true, emission: result.result });
}
