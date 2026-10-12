import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { listSales, markSalesSeen, processSaleNotifications } from '@/app/modules/marketplaces/services/mercadolivre-sales';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    const allAccounts = params.get('scope') === 'all';
    const ids: string[] = [];
    if (allAccounts) {
      const { data, error } = await db.from('marketplace_connections').select('id').eq('empresa_id', empresaId).eq('provider', 'mercado_livre').eq('status', 'connected');
      if (error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar as contas de vendas.');
      ids.push(...(data || []).map((row) => row.id));
    } else {
      ids.push((await loadConnection(db, empresaId, params.get('connectionId'))).id);
    }
    if (!ids.length) return NextResponse.json({ sales: [], awaitingUpdates: 0 }, { headers: { 'Cache-Control': 'no-store' } });
    // Só relê contas que possuem eventos prontos. O total conta pedidos, nunca a fila.
    const { data: queued, error: queueError } = await db.from('marketplace_sale_notifications').select('connection_id').eq('empresa_id', empresaId).is('processed_at', null).lte('next_attempt_at', new Date().toISOString());
    if (queueError) throw new MarketplaceError(503, 'database', 'Não foi possível atualizar os avisos de vendas.');
    const pending = new Set((queued || []).map((row) => row.connection_id));
    const deadline = Date.now() + 40_000;
    await Promise.all(ids.filter((id) => pending.has(id)).map(async (id) => {
      await processSaleNotifications(db, await loadConnection(db, empresaId, id), 12, deadline);
    }));
    const sales = await listSales(db, empresaId, ids);
    const { count: awaitingUpdates, error: countError } = await db.from('marketplace_sale_notifications').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).in('connection_id', ids).is('processed_at', null);
    if (countError) throw new MarketplaceError(503, 'database', 'Não foi possível conferir as atualizações pendentes.');
    return NextResponse.json({ sales, awaitingUpdates: awaitingUpdates || 0 }, { headers: { 'Cache-Control': 'no-store' } });
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
