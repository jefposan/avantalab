import { NextResponse } from 'next/server';
import { normalizarTexto } from '@/app/lib/formatters';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    const connectionId = params.get('connectionId');
    if (!uuidIsValid(connectionId)) throw new MarketplaceError(400, 'select_account', 'Selecione uma conta.');
    const page = Math.max(1, Math.min(10000, Number(params.get('page')) || 1));
    let query = db.from('marketplace_listings').select('snapshot,status', { count: 'exact' }).eq('empresa_id', empresaId).eq('connection_id', connectionId);
    const status = params.get('status');
    if (['active', 'paused', 'closed', 'under_review', 'inactive', 'deleted'].includes(status || '')) query = query.eq('status', status);
    const search = normalizarTexto((params.get('q') || '').slice(0, 120)).replace(/[%_\\]/g, '');
    if (search) query = query.ilike('search_text', `%${search}%`);
    const { data, error, count } = await query.order('title').order('provider_listing_id').range((page - 1) * 25, page * 25 - 1);
    if (error) throw error;
    return NextResponse.json({ listings: data || [], total: count || 0, page }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
