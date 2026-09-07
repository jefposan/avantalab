const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const responseHeaders = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
});

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
function reply(status, body) { return Response.json(body, { status, headers: responseHeaders }); }

export async function handleFiscalEmissionStatusRequest({ request, emissionId, runtime } = {}) {
  let companyId = '';
  try { companyId = text(new URL(request.url).searchParams.get('companyId')); } catch {}
  if (!request || request.method !== 'GET' || !UUID_PATTERN.test(text(emissionId)) || !UUID_PATTERN.test(companyId)) return reply(400, { ok: false, code: 'AV-FISCAL-STATUS-REQUEST', message: 'A consulta da emissão fiscal é inválida.' });
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.statusService) return reply(503, { ok: false, code: 'AV-FISCAL-STATUS-INTEGRATION-PENDING', message: 'A consulta fiscal ainda não está disponível.' });
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); } catch { return reply(503, { ok: false, code: 'AV-FISCAL-STATUS-ACCESS-UNAVAILABLE', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-FISCAL-STATUS-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  let result;
  try { result = await runtime.statusService.get({ boundary: access.boundary, effectivePermissions: access.effectivePermissions, emissionId: text(emissionId) }); }
  catch { return reply(503, { ok: false, code: 'AV-FISCAL-STATUS-UNAVAILABLE', message: 'Não foi possível consultar a emissão neste momento.' }); }
  if (!result?.ok) {
    if (result?.reason === 'emission_not_found') return reply(404, { ok: false, code: 'AV-FISCAL-STATUS-NOT-FOUND', message: 'A emissão fiscal não foi encontrada.' });
    if (result?.reason === 'repository_unavailable') return reply(503, { ok: false, code: 'AV-FISCAL-STATUS-UNAVAILABLE', message: 'Não foi possível consultar a emissão neste momento.' });
    return reply(403, { ok: false, code: 'AV-FISCAL-STATUS-DENIED', message: 'Seu acesso não permite consultar esta emissão fiscal.' });
  }
  return reply(200, { ok: true, emission: result.emission });
}
