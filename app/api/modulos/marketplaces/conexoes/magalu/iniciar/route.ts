import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { getMagaluOAuthConfiguration, MAGALU_CALLBACK_PATH, MAGALU_OAUTH_TTL, magaluCookieName } from '@/app/modules/marketplaces/services/magalu-oauth';
import { startMagaluConnection } from '@/app/modules/marketplaces/services/magalu-connection';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    if (process.env.MAGALU_OAUTH_ENABLED !== 'true') throw new MarketplaceError(503, 'magalu_not_enabled', 'A conexão Magalu está em preparação.');
    const configuration = getMagaluOAuthConfiguration();
    const origin = new URL(configuration.redirectUri).origin;
    if (new URL(request.url).origin !== origin || request.headers.get('origin') !== origin) throw new MarketplaceError(403, 'invalid_origin', 'Inicie a conexão no próprio AvantaLab.');
    const body = await request.json().catch(() => null);
    const access = await authorizeMarketplace(request, body?.empresaId, 'connections');
    const result = await startMagaluConnection(access.db, access.empresaId, access.usuario.id, configuration);
    const response = NextResponse.json({ authorizationUrl: result.authorizationUrl }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    response.cookies.set(magaluCookieName(result.state), result.browserBinding, { httpOnly: true, secure: origin.startsWith('https:'), sameSite: 'lax', path: MAGALU_CALLBACK_PATH, maxAge: MAGALU_OAUTH_TTL });
    return response;
  } catch (error) { return managementFailure(error); }
}
