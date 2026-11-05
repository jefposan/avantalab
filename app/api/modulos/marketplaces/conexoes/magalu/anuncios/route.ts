import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { loadMagaluConnection, magaluRequest } from '@/app/modules/marketplaces/services/magalu-request';
import { magaluCatalogPresence } from '@/app/modules/marketplaces/magalu-catalog-presence';
import { objectValue } from '@/app/modules/marketplaces/services/listing-model';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { db, empresaId } = await authorizeMarketplace(request, params.get('empresaId'));
    const connection = await loadMagaluConnection(db, empresaId, params.get('connectionId'));
    const response = await magaluRequest(db, connection, '/seller/v1/portfolios/skus?_limit=1&_offset=0');
    let status: ReturnType<typeof magaluCatalogPresence>;
    try { status = magaluCatalogPresence(response); }
    catch {
      const body = objectValue(response);
      const meta = objectValue(body.meta);
      const page = objectValue(meta.page);
      const links = objectValue(meta.links);
      // Diagnóstico só da forma do JSON; nunca registrar SKU, token ou resposta bruta.
      console.warn('magalu_catalog_response_shape', {
        results: Array.isArray(body.results) ? 'array' : body.results === null ? 'null' : typeof body.results,
        resultsLength: Array.isArray(body.results) ? body.results.length : null,
        hasMeta: Object.hasOwn(body, 'meta'), hasPage: Object.hasOwn(meta, 'page'),
        offsetType: typeof page.offset, countType: typeof page.count, totalType: typeof page.total,
        hasNext: Object.hasOwn(links, 'next'), nextType: typeof links.next,
      });
      throw new MarketplaceError(503, 'magalu_catalog_response', 'O Magalu não confirmou a lista de anúncios. Tente consultar novamente.');
    }
    return NextResponse.json({ status, checkedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof MarketplaceError && error.status >= 500) console.warn('magalu_catalog_check_failed', error.code);
    return managementFailure(error);
  }
}
