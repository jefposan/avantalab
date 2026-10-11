import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { postSaleForSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    if (!process.env.MARKETPLACE_SECRETS_KEY) throw new MarketplaceError(503, 'integration_not_configured', 'A integração com o Mercado Livre não está configurada neste ambiente. Solicite ao administrador a configuração segura antes de consultar o pós-venda.');
    const result = await postSaleForSale(db, empresaId, params.get('connectionId'), params.get('saleId'));
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
