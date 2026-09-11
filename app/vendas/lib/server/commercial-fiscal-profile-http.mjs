const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const reply = (status, body) => Response.json(body, { status, headers });

function context(access) {
  const boundary = access?.boundary || {};
  return { companyId: boundary.companyId, actorId: boundary.userId, moduleId: boundary.moduleId, active: boundary.userActive === true && boundary.membershipActive === true && boundary.companyActive === true, moduleActive: boundary.moduleActive === true, effectivePermissions: access?.effectivePermissions || {} };
}

function failure(result) {
  const error = result?.errors?.[0] || {};
  const code = String(error.code || 'AV-FISCAL-PROFILE');
  const status = code.includes('PERMISSION') ? 403 : code.includes('CONFLICT') ? 409 : 400;
  return reply(status, { ok: false, code, message: String(error.message || 'Não foi possível configurar os documentos fiscais.') });
}

export async function handleCommercialFiscalProfileRequest({ request, runtime, companyId } = {}) {
  if (!request || !['GET', 'PATCH'].includes(request.method) || !UUID.test(String(companyId || ''))) return reply(400, { ok: false, code: 'AV-FISCAL-PROFILE-REQUEST', message: 'Selecione novamente o perfil empresarial.' });
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.fiscalProfileService) return reply(503, { ok: false, code: 'AV-FISCAL-PROFILE-PENDING', message: 'A configuração fiscal protegida ainda não está disponível.' });
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); }
  catch { return reply(503, { ok: false, code: 'AV-FISCAL-PROFILE-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-FISCAL-PROFILE-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  if (request.method === 'GET') {
    try {
      const result = await runtime.fiscalProfileService.get({ context: context(access) });
      return result.ok ? reply(200, { ok: true, writable: result.canWrite === true, profile: result.profile }) : failure(result);
    } catch { return reply(503, { ok: false, code: 'AV-FISCAL-PROFILE-UNAVAILABLE', message: 'Não foi possível consultar a configuração fiscal neste momento.' }); }
  }
  let body;
  try { body = await request.json(); } catch { return reply(400, { ok: false, code: 'AV-FISCAL-PROFILE-BODY', message: 'Revise a configuração fiscal e tente novamente.' }); }
  const expectedVersion = Number(body?.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) return reply(400, { ok: false, code: 'AV-FISCAL-PROFILE-VERSION', message: 'Atualize a página antes de salvar.' });
  try {
    const result = await runtime.fiscalProfileService.save({ context: context(access), expectedVersion, input: body });
    return result.ok ? reply(200, { ok: true, profile: result.profile }) : failure(result);
  } catch { return reply(503, { ok: false, code: 'AV-FISCAL-PROFILE-UNAVAILABLE', message: 'Não foi possível salvar a configuração fiscal neste momento.' }); }
}
