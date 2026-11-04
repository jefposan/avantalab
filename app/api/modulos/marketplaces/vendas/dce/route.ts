import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { issueDceForSale, postSaleForSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, body.action === 'refresh' ? 'view' : 'manage');
    if (body.action === 'refresh') {
      const { sale } = await postSaleForSale(db, empresaId, body.connectionId, body.saleId);
      return NextResponse.json({ sale }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.action !== 'issue' || body.confirmed !== true) throw new MarketplaceError(400, 'confirmation_required', 'Confirme a emissão da DC-e deste pedido.');
    const result = await issueDceForSale(db, empresaId, String(body.connectionId || ''), String(body.saleId || ''), body.firstRequestConfirmed === true, usuario.id);
    return NextResponse.json({
      ...result,
      message: result.completed ? 'A DC-e já foi emitida. Consulte a liberação da etiqueta.' : result.alreadyRequested
        ? 'A DC-e deste pedido já está em emissão no Mercado Livre. Aguarde a liberação da etiqueta e atualize a venda.'
        : 'A emissão da DC-e foi solicitada ao Mercado Livre. Aguarde a liberação da etiqueta e atualize a venda.',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
