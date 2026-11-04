import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { recoverLocalProductPictures } from '@/app/modules/marketplaces/services/local-products';
import { uuidIsValid } from '@/app/modules/marketplaces/services/listing-model';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    if (body.cursor != null && !uuidIsValid(body.cursor)) throw new MarketplaceError(400, 'invalid_cursor', 'Atualize a lista antes de recuperar as fotos.');
    let query = db.from('marketplace_products').select('id').eq('empresa_id', empresaId).is('archived_at', null).eq('pictures', '[]').order('id').limit(5);
    if (body.cursor) query = query.gt('id', body.cursor);
    const { data, error } = await query;
    if (error) throw new MarketplaceError(503, 'photos_database', 'Não foi possível consultar os cadastros sem fotos.');
    const totals = { recovered: 0, preserved: 0, no_photos: 0, unavailable: 0 };
    for (const product of data || []) {
      const result = await recoverLocalProductPictures(db, empresaId, usuario.id, product.id);
      totals[result.status]++;
    }
    return NextResponse.json({ ...totals, nextCursor: data?.length === 5 ? data.at(-1)!.id : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
