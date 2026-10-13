// Teste real opcional e isolado: loopback, sem Supabase e sem persistir tokens.
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';

if (process.env.NODE_ENV === 'production' || process.env.MAGALU_LOCAL_TEST !== 'true') throw new Error('Teste local não autorizado.');
const credentialsPath = process.env.MAGALU_TEST_CREDENTIALS_FILE;
if (!credentialsPath) throw new Error('Informe o arquivo privado de credenciais para o teste local.');
const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
if (typeof credentials.clientId !== 'string' || typeof credentials.clientSecret !== 'string' || !credentials.clientId || !credentials.clientSecret) throw new Error('Credenciais locais incompletas.');
const origin = 'http://localhost:3000';
const callbackPath = '/api/modulos/marketplaces/conexoes/magalu/callback';
const configuration = { ...credentials, redirectUri: origin + callbackPath };
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const path = resolve(dirname(new URL(context.parentURL).pathname), specifier);
    if (existsSync(`${path}.ts`)) return next(pathToFileURL(`${path}.ts`).href, context);
  }
  return next(specifier, context);
} });
const oauth = await import('../app/modules/marketplaces/services/magalu-oauth.ts');
hooks.deregister();
const nonce = randomBytes(18).toString('base64url');
const csrf = randomBytes(32).toString('base64url');
const binding = randomBytes(32).toString('base64url');
let attempt;
let report = { etapa: 'Aguardando autorização', bancoDeProducao: 'Não utilizado' };
const originalFetch = globalThis.fetch;
const categories = ['GENPUB', 'MAGAZINELUIZA', 'ORG', 'PERSON', 'USER', 'UUID'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const classify = value => typeof value !== 'string' ? 'ausente' : uuid.test(value) ? 'UUID' : categories.find(c => value.startsWith(c + '.')) || 'outro';
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
globalThis.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (args[0] === 'https://api.magalu.com/seller/v1/portfolios/me') {
    const body = await response.clone().json().catch(() => null);
    report.consultaVendedorHttp = response.status;
    report.identidadeVendedorConfere = body?.tenant?.id === args[1]?.headers?.['X-Tenant-Id'];
    report.vendedorPresente = typeof body?.seller?.id === 'string' && Boolean(body.seller.id.trim());
    report.tipoIdTenant = classify(body?.tenant?.id);
    return response;
  }
  if (args[0] !== 'https://id.magalu.com/oauth/token') return response;
  const data = await response.clone().json().catch(() => null);
  let claims;
  try { claims = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64url').toString('utf8')); } catch { claims = {}; }
  // Somente categorias/booleanos: nunca valores de claims, IDs ou tokens.
  report = { etapa: 'Retorno recebido', bancoDeProducao: 'Não utilizado', http: response.status,
    consultasAutorizadas: typeof data?.scope === 'string' && oauth.MAGALU_CONNECTION_SCOPES.every(s => data.scope.split(/\s+/).includes(s)),
    tipoDoIdentificador: classify(claims?.sub),
    campos: Object.fromEntries(['sub', 'tenant', 'tenant_id', 'tenantId', 'tid', 'organization_id', 'seller_id', 'account_type'].map(key => [key, classify(claims?.[key])])),
  };
  return response;
};
function html(message) {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teste local seguro · Magalu</title><main><h1>Teste local de autorização Magalu</h1><p role="status">${escape(message)}</p><p>Nenhuma conta, anúncio ou estoque é gravado no banco de produção.</p><pre>${escape(JSON.stringify(report,null,2))}</pre>${attempt ? '' : `<form method="POST" action="/iniciar"><input type="hidden" name="csrf" value="${csrf}"><button>Iniciar teste de autorização</button></form>`}</main><script nonce="${nonce}">history.replaceState(null,'',location.pathname)</script></html>`;
}
function output(res, message, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; form-action 'self' https://id.magalu.com; frame-ancestors 'none'; base-uri 'none'` });
  res.end(html(message));
}
const server = createServer(async (req, res) => {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) || req.headers.host !== 'localhost:3000') return output(res, 'Origem não permitida.', 403);
  const url = new URL(req.url, origin);
  try {
    if (req.method === 'GET' && url.pathname === '/') return output(res, 'Teste isolado, sem persistência de credenciais.');
    if (req.method === 'POST' && url.pathname === '/iniciar') {
      // no-referrer pode tornar Origin nulo no POST; Sec-Fetch-Site e CSRF
      // continuam exigindo uma submissão gerada na própria página local.
      const localOrigin = req.headers.origin === origin || (req.headers.origin === 'null' && req.headers['sec-fetch-site'] === 'same-origin');
      if (attempt || !localOrigin) return output(res, 'Inicie pelo teste local.', 403);
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 4096) return output(res, 'Solicitação inválida.', 400); }
      if (!same(new URLSearchParams(body).get('csrf'), csrf)) return output(res, 'Confirmação local inválida.', 403);
      attempt = oauth.createMagaluAuthorization(configuration);
      res.writeHead(302, { Location: attempt.authorizationUrl, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Set-Cookie': `magalu_local_test=${binding}; HttpOnly; SameSite=Lax; Path=${callbackPath}; Max-Age=600` }); return res.end();
    }
    if (req.method === 'GET' && url.pathname === callbackPath) {
      const cookie = (req.headers.cookie || '').split('; ').find(v => v.startsWith('magalu_local_test='))?.slice('magalu_local_test='.length);
      if (!attempt || attempt.used || Date.parse(attempt.expiresAt) <= Date.now() || !same(url.searchParams.get('state'), attempt.state) || !same(cookie, binding)) return output(res, 'Retorno não confirmado ou expirado.', 403);
      attempt.used = true;
      res.setHeader('Set-Cookie', `magalu_local_test=; HttpOnly; SameSite=Lax; Path=${callbackPath}; Max-Age=0`);
      if (url.searchParams.has('error')) return output(res, 'A autorização não foi aprovada.');
      const code = url.searchParams.get('code'); if (!code || code.length > 4096) return output(res, 'Retorno incompleto.', 400);
      try {
        await oauth.exchangeMagaluAuthorizationCode(code, attempt.intent, configuration);
        report.etapa = 'Identificação validada'; output(res, 'Autorização e identificação validadas no teste local. A conexão NÃO foi salva em produção.');
      } catch (error) {
        report.erro = ['identity_unconfirmed', 'response_invalid', 'missing_scopes', 'authorization_rejected', 'permission_denied', 'token_network', 'token_timeout', 'seller_access_denied', 'seller_verification_failed', 'provider_rate_limit', 'provider_unavailable'].includes(error?.code) ? error.code : 'falha';
        report.motivo = oauthErrorMessage(error);
        output(res, 'Teste concluído sem gravar credenciais. Confira somente as categorias seguras abaixo.');
      }
      attempt.intent = null;
      return;
    }
    output(res, 'Página não encontrada.', 404);
  } catch { output(res, 'Teste local interrompido com segurança.', 500); }
});
function oauthErrorMessage(error) {
  if (report.erro === 'falha') return 'Não foi possível concluir o teste.';
  // Só mensagens do catálogo interno; nenhuma resposta bruta do fornecedor.
  return error.name === 'MagaluConnectionError' ? error.message : 'Não foi possível concluir o teste.';
}
server.requestTimeout = 15000;
server.listen(3000, '127.0.0.1', () => console.log('Teste isolado disponível em http://localhost:3000. Sem Supabase e sem logs de credenciais.'));
const shutdown = () => { globalThis.fetch = originalFetch; attempt = null; server.close(() => process.exit(0)); };
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
setTimeout(shutdown, 30 * 60_000).unref();
