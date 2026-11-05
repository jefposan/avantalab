import {thermalLabelPdf} from '@/app/modules/marketplaces/thermal-label-pdf';
import {thermalLabelText} from '@/app/modules/marketplaces/thermal-label';
import {shippingLabelFilename} from '@/app/modules/marketplaces/label-download';
import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { labelForSale } from '@/app/modules/marketplaces/services/mercadolivre-sales';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const format = body.format ?? 'pdf';
    if (format !== 'pdf' && format !== 'zpl2') throw new MarketplaceError(400, 'invalid_label_format', 'Formato de etiqueta inválido.');
    const bytes = await labelForSale(db, empresaId, String(body.connectionId || ''), String(body.saleId || ''), format);
    let file=bytes;
    if(format==='pdf'){try{file=new Uint8Array(await thermalLabelPdf(bytes));}catch{throw new MarketplaceError(503,'unsupported_thermal_pdf','O PDF retornado pelo Mercado Livre não corresponde ao modelo térmico reconhecido. Baixe o TXT ou tente novamente; nenhum documento foi cortado.');}}
    if(format==='zpl2'){try{file=new Uint8Array(thermalLabelText(bytes));}catch{throw new MarketplaceError(503,'invalid_thermal_label','Não foi possível extrair a etiqueta térmica deste pedido. Tente baixar novamente.');}}
    const filename=shippingLabelFilename(String(body.orderId||body.saleId||''),[{title:typeof body.productName==='string'?body.productName:''}],format==='pdf'?'pdf':'txt');
    return new NextResponse(file, { headers: { 'Content-Type': format === 'zpl2' ? 'text/plain; charset=utf-8' : 'application/pdf', 'Content-Disposition': format === 'zpl2' ? `attachment; filename="${filename}"` : `inline; filename="${filename}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return managementFailure(error); }
}
