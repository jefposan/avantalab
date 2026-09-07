const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function identificadorFiscalValido(value: unknown) {
  return UUID_PATTERN.test(typeof value === 'string' ? value.trim() : '');
}

export function origemFiscalLab(environment: Record<string, string | undefined> = process.env) {
  const value = environment.FISCAL_LAB_ORIGIN?.trim() || 'http://127.0.0.1:3015';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(url.hostname) || (url.port && url.port !== '3015')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function respostaFiscalLab(status: number, body: unknown) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      Pragma: 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function encaminharFiscalLab(input: { request: Request; path: string; method: 'GET' | 'POST'; body?: unknown }) {
  if (process.env.NODE_ENV !== 'development') return respostaFiscalLab(404, { ok: false, message: 'Recurso não encontrado.' });
  const origin = origemFiscalLab();
  const authorization = input.request.headers.get('authorization')?.trim() || '';
  if (!origin || !authorization.startsWith('Bearer ')) return respostaFiscalLab(401, { ok: false, message: 'Sua sessão precisa ser confirmada novamente.' });
  try {
    const response = await fetch(`${origin}${input.path}`, {
      method: input.method,
      headers: {
        Authorization: authorization,
        ...(input.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: input.method === 'POST' ? JSON.stringify(input.body ?? {}) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => ({ ok: false, message: 'O serviço fiscal retornou uma resposta inválida.' }));
    return respostaFiscalLab(response.status, payload);
  } catch {
    return respostaFiscalLab(503, { ok: false, message: 'A consulta fiscal ainda não está disponível.' });
  }
}

export async function encaminharFiscalLabFormData(input: { request: Request; path: string; formData: FormData }) {
  if (process.env.NODE_ENV !== 'development') return respostaFiscalLab(404, { ok: false, message: 'Recurso não encontrado.' });
  const origin = origemFiscalLab();
  const authorization = input.request.headers.get('authorization')?.trim() || '';
  if (!origin || !authorization.startsWith('Bearer ')) return respostaFiscalLab(401, { ok: false, message: 'Sua sessão precisa ser confirmada novamente.' });
  try {
    const response = await fetch(`${origin}${input.path}`, {
      method: 'POST',
      headers: { Authorization: authorization },
      body: input.formData,
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000),
    });
    const payload = await response.json().catch(() => ({ ok: false, message: 'O serviço fiscal retornou uma resposta inválida.' }));
    return respostaFiscalLab(response.status, payload);
  } catch {
    return respostaFiscalLab(503, { ok: false, message: 'A instalação do certificado está temporariamente indisponível.' });
  }
}
