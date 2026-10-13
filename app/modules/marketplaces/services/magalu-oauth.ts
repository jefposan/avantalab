import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createPkceChallenge, createPkceVerifier } from './mercadolivre-oauth';
import { MagaluConnectionError, magaluProviderRejection } from './magalu-diagnostics';

export const MAGALU_CALLBACK_PATH = '/api/modulos/marketplaces/conexoes/magalu/callback';
// Uma autorização reúne as consultas de venda e pós-venda aprovadas pelo usuário.
// Não libera cancelamentos, reembolsos, envio de mensagens, publicação ou alteração de estoque.
export const MAGALU_CONNECTION_SCOPES = [
  'open:order-order-seller:read',
  'open:portfolio-skus-seller:read',
  'open:portfolio-stocks-seller:read',
  'open:order-delivery-seller:read',
  'open:order-invoice-seller:read',
  'open:order-logistics-seller:read',
  'open:logistic-fiscal-documents-seller:read',
  'open:tickets-seller:read',
  'open:ticket-messages-seller:read',
  'open:ticket-events-seller:read',
  'open:ticket-returns-seller:read',
  'open:sac-transaction-seller:read',
  'open:order-financial-report-seller:read',
  'services:conversations-seller:read',
] as const;
// Escrita autorizada exclusivamente para geração de etiqueta; nunca para estoque/SAC.
export const MAGALU_LABEL_SCOPE = 'open:order-logistics-seller:write';
export const MAGALU_AUTHORIZATION_SCOPES = [...MAGALU_CONNECTION_SCOPES, MAGALU_LABEL_SCOPE];
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
    state, scope: MAGALU_AUTHORIZATION_SCOPES.join(' '), choose_tenants: 'true', code_challenge: createPkceChallenge(intent.verifier), code_challenge_method: 'S256' })) url.searchParams.set(key, value);
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
  if (parts.length !== 3 || token.length > 32_768) throw new MagaluConnectionError('response_invalid', { issue: 'token_format' });
  let claims: { sub?: unknown; tenant?: unknown; exp?: unknown; aud?: unknown };
  try {
    const value: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    claims = value;
  } catch { throw new MagaluConnectionError('response_invalid', { issue: 'token_claims' }); }
  if (typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) throw new MagaluConnectionError('response_invalid', { issue: 'token_claims' });
  if (claims.exp <= Date.now() / 1000) throw new MagaluConnectionError('token_expired');
  if (!(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes('https://api.magalu.com')) throw new MagaluConnectionError('response_invalid', { issue: 'token_audience' });
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const sellerId = new RegExp(`^GENPUB\\.${uuid}$`, 'i');
  // No retorno atual, sub identifica o login e tenant o acesso escolhido.
  // GENPUB também pode ser pessoal: confirmar o perfil vendedor na API.
  // Preservar o contrato legado sub=GENPUB.uuid somente sem claim tenant.
  const hasTenant = Object.hasOwn(claims, 'tenant');
  const reference = hasTenant ? claims.tenant : claims.sub;
  if (typeof reference !== 'string' || !sellerId.test(reference)
    || typeof claims.sub !== 'string' || !new RegExp(`^(?:GENPUB\\.)?${uuid}$`, 'i').test(claims.sub)) {
    throw new MagaluConnectionError('identity_unconfirmed', { issue: 'identity_format' });
  }
  return { sellerReference: reference, expiresAt: claims.exp * 1000 };
}

/** Confirma o vendedor no próprio Magalu antes de permitir salvar credenciais. */
async function confirmMagaluSeller(accessToken: string, sellerReference: string) {
  let response: Response;
  try {
    response = await fetch('https://api.magalu.com/seller/v1/portfolios/me', {
      method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, 'X-Tenant-Id': sellerReference },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
    });
  } catch { throw new MagaluConnectionError('seller_verification_failed'); }
  if ([401, 403].includes(response.status)) throw new MagaluConnectionError('seller_access_denied', { providerStatus: response.status });
  if (response.status === 429) throw new MagaluConnectionError('provider_rate_limit', { providerStatus: response.status });
  if (response.status >= 500) throw new MagaluConnectionError('provider_unavailable', { providerStatus: response.status });
  if (response.status !== 200) throw new MagaluConnectionError('seller_verification_failed', { providerStatus: response.status });
  const data: unknown = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new MagaluConnectionError('response_invalid', { issue: 'seller_profile' });
  const profile = data as { tenant?: { id?: unknown }; seller?: { id?: unknown } };
  if (typeof profile.tenant?.id !== 'string' || typeof profile.seller?.id !== 'string' || !profile.seller.id.trim()) {
    throw new MagaluConnectionError('response_invalid', { issue: 'seller_profile' });
  }
  if (profile.tenant.id !== sellerReference) throw new MagaluConnectionError('identity_unconfirmed', { issue: 'seller_identity' });
}

export async function exchangeMagaluAuthorizationCode(code: string, intent: MagaluIntent, configuration: MagaluConfiguration) {
  let response: Response;
  try { response = await fetch('https://id.magalu.com/oauth/token', {
    method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'authorization_code', client_id: configuration.clientId, client_secret: configuration.clientSecret,
      redirect_uri: intent.redirectUri, code, code_verifier: intent.verifier }),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
  }); } catch (error) {
    throw new MagaluConnectionError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'token_timeout' : 'token_network');
  }
  const data = await response.json().catch(() => null) as { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; token_type?: unknown; scope?: unknown } | null;
  if (!response.ok) throw magaluProviderRejection(response.status, data);
  if (!data) throw new MagaluConnectionError('response_invalid', { providerStatus: response.status, issue: 'response_json' });
  return validateMagaluTokens(data);
}

async function validateMagaluTokens(data: { access_token?: unknown; refresh_token?: unknown; expires_in?: unknown; token_type?: unknown; scope?: unknown }) {
  if (typeof data.access_token !== 'string' || !data.access_token || typeof data.refresh_token !== 'string' || !data.refresh_token) throw new MagaluConnectionError('response_invalid', { issue: 'token_fields' });
  if (data.token_type !== 'Bearer') throw new MagaluConnectionError('response_invalid', { issue: 'token_type' });
  if (typeof data.expires_in !== 'number' || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 7200) throw new MagaluConnectionError('response_invalid', { issue: 'expires_in' });
  if (typeof data.scope !== 'string') throw new MagaluConnectionError('response_invalid', { issue: 'scope_format' });
  const scopes = data.scope.split(/\s+/).filter(Boolean);
  if (!MAGALU_CONNECTION_SCOPES.every(scope => scopes.includes(scope))) throw new MagaluConnectionError('missing_scopes');
  const metadata = tokenMetadata(data.access_token);
  await confirmMagaluSeller(data.access_token, metadata.sellerReference);
  return { accessToken: data.access_token, refreshToken: data.refresh_token, scopes, sellerReference: metadata.sellerReference,
    expiresAt: new Date(Math.min(metadata.expiresAt, Date.now() + data.expires_in * 1000)).toISOString() };
}

/** Renovação exclusivamente server-side, com o mesmo tenant e consultas conferidos. */
export async function refreshMagaluToken(refreshToken: string, configuration: MagaluConfiguration) {
  let response: Response;
  try {
    response = await fetch('https://id.magalu.com/oauth/token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: configuration.clientId, client_secret: configuration.clientSecret, refresh_token: refreshToken }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12_000),
    });
  } catch { throw new MagaluConnectionError('token_network'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 400 && data?.error === 'invalid_grant') throw new MagaluConnectionError('authorization_revoked');
    throw magaluProviderRejection(response.status, data);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new MagaluConnectionError('response_invalid', { issue: 'response_json' });
  return validateMagaluTokens(data);
}
