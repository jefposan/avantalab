import { NextResponse } from 'next/server';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { consultLocalPrice, editLocalReference } from '@/app/modules/marketplaces/services/local-price-consultation';
import { researchLocalProductPrice } from '@/app/modules/marketplaces/services/local-product-price-research';
import { readPriceCatalog } from '@/app/modules/marketplaces/services/price-catalog';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { db, empresaId } = await authorizePriceConsultation(request, url.searchParams.get('empresaId'));
    const result = await readPriceCatalog(db, empresaId, url.searchParams.get('q') || '', Number(url.searchParams.get('page') || 1), url.searchParams.get('sort') || 'alpha', request.signal, url.searchParams.get('warehouseId') || '');
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json(), { db, empresaId, usuario } = await authorizePriceConsultation(request, body.empresaId);
    return NextResponse.json({ result: await consultLocalPrice(db, empresaId, usuario.id, body) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json(), { db, empresaId, usuario } = await authorizePriceConsultation(request, body.empresaId);
    let notice: string;
    let research: {status:string;message:string}|undefined;
    if (body.action === 'research') { research = await researchLocalProductPrice(db, empresaId, usuario.id, body, request.signal); notice = research.message; }
    else if (body.action === 'edit') { await editLocalReference(db, empresaId, usuario.id, body); notice = 'Referência do cadastro atualizada. Estoque e anúncios preservados.'; }
    else throw new MarketplaceError(400, 'invalid_action', 'Selecione a atualização do preço.');
    const result = await consultLocalPrice(db, empresaId, usuario.id, { productId: body.productId });
    return NextResponse.json({ result: result ? { ...result, notice } : null, ...(research ? {research} : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
