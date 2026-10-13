import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const { db, empresaId, usuario } = await authorizeMarketplace(request, new URL(request.url).searchParams.get('empresaId'));
    const result = await db.rpc('marketplace_live_feed', { p_empresa: empresaId, p_user: usuario.id });
    if (result.error) throw new MarketplaceError(503, 'live_feed_unavailable', 'Os avisos automáticos ainda não puderam ser consultados. Confira a configuração da sincronização.');
    return NextResponse.json(result.data, { headers });
  } catch (error) { return managementFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId);
    if (!uuidIsValid(body.alertId)) throw new MarketplaceError(400, 'invalid_alert', 'Aviso inválido.');
    const alert = await db.from('marketplace_sale_alerts').select('id,sale_id,connection_id').eq('empresa_id', empresaId).eq('id', body.alertId).maybeSingle();
    if (alert.error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar o aviso.');
    if (!alert.data) throw new MarketplaceError(404, 'alert_missing', 'Aviso não encontrado nesta empresa.');
    if (body.action !== 'acknowledge') throw new MarketplaceError(400, 'invalid_action', 'Ação de aviso inválida.');
    const associated = await db.from('marketplace_sale_alerts').select('id').eq('empresa_id', empresaId).eq('connection_id', alert.data.connection_id).eq('sale_id', alert.data.sale_id);
    if (associated.error || !associated.data?.length) throw new MarketplaceError(503, 'database', 'Não foi possível confirmar os avisos deste pedido.');
    const saved = await db.from('marketplace_sale_alert_reads').upsert(associated.data.map(row => ({ empresa_id: empresaId, alert_id: row.id, user_id: usuario.id })), { onConflict: 'alert_id,user_id' });
    if (saved.error) throw new MarketplaceError(503, 'database', 'Não foi possível confirmar a leitura. Tente novamente.');
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) { return managementFailure(error); }
}
