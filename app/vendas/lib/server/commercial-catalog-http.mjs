const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = Object.freeze({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache', 'X-Content-Type-Options': 'nosniff' });
const clean = (value) => String(value ?? '').trim();
const reply = (status, body) => Response.json(body, { status, headers });

export async function handleCommercialCatalogRequest({ request, runtime, companyId, priceTableId = '' } = {}) {
  const safeCompanyId = clean(companyId);
  const safePriceTableId = clean(priceTableId);
  if (!request || request.method !== 'GET' || !UUID.test(safeCompanyId) || (safePriceTableId && !UUID.test(safePriceTableId))) {
    return reply(400, { ok: false, message: 'Selecione novamente o perfil empresarial e a tabela de preços.' });
  }
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.catalogService) {
    return reply(503, { ok: false, message: 'O catálogo do laboratório ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId: safeCompanyId }); }
  catch { return reply(503, { ok: false, message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, message: 'Sua sessão precisa ser confirmada novamente.' });
  let result;
  try {
    result = await runtime.catalogService.list({
      boundary: access.boundary,
      effectivePermissions: access.effectivePermissions,
      priceTableId: safePriceTableId,
    });
  } catch {
    return reply(503, { ok: false, message: 'Não foi possível consultar o catálogo do laboratório.' });
  }
  if (!result?.ok || !result.catalog) {
    const denied = ['permission_denied', 'membership_inactive', 'module_inactive', 'company_inactive', 'user_inactive'].includes(result?.reason);
    return reply(denied ? 403 : result?.reason === 'catalog_not_found' ? 404 : 503, {
      ok: false,
      message: denied ? 'Seu acesso não permite consultar produtos e serviços.' : result?.reason === 'catalog_not_found' ? 'Nenhum catálogo foi preparado para este laboratório.' : 'O catálogo do laboratório ainda não está disponível.',
    });
  }
  return reply(200, { ok: true, catalogo: result.catalog });
}
