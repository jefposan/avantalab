import { NextResponse } from 'next/server';
import { managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { authorizePriceLots, lotId, lotMetadata, readPriceLot } from '@/app/modules/marketplaces/services/price-lots';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId, canEdit } = await authorizePriceLots(request, params.get('empresaId'));
    if (params.get('id')) return NextResponse.json({ ...await readPriceLot(db, empresaId, lotId(params.get('id'))), canEdit }, { headers });
    const offset = Number(params.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new MarketplaceError(400, 'invalid_offset', 'Página inválida.');
    const { data, error } = await db.from('marketplace_price_lots').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).order('id').range(offset, offset + 49);
    if (error) throw new MarketplaceError(503, 'lots_unavailable', 'Não foi possível carregar os lotes. Verifique se a atualização dos lotes foi instalada.');
    return NextResponse.json({ lots: data || [], canEdit, hasMore: data?.length === 50 }, { headers });
  } catch (error) { return managementFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario, canEdit } = await authorizePriceLots(request, body.empresaId, true);
    const id = lotId(body.id);
    const metadata = lotMetadata(body);
    const company = await db.from('empresas').select('nome').eq('id', empresaId).single();
    if (company.error || !company.data) throw new MarketplaceError(503, 'company_unavailable', 'Não foi possível carregar a empresa do lote.');
    const { error } = await db.from('marketplace_price_lots').upsert({ id, empresa_id: empresaId, created_by: usuario.id, company_name: company.data.nome, ...metadata }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new MarketplaceError(503, 'lots_unavailable', 'Não foi possível salvar o lote. Tente novamente; os dados preenchidos serão mantidos.');
    return NextResponse.json({ ...await readPriceLot(db, empresaId, id), canEdit }, { status: 201, headers });
  } catch (error) { return managementFailure(error); }
}
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, canEdit } = await authorizePriceLots(request, body.empresaId, true);
    const id = lotId(body.id);
    let data: Record<string, unknown>;
    if (body.action === 'metadata') data = lotMetadata(body);
    else if (body.action === 'status' && ['open', 'closed'].includes(body.status)) data = { status: body.status };
    else if (['capture', 'resolve', 'quantity', 'remove'].includes(body.action)) {
      data = { item_id: lotId(body.itemId) };
      if (body.action === 'capture') {
        if (typeof body.scannedCode !== 'string' || !body.scannedCode.trim() || body.scannedCode.length > 180) throw new MarketplaceError(400, 'invalid_code', 'Código de leitura inválido.');
        data.scanned_code = body.scannedCode.trim();
      }
      if (body.action === 'resolve') data.history_id = lotId(body.historyId);
      if (body.action === 'quantity') {
        if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 100000) throw new MarketplaceError(400, 'invalid_quantity', 'Informe uma quantidade inteira entre 1 e 100.000.');
        data.quantity = body.quantity;
      }
    } else throw new MarketplaceError(400, 'invalid_action', 'Ação de lote inválida.');
    const { error } = await db.rpc('marketplace_price_lot_mutate', { p_empresa_id: empresaId, p_lot_id: id, p_action: body.action, p_data: data });
    if (error) throw new MarketplaceError(error.code === 'P0002' ? 404 : error.code === 'P0001' ? 409 : 503, 'lot_update_failed', error.code?.startsWith('P000') ? error.message : 'Não foi possível salvar a alteração do lote. Tente novamente.');
    return NextResponse.json({ ...await readPriceLot(db, empresaId, id), canEdit }, { headers });
  } catch (error) { return managementFailure(error); }
}
