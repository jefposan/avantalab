import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPkceChallenge, createPkceVerifier } from './mercadolivre-oauth';

export const MAGALU_CALLBACK_PATH = '/api/modulos/marketplaces/conexoes/magalu/callback';
// A primeira etapa apenas conecta e consulta. Escrita depende dos futuros adaptadores.
export const MAGALU_CONNECTION_SCOPES = ['open:order-order-seller:read', 'open:portfolio-skus-seller:read', 'open:portfolio-stocks-seller:read'] as const;
export const MAGALU_OAUTH_TTL = 600;
export type MagaluConfiguration = { clientId: string; clientSecret: string; redirectUri: string };
export type MagaluIntent = { provider: 'magalu'; verifier: string; clientId: string; redirectUri: string };

export function validateMagaluRedirectUri(value: string) {
  const url = new URL(value);
  const local = process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && url.hostname === 'localhost' && url.port === '3000';
  const production = url.protocol === 'https:' && url.hostname === 'avantalab.com.br' && !url.port;
  if ((!local && !production) || url.pathname !== MAGALU_CALLBACK_PATH || url.username || url.password || url.search || url.hash) throw new Error('Retorno Magalu inválido.');
  return url.toString();
}

export function getMagaluOAuthConfiguration(): MagaluConfiguration {
  // Credencial de desenvolvimento gerada pelo IDM: arquivo privado ignorado no Git.
  // Nunca disponibilizar este caminho ou fallback no build/ambiente de produção.
  let local: { clientId?: string; clientSecret?: string } = {};
  if (process.env.NODE_ENV !== 'production' && process.env.MAGALU_LOCAL_CREDENTIALS_FILE) {
    const path = resolve(process.cwd(), process.env.MAGALU_LOCAL_CREDENTIALS_FILE);
    if (path !== resolve(process.cwd(), '.codex/magalu/client-credentials.json')) throw new Error('Credencial local Magalu inválida.');
    local = JSON.parse(readFileSync(path, 'utf8'));
  }
  const clientId = process.env.MAGALU_CLIENT_ID?.trim() || local.clientId?.trim() || '';
  const clientSecret = process.env.MAGALU_CLIENT_SECRET?.trim() || local.clientSecret?.trim() || '';
  const redirectUri = process.env.MAGALU_OAUTH_REDIRECT_URI?.trim() || '';
  if (!clientId || !clientSecret || !redirectUri || clientSecret === '<redacted>') throw new Error('A conexão Magalu ainda não está configurada neste ambiente.');
  return { clientId, clientSecret, redirectUri: validateMagaluRedirectUri(redirectUri) };
}

export function magaluBrowserHash(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function magaluCookieName(state: string) { return `avanta-magalu-${state}`; }
export function magaluBrowserMatches(binding: string, expected: string | null) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(binding) || !/^[a-f0-9]{64}$/.test(expected || '')) return false;
  return timingSafeEqual(Buffer.from(magaluBrowserHash(binding), 'hex'), Buffer.from(expected!, 'hex'));
}
export function createMagaluAuthorization(configuration: MagaluConfiguration) {
  const state = randomBytes(32).toString('base64url');
  const browserBinding = randomBytes(32).toString('base64url');
  const intent: MagaluIntent = { provider: 'magalu', verifier: createPkceVerifier(), clientId: configuration.clientId, redirectUri: configuration.redirectUri };
  const url = new URL('https://id.magalu.com/login');
  for (const [key, value] of Object.entries({ response_type: 'code', client_id: configuration.clientId, redirect_uri: configuration.redirectUri,
    state, scope: MAGALU_CONNECTION_SCOPES.join(' '), choose_tenants: 'true', code_challenge: createPkceChallenge(intent.verifier), code_challenge_method: 'S256' })) url.searchParams.set(key, value);
  return { state, browserBinding, intent, authorizationUrl: url.toString(), expiresAt: new Date(Date.now() + MAGALU_OAUTH_TTL * 1000).toISOString() };
}

export function readMagaluIntent(value: string, configuration: MagaluConfiguration): MagaluIntent {
  const intent = JSON.parse(value) as MagaluIntent;
  if (intent?.provider !== 'magalu' || !/^[A-Za-z0-9_-]{43,128}$/.test(intent.verifier) || intent.clientId !== configuration.clientId || intent.redirectUri !== configuration.redirectUri) throw new Error('Solicitação Magalu inválida.');
  return intent;
}

/** Só interpreta tokens recebidos diretamente do endpoint HTTPS oficial, nunca do navegador. */
function tokenMetadata(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 32_768) throw new Error('Resposta Magalu incompleta.');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: unknown; exp?: unknown; aud?: unknown };
  if (typeof claims.sub !== 'string' || !/^GENPUB\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(claims.sub)
    || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp <= Date.now() / 1000
    || !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes('https://api.magalu.com')) throw new Error('O Magalu não confirmou uma loja nesta autorização.');
  return { sellerReference: claims.sub, expiresAt: claims.exp * 1000 };
}

export async function exchangeMagaluAuthorizationCode(code: string, intent: MagaluIntent, configuration: MagaluConfiguration) {
  const response = await fetch('https://id.magalu.com/oauth/token', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', client_id: configuration.clientId, client_secret: configuration.clientSecret,
      redirect_uri: intent.redirectUri, code, code_verifier: intent.verifier }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json().catch(() => null) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; token_type?: unknown; scope?: unknown } | null;
  if (!response.ok || typeof data?.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token
    || data.token_type !== 'Bearer' || typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 7200
    || typeof data.scope !== 'string') throw new Error('O Magalu não concluiu a autorização. Tente conectar novamente.');
  const scopes = data.scope.split(/\s+/).filter(Boolean);
  if (!MAGALU_CONNECTION_SCOPES.every(scope => scopes.includes(scope))) throw new Error('Autorize a consulta de pedidos, produtos e estoque da loja no Magalu para concluir.');
  const metadata = tokenMetadata(data.access_token);
  return { accessToken: data.access_token, refreshToken: data.refresh_token, scopes, sellerReference: metadata.sellerReference,
    expiresAt: new Date(Math.min(metadata.expiresAt, Date.now() + data.expires_in * 1000)).toISOString() };
}
