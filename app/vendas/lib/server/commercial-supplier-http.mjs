const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' };
const clean = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

async function contextFor(request, runtime, companyId) {
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.supplierService) return { error: reply(503, { ok: false, code: 'AV-SUPPLIER-PENDING', message: 'A persistência dos fornecedores ainda não está disponível neste ambiente.' }) };
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); }
  catch { return { error: reply(503, { ok: false, code: 'AV-SUPPLIER-ACCESS', message: 'Não foi possível confirmar o acesso neste momento.' }) }; }
  if (!access?.authenticated) return { error: reply(401, { ok: false, code: 'AV-SUPPLIER-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' }) };
  const boundary = access.boundary || {};
  return { context: { companyId: boundary.companyId, actorId: boundary.userId, moduleId: boundary.moduleId, active: boundary.userActive === true && boundary.membershipActive === true && boundary.companyActive === true, moduleActive: boundary.moduleActive === true, effectivePermissions: access.effectivePermissions || {} } };
}

export async function handleCommercialSupplierRequest({ request, runtime, companyId } = {}) {
  const safeCompanyId = clean(companyId);
  if (!request || !['GET', 'POST'].includes(request.method) || !UUID.test(safeCompanyId)) return reply(400, { ok: false, code: 'AV-SUPPLIER-REQUEST', message: 'Selecione novamente o perfil empresarial.' });
  const resolved = await contextFor(request, runtime, safeCompanyId);
  if (resolved.error) return resolved.error;
  let result;
  if (request.method === 'GET') {
    const url = new URL(request.url);
    result = await runtime.supplierService.list({ context: resolved.context, query: url.searchParams.get('query') || '', limit: Number(url.searchParams.get('limit') || 100), offset: Number(url.searchParams.get('offset') || 0) });
  } else {
    const declared = Number(request.headers?.get?.('content-length') || 0);
    if (declared > 32_000) return reply(413, { ok: false, code: 'AV-SUPPLIER-SIZE', message: 'O cadastro ultrapassa o limite permitido.' });
    let body;
    try { body = await request.json(); }
    catch { return reply(400, { ok: false, code: 'AV-SUPPLIER-BODY', message: 'Revise os dados do fornecedor.' }); }
    result = await runtime.supplierService.create({ context: resolved.context, input: body?.supplier });
  }
  if (!result?.ok) {
    const error = Array.isArray(result?.errors) ? result.errors[0] : null;
    const code = clean(error?.code) || 'AV-SUPPLIER';
    const status = code.includes('SESSION') ? 401 : code.includes('PERMISSION') || code.includes('ACCESS') ? 403 : code.includes('DUPLICATE') ? 409 : code.includes('STORAGE') ? 503 : 400;
    return reply(status, { ok: false, code, message: clean(error?.message) || 'Não foi possível concluir a operação com o fornecedor.' });
  }
  return reply(200, { ...result, errors: undefined });
}
