const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' };
const clean = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });
const statusFor = (code) => code.includes('SESSION') ? 401 : code.includes('PERMISSION') || code.includes('ACCESS') ? 403 : code.includes('NOT-FOUND') ? 404 : code.includes('CONFLICT') || code.includes('IDEMPOTENCY') ? 409 : code.includes('STORAGE') ? 503 : 400;

async function contextFor(request, runtime, companyId) {
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.operationService) return { error: reply(503, { ok: false, code: 'AV-COMMERCIAL-OPERATION-PENDING', message: 'A persistência comercial ainda não está disponível neste ambiente.' }) };
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); }
  catch { return { error: reply(503, { ok: false, code: 'AV-COMMERCIAL-OPERATION-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }) }; }
  if (!access?.authenticated) return { error: reply(401, { ok: false, code: 'AV-COMMERCIAL-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' }) };
  const boundary = access.boundary || {};
  return { context: { companyId: boundary.companyId, actorId: boundary.userId, moduleId: boundary.moduleId, active: boundary.userActive === true && boundary.membershipActive === true && boundary.companyActive === true, moduleActive: boundary.moduleActive === true, effectivePermissions: access.effectivePermissions || {} } };
}

function failed(result, fallback) {
  const error = Array.isArray(result?.errors) ? result.errors[0] : null;
  const code = clean(error?.code) || 'AV-COMMERCIAL-OPERATION';
  return reply(statusFor(code), { ok: false, code, message: clean(error?.message) || fallback, errors: result?.errors || [], warnings: result?.warnings || [] });
}

export async function handleCommercialOperationRequest({ request, runtime, companyId } = {}) {
  const safeCompanyId = clean(companyId);
  if (!request || !['GET', 'POST'].includes(request.method) || !UUID.test(safeCompanyId)) return reply(400, { ok: false, code: 'AV-COMMERCIAL-OPERATION-REQUEST', message: 'Selecione novamente o perfil empresarial.' });
  const resolved = await contextFor(request, runtime, safeCompanyId);
  if (resolved.error) return resolved.error;
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const result = await runtime.operationService.list({ context: resolved.context, channel: url.searchParams.get('channel') || 'vendas', type: url.searchParams.get('type') || '', status: url.searchParams.get('status') || '', query: url.searchParams.get('query') || '', limit: Number(url.searchParams.get('limit') || 100), offset: Number(url.searchParams.get('offset') || 0) });
    if (!result?.ok) return failed(result, 'Não foi possível carregar as operações comerciais.');
    const operations = await Promise.all(result.operations.map(async (summary) => {
      const full = await runtime.operationService.get({ context: resolved.context, operationId: summary.id, channel: summary.channel });
      if (summary.type !== 'ordem_servico' || !runtime.serviceOrderService) return full?.operation || summary;
      const service = await runtime.serviceOrderService.get({ context: resolved.context, orderId: summary.id });
      return { ...(full?.operation || summary), serviceOrder: service?.ok ? service.order : null };
    }));
    return reply(200, { ok: true, operations });
  }
  const declared = Number(request.headers?.get?.('content-length') || 0);
  if (declared > 128_000) return reply(413, { ok: false, code: 'AV-COMMERCIAL-OPERATION-SIZE', message: 'O documento ultrapassa o limite permitido.' });
  let body;
  try { body = await request.json(); }
  catch { return reply(400, { ok: false, code: 'AV-COMMERCIAL-OPERATION-BODY', message: 'Revise os dados do documento comercial.' }); }
  const created = await runtime.operationService.create({ context: resolved.context, input: body?.operation });
  if (!created?.ok) return failed(created, 'Não foi possível salvar o documento comercial.');
  if (body?.action !== 'create_service_order') return reply(200, { ...created, errors: undefined });
  if (!runtime.serviceOrderService) return reply(503, { ok: false, code: 'AV-SERVICE-ORDER-PENDING', message: 'A persistência da ordem de serviço ainda não está disponível.' });
  const converted = await runtime.serviceOrderService.convert({ context: resolved.context, quoteId: created.operation.id, expectedVersion: created.operation.version, idempotencyKey: body?.serviceOrderKey, input: body?.serviceOrder });
  if (!converted?.ok) return failed(converted, 'O orçamento foi salvo, mas não foi possível agendar a ordem de serviço. Tente novamente; a chave evita duplicidade.');
  return reply(200, { ok: true, quote: created.operation, order: converted.order, reused: created.reused && converted.reused, warnings: created.warnings || [] });
}
