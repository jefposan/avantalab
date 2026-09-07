const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function publicError(result) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = text(error?.code) || 'AV-NFE-VALIDATE';
  const message = text(error?.message) || 'Não foi possível validar os dados fiscais da NF-e.';
  const status = code.includes('PERMISSION') ? 403
    : code.includes('NOT-FOUND') ? 404
      : code.includes('STORAGE') || code.includes('LIFECYCLE') ? 503
        : code.includes('STATE') || code.includes('INTEGRITY') || code.includes('LINK') ? 409
          : 400;
  return { status, code, message };
}

export async function handleCommercialNfePreparationRequest({ request, runtime, companyId, draftId } = {}) {
  const safeCompanyId = text(companyId);
  const safeDraftId = text(draftId);
  if (!request || request.method !== 'POST' || !UUID_PATTERN.test(safeCompanyId) || !UUID_PATTERN.test(safeDraftId)) {
    return reply(400, { ok: false, code: 'AV-NFE-VALIDATE-REQUEST', message: 'A validação fiscal solicitada é inválida.' });
  }
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-NFE-VALIDATE-BODY', message: 'Atualize a Central Fiscal e tente novamente.' }); }
  const idempotencyKey = text(body?.idempotencyKey);
  if (!KEY_PATTERN.test(idempotencyKey)) {
    return reply(400, { ok: false, code: 'AV-NFE-VALIDATE-KEY', message: 'Atualize a Central Fiscal e tente novamente.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver) {
    return reply(503, { ok: false, code: 'AV-NFE-VALIDATE-PENDING', message: 'A validação fiscal persistida ainda não está disponível.' });
  }
  if (!runtime.nfePreparationService?.prepare) {
    return reply(503, { ok: false, code: 'AV-NFE-RULES-PENDING', message: 'Publique as regras fiscais revisadas da empresa antes de validar a NF-e.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-VALIDATE-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) {
    return reply(401, { ok: false, code: 'AV-NFE-VALIDATE-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  }
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
  try { result = await runtime.nfePreparationService.prepare({ context, draftId: safeDraftId, idempotencyKey }); }
  catch { return reply(503, { ok: false, code: 'AV-NFE-VALIDATE-UNAVAILABLE', message: 'Não foi possível validar a NF-e neste momento.' }); }
  if (!result?.ok) {
    const error = publicError(result);
    return reply(error.status, { ok: false, code: error.code, message: error.message });
  }
  return reply(200, { ok: true, emission: result.result });
}
