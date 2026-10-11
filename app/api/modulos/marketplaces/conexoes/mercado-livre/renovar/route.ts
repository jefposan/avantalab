import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizationRenewalStatus, createAuthorizationRenewal } from '@/app/modules/marketplaces/services/authorization-renewal';
import { getMercadoLivreOAuthConfiguration } from '@/app/modules/marketplaces/services/mercadolivre-oauth';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'connections');
    if (body.action === 'status') {
      const result = await authorizationRenewalStatus(db, empresaId, usuario.id, body.connectionId, body.requestId);
      return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    getMercadoLivreOAuthConfiguration();
    const result = await createAuthorizationRenewal(db, empresaId, usuario.id, body.connectionId, new URL(request.url).origin);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return managementFailure(error); }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'connections');
    if (typeof body.requestId !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.requestId)) throw new MarketplaceError(400, 'invalid_request', 'Solicitação inválida.');
    const { data, error } = await db.from('marketplace_oauth_pending').update({ consumed_at: new Date().toISOString() }).eq('state', body.requestId).eq('empresa_id', empresaId).eq('provider', 'mercado_livre').eq('started_by', usuario.id).is('consumed_at', null).select('id').maybeSingle();
    if (error) throw new MarketplaceError(503, 'database', 'Não foi possível cancelar o link.');
    if (!data) throw new MarketplaceError(410, 'renewal_unavailable', 'Este link não está mais pendente. Uma autorização já iniciada não pode ser cancelada por este botão.');
    return NextResponse.json({ cancelled: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
