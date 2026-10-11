import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readAuthorizationRenewal } from '@/app/modules/marketplaces/services/authorization-renewal';
import { createMercadoLivreAuthorizationUrl, createPkceChallenge, getMercadoLivreOAuthConfiguration } from '@/app/modules/marketplaces/services/mercadolivre-oauth';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
export const runtime = 'nodejs';

/** Link de capacidade: permite somente renovar a conta já vinculada, nunca consultar vendas ou criar outra conexão. */
export async function POST(request: Request) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin) throw new MarketplaceError(403, 'invalid_origin', 'Abra o link no AvantaLab para continuar.');
    const body = await request.json();
    if (!['consultar', 'autorizar'].includes(body.action)) throw new MarketplaceError(400, 'invalid_action', 'Ação inválida.');
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '', { auth: { persistSession: false, autoRefreshToken: false } });
    const { pending, intent, account } = await readAuthorizationRenewal(db, body.requestId);
    const configuration = getMercadoLivreOAuthConfiguration();
    return NextResponse.json({ sellerName: account.seller_name || intent.sellerReference, sellerReference: intent.sellerReference, expiresAt: pending.expires_at,
      ...(body.action === 'autorizar' ? { authorizationUrl: createMercadoLivreAuthorizationUrl({ clientId: configuration.clientId, redirectUri: configuration.redirectUri, state: body.requestId, codeChallenge: createPkceChallenge(intent.verifier) }) } : {}),
    }, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return managementFailure(error); }
}
