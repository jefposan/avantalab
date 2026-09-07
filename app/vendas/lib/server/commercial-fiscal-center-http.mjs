const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const text = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

export async function handleCommercialFiscalCenterRequest({ request, runtime } = {}) {
  let companyId = '';
  try { companyId = text(new URL(request.url).searchParams.get('companyId')); } catch {}
  if (!request || request.method !== 'GET' || !UUID_PATTERN.test(companyId)) {
    return reply(400, { ok: false, code: 'AV-FISCAL-CENTER-REQUEST', message: 'A consulta da Central Fiscal é inválida.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.centerService) {
    return reply(503, { ok: false, code: 'AV-FISCAL-CENTER-INTEGRATION-PENDING', message: 'A Central Fiscal persistida ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); }
  catch { return reply(503, { ok: false, code: 'AV-FISCAL-CENTER-ACCESS-UNAVAILABLE', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) {
    return reply(401, { ok: false, code: 'AV-FISCAL-CENTER-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  }
  let result;
  try { result = await runtime.centerService.list({ boundary: access.boundary, effectivePermissions: access.effectivePermissions }); }
  catch { return reply(503, { ok: false, code: 'AV-FISCAL-CENTER-UNAVAILABLE', message: 'Não foi possível consultar a Central Fiscal neste momento.' }); }
  if (!result?.ok) {
    const unavailable = result?.reason === 'repository_unavailable';
    return reply(unavailable ? 503 : 403, {
      ok: false,
      code: unavailable ? 'AV-FISCAL-CENTER-UNAVAILABLE' : 'AV-FISCAL-CENTER-DENIED',
      message: unavailable ? 'Não foi possível consultar a Central Fiscal neste momento.' : 'Seu acesso não permite consultar a Central Fiscal.',
    });
  }
  return reply(200, { ok: true, documents: result.documents });
}
