import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection, mlRequest } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { objectValue, uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';
import { safeMarketplaceLink } from '@/app/modules/marketplaces/services/inventory-model';
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
    const alert = await db.from('marketplace_sale_alerts').select('id,connection_id,provider,listing_id').eq('empresa_id', empresaId).eq('id', body.alertId).maybeSingle();
    if (alert.error) throw new MarketplaceError(503, 'database', 'Não foi possível consultar o aviso.');
    if (!alert.data) throw new MarketplaceError(404, 'alert_missing', 'Aviso não encontrado nesta empresa.');
    if (body.action === 'resolve_link') {
      if (alert.data.provider !== 'mercado_livre') throw new MarketplaceError(409, 'provider_not_supported', 'Esta plataforma ainda precisa do conector de anúncios.');
      const connection = await loadConnection(db, empresaId, alert.data.connection_id);
      const item = objectValue(await mlRequest(db, connection, `/items/${alert.data.listing_id}`));
      const link = safeMarketplaceLink(alert.data.provider, item.permalink);
      if (item.id !== alert.data.listing_id || String(item.seller_id) !== connection.seller_reference || !link) throw new MarketplaceError(503, 'listing_link_unavailable', 'Não foi possível abrir este anúncio. Confira o pedido na mesma conta do Mercado Livre.');
      return NextResponse.json({ link }, { headers });
    }
    if (body.action !== 'acknowledge') throw new MarketplaceError(400, 'invalid_action', 'Ação de aviso inválida.');
    const saved = await db.from('marketplace_sale_alert_reads').upsert({ empresa_id: empresaId, alert_id: alert.data.id, user_id: usuario.id }, { onConflict: 'alert_id,user_id' });
    if (saved.error) throw new MarketplaceError(503, 'database', 'Não foi possível confirmar a leitura. Tente novamente.');
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) { return managementFailure(error); }
}
