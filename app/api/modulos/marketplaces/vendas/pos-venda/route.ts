import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { postSaleForSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';
import { loadSalesProvider } from '@/app/modules/marketplaces/services/sales-provider';
import { magaluPostSaleForSale } from '@/app/modules/marketplaces/services/magalu-sales';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    if (!process.env.MARKETPLACE_SECRETS_KEY) throw new MarketplaceError(503, 'integration_not_configured', 'A integração não está configurada com segurança neste ambiente. Solicite ao administrador antes de consultar o pós-venda.');
    const selected = await loadSalesProvider(db, empresaId, params.get('connectionId'));
    const result = selected.provider === 'magalu'
      ? await magaluPostSaleForSale(db, empresaId, selected.connection.id, params.get('saleId'))
      : await postSaleForSale(db, empresaId, selected.connection.id, params.get('saleId'));
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
