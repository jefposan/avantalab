const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const clean = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

function statusFor(code) {
  if (code.includes('PERMISSION') || code.includes('ACCESS')) return 403;
  if (code.includes('SESSION')) return 401;
  if (code.includes('NOT-FOUND')) return 404;
  if (code.includes('CONFLICT') || code.includes('STATE') || code.includes('IDEMPOTENCY')) return 409;
  if (code.includes('STORAGE') || code.includes('UNAVAILABLE')) return 503;
  return 400;
}

export async function handleCommercialOrderWorkflowRequest({ request, runtime, companyId } = {}) {
  const safeCompanyId = clean(companyId);
  if (!request || request.method !== 'POST' || !UUID.test(safeCompanyId)) {
    return reply(400, { ok: false, code: 'AV-COMMERCIAL-WORKFLOW-REQUEST', message: 'Selecione novamente o perfil empresarial.' });
  }
  const declaredSize = Number(request.headers?.get?.('content-length') || 0);
  if (declaredSize > 128_000) return reply(413, { ok: false, code: 'AV-COMMERCIAL-WORKFLOW-SIZE', message: 'O pedido ultrapassa o limite desta etapa.' });
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-COMMERCIAL-WORKFLOW-BODY', message: 'Revise os dados do pedido e tente novamente.' }); }
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.orderWorkflow) {
    return reply(503, { ok: false, code: 'AV-COMMERCIAL-WORKFLOW-PENDING', message: 'A persistência comercial ainda não está disponível neste ambiente.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, code: 'AV-COMMERCIAL-WORKFLOW-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-COMMERCIAL-WORKFLOW-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
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
    result = await runtime.orderWorkflow.advance({
      context,
      target: body?.target,
      persistenceKey: body?.persistenceKey,
      operationId: body?.operationId,
      customer: body?.customer,
      order: body?.order,
    });
  } catch {
    return reply(503, { ok: false, code: 'AV-COMMERCIAL-WORKFLOW-UNAVAILABLE', message: 'Não foi possível concluir o fluxo comercial neste momento.' });
  }
  if (!result?.ok) {
    const error = Array.isArray(result?.errors) ? result.errors[0] : null;
    const code = clean(error?.code) || 'AV-COMMERCIAL-WORKFLOW';
    return reply(statusFor(code), { ok: false, code, message: clean(error?.message) || 'Não foi possível concluir o fluxo comercial.' });
  }
  return reply(200, { ok: true, customerId: result.customerId, order: result.order });
}
