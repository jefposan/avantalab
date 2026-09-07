export const FISCAL_LOCAL_MAX_BODY_BYTES = 256 * 1024;

const FORBIDDEN_SECRET_KEYS = /^(senha|password|passphrase|token|secret|privatekey|privatekeypem|chaveprivada|pfx|pfxbase64|pfxcontent|p12|pkcs12|certificatecontent|certificatepem|chainpem)$/i;

export function containsForbiddenFiscalSecret(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 8) return false;
  if (Array.isArray(value)) return value.some((item) => containsForbiddenFiscalSecret(item, depth + 1));
  return Object.entries(value).some(([key, item]) => FORBIDDEN_SECRET_KEYS.test(key.replace(/[_-]/g, '')) || containsForbiddenFiscalSecret(item, depth + 1));
}

export async function readLocalFiscalJsonRequest(request, expectedMode) {
  if (request.headers.get('x-avanta-fiscal-mode') !== expectedMode) {
    return { ok: false, status: 403, error: 'A rota aceita somente o diagnóstico local identificado do protótipo.' };
  }
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLocaleLowerCase('en-US').includes('application/json')) {
    return { ok: false, status: 415, error: 'Envie o diagnóstico em JSON.' };
  }
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > FISCAL_LOCAL_MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'O diagnóstico excede o limite seguro de 256 KB.' };
  }
  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return { ok: false, status: 400, error: 'O corpo da solicitação não pôde ser lido.' };
  }
  if (new TextEncoder().encode(rawBody).byteLength > FISCAL_LOCAL_MAX_BODY_BYTES) {
    return { ok: false, status: 413, error: 'O diagnóstico excede o limite seguro de 256 KB.' };
  }
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, error: 'O corpo JSON não pôde ser interpretado.' };
  }
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Informe o rascunho, o cliente e a configuração da bancada.' };
  }
  if (containsForbiddenFiscalSecret(body)) {
    return { ok: false, status: 400, error: 'Segredos, senhas, tokens, PFX e chaves privadas são proibidos nesta rota.' };
  }
  return { ok: true, status: 200, value: body };
}

export function saoPauloFiscalTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}:${value.second}-03:00`;
}
