import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { listSales, markSalesSeen, pendingSalesByConnection, processSaleNotifications } from '@/app/modules/marketplaces/services/mercadolivre-sales';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    const connection = await loadConnection(db, empresaId, params.get('connectionId'));
    await processSaleNotifications(db, connection);
    const [sales, pendingByConnection] = await Promise.all([listSales(db, empresaId, connection.id), pendingSalesByConnection(db, empresaId)]);
    if (params.get('markSeen') === 'true') await markSalesSeen(db, empresaId, connection.id);
    return NextResponse.json({ sales, pendingByConnection }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId);
    const connection = await loadConnection(db, empresaId, body.connectionId);
    if (body.action !== 'mark_seen') throw new MarketplaceError(400, 'invalid_action', 'Ação de venda inválida.');
    await markSalesSeen(db, empresaId, connection.id);
    return NextResponse.json({ ok: true });
  } catch (error) { return managementFailure(error); }
}
