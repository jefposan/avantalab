import { createHash, randomBytes } from 'node:crypto';

type MercadoLivreTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number;
  error?: string;
  message?: string;
};

export type MercadoLivreOAuthConfiguration = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function createMercadoLivreOAuthState() {
  return randomBytes(32).toString('base64url');
}

export function createPkceVerifier() {
  return randomBytes(64).toString('base64url');
}

export function createPkceChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function createMercadoLivreAuthorizationUrl({ clientId, redirectUri, state, codeChallenge }: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}) {
  const url = new URL('https://auth.mercadolivre.com.br/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

export function getMercadoLivreOAuthConfiguration(): MercadoLivreOAuthConfiguration {
  const clientId = process.env.MERCADOLIVRE_CLIENT_ID || '';
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET || '';
  const redirectUri = process.env.MERCADOLIVRE_OAUTH_REDIRECT_URI || '';
  if (!clientId || !clientSecret || clientSecret === '<redacted>' || !redirectUri) {
    throw new Error('A integração do Mercado Livre ainda não está configurada neste ambiente.');
  }
  return { clientId, clientSecret, redirectUri };
}

export async function exchangeMercadoLivreAuthorizationCode(code: string, codeVerifier: string) {
  const configuration = getMercadoLivreOAuthConfiguration();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: configuration.clientId,
    client_secret: configuration.clientSecret,
    code,
    redirect_uri: configuration.redirectUri,
    code_verifier: codeVerifier,
  });
  return requestToken(body);
}

export async function refreshMercadoLivreToken(refreshToken: string) {
  const configuration = getMercadoLivreOAuthConfiguration();
  return requestToken(new URLSearchParams({ grant_type: 'refresh_token', client_id: configuration.clientId,
    client_secret: configuration.clientSecret, refresh_token: refreshToken }));
}

async function requestToken(body: URLSearchParams) {
  const response = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json().catch(() => ({})) as MercadoLivreTokenResponse;
  if (!response.ok || !data.access_token || !data.refresh_token || !data.user_id || !data.expires_in || !Number.isFinite(Number(data.expires_in)) || Number(data.expires_in) <= 0) {
    const providerCode = ['invalid_client', 'invalid_grant', 'unauthorized_client'].includes(data.error || '') ? data.error : 'resposta-incompleta';
    throw new Error(`OAuth do Mercado Livre recusado (${response.status}: ${providerCode}).`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    scopes: String(data.scope || '').split(/\s+/).filter(Boolean),
    sellerReference: String(data.user_id),
    expiresAt: data.expires_in ? new Date(Date.now() + Number(data.expires_in) * 1000).toISOString() : null,
  };
}
