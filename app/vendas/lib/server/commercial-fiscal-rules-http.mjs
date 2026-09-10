const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const MAX_BODY_BYTES = 256_000;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function contextFromAccess(access) {
  const boundary = access?.boundary || {};
  return {
    companyId: boundary.companyId,
    actorId: boundary.userId,
    moduleId: boundary.moduleId,
    active: boundary.userActive === true && boundary.membershipActive === true && boundary.companyActive === true,
    moduleActive: boundary.moduleActive === true,
    effectivePermissions: access?.effectivePermissions || {},
  };
}

function publicError(result) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = text(error?.code) || 'AV-FISCAL-RULES';
  const message = text(error?.message) || 'Não foi possível concluir a operação com as regras fiscais.';
  const status = code.includes('PERMISSION') ? 403
    : code.includes('CONFLICT') || code.includes('IDEMPOTENCY') ? 409
      : code.includes('STORAGE') ? 503 : 400;
  return { status, code, message };
}

async function resolveAccess(request, runtime, companyId) {
  if (runtime?.configured !== true || !runtime.accessResolver) return { response: reply(503, { ok: false, code: 'AV-FISCAL-RULES-PENDING', message: 'A publicação protegida das regras fiscais ainda não está disponível.' }) };
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); }
  catch { return { response: reply(503, { ok: false, code: 'AV-FISCAL-RULES-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }) }; }
  if (!access?.authenticated) return { response: reply(401, { ok: false, code: 'AV-FISCAL-RULES-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' }) };
  return { context: contextFromAccess(access) };
}

export async function handleCommercialFiscalRulesRequest({ request, runtime, companyId } = {}) {
  const safeCompanyId = text(companyId);
  if (!request || !['GET', 'POST'].includes(request.method) || !UUID_PATTERN.test(safeCompanyId)) {
    return reply(400, { ok: false, code: 'AV-FISCAL-RULES-REQUEST', message: 'Selecione novamente o perfil empresarial.' });
  }
  const access = await resolveAccess(request, runtime, safeCompanyId);
  if (access.response) return access.response;

  if (request.method === 'GET') {
    if (!runtime.fiscalRulesQueryService?.getPublished) return reply(503, { ok: false, code: 'AV-FISCAL-RULES-PENDING', message: 'A consulta protegida das regras fiscais ainda não está disponível.' });
    let result;
    try { result = await runtime.fiscalRulesQueryService.getPublished({ context: access.context }); }
    catch { return reply(503, { ok: false, code: 'AV-FISCAL-RULES-UNAVAILABLE', message: 'Não foi possível consultar as regras fiscais neste momento.' }); }
    if (!result?.ok) {
      const error = publicError(result);
      return reply(error.status, { ok: false, code: error.code, message: error.message });
    }
    return reply(200, { ok: true, available: true, writable: result.canPublish === true, configuration: result.configuration });
  }

  if (!runtime.fiscalRulesPublicationService?.publish) return reply(503, { ok: false, code: 'AV-FISCAL-RULES-PENDING', message: 'A publicação protegida das regras fiscais ainda não está disponível.' });
  let raw = '';
  try { raw = await request.text(); }
  catch { return reply(400, { ok: false, code: 'AV-FISCAL-RULES-BODY', message: 'Atualize as regras fiscais e tente novamente.' }); }
  if (!raw || Buffer.byteLength(raw) > MAX_BODY_BYTES) return reply(400, { ok: false, code: 'AV-FISCAL-RULES-BODY', message: 'A configuração fiscal ultrapassa o limite permitido.' });
  let body;
  try { body = JSON.parse(raw); }
  catch { return reply(400, { ok: false, code: 'AV-FISCAL-RULES-BODY', message: 'Atualize as regras fiscais e tente novamente.' }); }
  const expectedVersion = Number(body?.expectedVersion);
  const idempotencyKey = text(body?.idempotencyKey);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0 || !KEY_PATTERN.test(idempotencyKey) || !body?.matrix || typeof body.matrix !== 'object') {
    return reply(400, { ok: false, code: 'AV-FISCAL-RULES-INPUT', message: 'Atualize as regras fiscais e tente novamente.' });
  }
  let result;
  try {
    result = await runtime.fiscalRulesPublicationService.publish({
      context: access.context,
      expectedVersion,
      idempotencyKey,
      input: {
        matrix: body.matrix,
        documentScope: body.documentScope,
        fiscalResponsible: body.fiscalResponsible,
        reviewedAt: body.reviewedAt,
        taxReviewConfirmed: body.taxReviewConfirmed === true,
        taxReformReviewConfirmed: body.taxReformReviewConfirmed === true,
      },
    });
  } catch { return reply(503, { ok: false, code: 'AV-FISCAL-RULES-UNAVAILABLE', message: 'Não foi possível publicar as regras fiscais neste momento.' }); }
  if (!result?.ok) {
    const error = publicError(result);
    return reply(error.status, { ok: false, code: error.code, message: error.message });
  }
  return reply(200, { ok: true, configuration: result.configuration });
}
