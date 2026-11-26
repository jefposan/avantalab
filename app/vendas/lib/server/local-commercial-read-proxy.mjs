const PREFIX = '/api/modulos/vendas/';
const READ_PATHS = new Set([
  'perfil', 'catalogo', 'commercial/policy', 'commercial/operations',
  'commercial/customers', 'commercial/suppliers', 'commercial/receivables',
  'commercial/stock', 'fiscal/documents', 'fiscal/profile', 'fiscal/rules',
  'fiscal/editor', 'fiscal/certificate', 'fiscal/backup-notas',
]);
const headers = { 'Cache-Control': 'no-store, max-age=0', 'X-Avanta-Local-Data': 'production-read-only' };
const reply = (status, message) => Response.json({ ok: false, message, mensagem: message }, { status, headers });

/** Development-only reads through the official authenticated API; never forwards writes. */
export async function proxyLocalCommercialRead(request, { environment = process.env, fetchImpl = fetch } = {}) {
  const url = new URL(request.url);
  if (environment.NODE_ENV !== 'development' || environment.VERCEL
    || environment.AVANTA_LOCAL_REAL_DATA_READ_ONLY !== 'true'
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.port !== '3000' || !url.pathname.startsWith(PREFIX)) return null;
  if (request.method !== 'GET') return reply(403, 'Ambiente local somente para consulta. Gravações, reservas e transmissão fiscal estão bloqueadas.');
  const path = url.pathname.slice(PREFIX.length);
  if (path === 'commercial/overview') return null; // Nova leitura local: autenticação e cálculo no próprio servidor.
  if (!READ_PATHS.has(path) && !/^fiscal\/status\/[0-9a-f-]{36}$/i.test(path)) return reply(403, 'Consulta indisponível neste ambiente local.');
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer \S+$/i.test(authorization)) return reply(401, 'Confirme sua sessão para consultar os dados reais.');
  try {
    const target = new URL(url.pathname + url.search, 'https://avantalab.com.br');
    const remote = await fetchImpl(target, {
      method: 'GET', headers: { Authorization: authorization, Accept: 'application/json' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(25_000),
    });
    if (!remote.headers.get('content-type')?.includes('application/json')) return reply(502, 'A consulta ao servidor oficial não retornou dados válidos.');
    return new Response(remote.body, { status: remote.status, headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch { return reply(503, 'Não foi possível consultar os dados reais. Tente novamente.'); }
}
