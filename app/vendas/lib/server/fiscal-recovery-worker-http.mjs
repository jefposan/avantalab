import { timingSafeEqual } from 'node:crypto';

const responseHeaders = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
});

function text(value) { return typeof value === 'string' ? value.trim() : String(value ?? '').trim(); }
function reply(status, body) { return Response.json(body, { status, headers: responseHeaders }); }

function bearer(request) {
  const value = text(request?.headers?.get?.('authorization'));
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

function sameSecret(left, right) {
  const a = Buffer.from(text(left));
  const b = Buffer.from(text(right));
  return a.length >= 32 && a.length === b.length && timingSafeEqual(a, b);
}

export async function handleFiscalRecoveryWorkerRequest({ request, runtime } = {}) {
  const contentLength = Number(request?.headers?.get?.('content-length') || 0);
  if (!request || request.method !== 'POST' || !Number.isFinite(contentLength) || contentLength > 1024) return reply(400, { ok: false, code: 'AV-FISCAL-WORKER-REQUEST', message: 'A solicitação do executor fiscal é inválida.' });
  if (runtime?.configured !== true || !runtime.worker || !runtime.workerToken || !runtime.workerId) return reply(503, { ok: false, code: 'AV-FISCAL-WORKER-INTEGRATION-PENDING', message: 'O executor fiscal ainda não está disponível.' });
  if (!sameSecret(bearer(request), runtime.workerToken)) return reply(401, { ok: false, code: 'AV-FISCAL-WORKER-AUTHORIZATION', message: 'A autenticação interna do executor não foi confirmada.' });
  let body = {};
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, 'utf8') > 1024) return reply(400, { ok: false, code: 'AV-FISCAL-WORKER-REQUEST', message: 'A solicitação do executor fiscal é inválida.' });
    if (rawBody.trim()) body = JSON.parse(rawBody);
  } catch { return reply(400, { ok: false, code: 'AV-FISCAL-WORKER-REQUEST', message: 'A solicitação do executor fiscal é inválida.' }); }
  const requestedLimit = Number(body?.limit ?? 5);
  const limit = Number.isInteger(requestedLimit) ? Math.min(10, Math.max(1, requestedLimit)) : 5;
  let result;
  try { result = await runtime.worker.runOnce({ workerId: runtime.workerId, limit, leaseSeconds: 120 }); }
  catch { return reply(503, { ok: false, code: 'AV-FISCAL-WORKER-UNAVAILABLE', message: 'O executor fiscal não pôde concluir esta rodada.' }); }
  if (!result?.ok) return reply(503, { ok: false, code: 'AV-FISCAL-WORKER-UNAVAILABLE', message: 'O executor fiscal não pôde concluir esta rodada.' });
  return reply(200, { ok: true, summary: { claimed: Number(result.claimed || 0), completed: Number(result.completed || 0), retried: Number(result.retried || 0), deadLetter: Number(result.deadLetter || 0) } });
}
