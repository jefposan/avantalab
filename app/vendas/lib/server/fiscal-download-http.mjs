const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ARTIFACT_TYPES = new Set(['processed_xml', 'danfe_pdf']);

const responseHeaders = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
});

function reply(status, body) { return Response.json(body, { status, headers: responseHeaders }); }
function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }

function deniedStatus(reason) {
  if (reason === 'artifact_not_found') return 404;
  if (['repository_unavailable','storage_unavailable','audit_unavailable','audit_failed','grant_failed','invalid_grant'].includes(reason)) return 503;
  return 403;
}

export async function handleFiscalDocumentDownloadRequest({ request, artifactId, runtime } = {}) {
  const contentLength = Number(request?.headers?.get?.('content-length') || 0);
  if (!request || !UUID_PATTERN.test(text(artifactId)) || (Number.isFinite(contentLength) && contentLength > 2048)) {
    return reply(400, { ok: false, code: 'AV-FISCAL-DOWNLOAD-REQUEST', message: 'A solicitação do documento fiscal é inválida.' });
  }
  let body;
  try { body = await request.json(); } catch { return reply(400, { ok: false, code: 'AV-FISCAL-DOWNLOAD-REQUEST', message: 'A solicitação do documento fiscal é inválida.' }); }
  const companyId = text(body?.companyId);
  const artifactType = text(body?.artifactType);
  if (!UUID_PATTERN.test(companyId) || !ARTIFACT_TYPES.has(artifactType)) return reply(400, { ok: false, code: 'AV-FISCAL-DOWNLOAD-REQUEST', message: 'A solicitação do documento fiscal é inválida.' });
  if (runtime?.configured !== true || !runtime.accessResolver || !runtime.downloadService) {
    return reply(503, { ok: false, code: 'AV-FISCAL-DOWNLOAD-INTEGRATION-PENDING', message: 'O acesso aos documentos fiscais ainda não está disponível.' });
  }
  let access;
  try { access = await runtime.accessResolver.resolve(request, { companyId }); } catch { return reply(503, { ok: false, code: 'AV-FISCAL-DOWNLOAD-ACCESS-UNAVAILABLE', message: 'Não foi possível confirmar o acesso neste momento.' }); }
  if (!access?.authenticated) return reply(401, { ok: false, code: 'AV-FISCAL-DOWNLOAD-SESSION', message: 'Sua sessão precisa ser confirmada novamente.' });
  let result;
  try {
    result = await runtime.downloadService.authorize({ boundary: access.boundary, effectivePermissions: access.effectivePermissions, artifactId: text(artifactId), artifactType, ttlSeconds: 60 });
  } catch {
    return reply(503, { ok: false, code: 'AV-FISCAL-DOWNLOAD-UNAVAILABLE', message: 'Não foi possível preparar o documento neste momento.' });
  }
  if (!result?.ok || !result.download) {
    const status = deniedStatus(text(result?.reason));
    const message = status === 404 ? 'O documento fiscal não foi encontrado.' : status === 403 ? 'Seu acesso não permite consultar este documento fiscal.' : 'Não foi possível preparar o documento neste momento.';
    return reply(status, { ok: false, code: status === 404 ? 'AV-FISCAL-DOWNLOAD-NOT-FOUND' : status === 403 ? 'AV-FISCAL-DOWNLOAD-DENIED' : 'AV-FISCAL-DOWNLOAD-UNAVAILABLE', message });
  }
  return reply(200, { ok: true, download: result.download });
}
