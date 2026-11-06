import { evaluateAccessDecision } from '../access-control.mjs';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

export async function handleStandaloneFiscalRequest({ request, runtime }) {
  const companyId = new URL(request.url).searchParams.get('companyId') || '';
  if (request.method !== 'POST' || !UUID.test(companyId)) return reply(400, { ok: false, message: 'Selecione o perfil empresarial.' });
  if (!runtime?.configured || !runtime.standaloneFiscalService || !runtime.accessResolver) return reply(503, { ok: false, message: 'A criação fiscal independente ainda não está disponível.' });
  try {
    const access = await runtime.accessResolver.resolve(request, { companyId });
    if (!access?.authenticated) return reply(401, { ok: false, message: 'Confirme novamente a sessão.' });
    const decision = evaluateAccessDecision({ boundary: access.boundary, effectivePermissions: access.effectivePermissions, permission: 'fiscal.prepare' });
    if (!decision.allowed || decision.session.companyId !== companyId) return reply(403, { ok: false, message: 'Seu acesso não permite preparar notas neste perfil.' });
    if (Number(request.headers.get('content-length') || 0) > 128000) return reply(413, { ok: false, message: 'A nota ultrapassa o limite permitido.' });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 128000) return reply(413, { ok: false, message: 'A nota ultrapassa o limite permitido.' });
    let body;
    try { body = JSON.parse(raw); } catch { return reply(400, { ok: false, message: 'Revise os dados da nota.' }); }
    const service = body.document?.originOrderId ? runtime.orderFiscalDraftService : runtime.standaloneFiscalService;
    if (!service) return reply(503, { ok: false, message: 'A preparação fiscal do pedido não está disponível.' });
    const result = await service.create({ context: { companyId, actorId: access.boundary.userId, moduleId: 'vendas', active: true, moduleActive: true, effectivePermissions: access.effectivePermissions }, input: body.document });
    if (!result.ok) return reply(result.errors?.[0]?.code?.includes('PERMISSION') ? 403 : result.errors?.[0]?.code?.includes('CONFLICT') ? 409 : 400, { ...result, message: result.errors?.[0]?.message || 'Não foi possível salvar a nota.' });
    return reply(200, result);
  } catch { return reply(503, { ok: false, message: 'Não foi possível concluir a gravação fiscal. Tente novamente com os mesmos dados.' }); }
}
