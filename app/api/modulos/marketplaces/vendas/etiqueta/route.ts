import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { labelForSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const pdf = await labelForSale(db, empresaId, String(body.connectionId || ''), String(body.saleId || ''));
    return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="etiqueta-mercado-livre.pdf"', 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
