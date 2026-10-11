import { NextResponse } from 'next/server';
import { authorizeMarketplace, managementFailure } from '@/app/modules/marketplaces/services/management-access';
import { loadConnection } from '@/app/modules/marketplaces/services/mercadolivre-management';
import { prepareMercadoLivreListingCopy } from '@/app/modules/marketplaces/services/mercadolivre-publication';
import { getLocalProduct, importLocalListing, productCommand } from '@/app/modules/marketplaces/services/local-products';
import { productFromPreparation } from '@/app/modules/marketplaces/services/local-product-model';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, usuario } = await authorizeMarketplace(request, body.empresaId, 'manage');
    const source = await loadConnection(db, empresaId, body.sourceConnectionId);
    const target = await loadConnection(db, empresaId, body.targetConnectionId);
    const response = await prepareMercadoLivreListingCopy(db, source, target, body.listingId);
    const imported = await importLocalListing(db, empresaId, usuario.id, source.id, body.listingId);
    const local = await getLocalProduct(db, empresaId, imported.product_id);
    if (response.result.product) await productCommand(db, empresaId, usuario.id, 'enrich', { ...productFromPreparation(response.form, response.result.product), product_id: local.id, revision: local.revision,
      catalog_product_id: ['profile_catalog', 'marketplace_listing', 'local_product'].includes(response.result.product.source || '') ? '' : response.result.product.id }, crypto.randomUUID());
    response.result.localProductId = local.id; response.form.localProductId = local.id;
    if (local.stock_quantity == null) response.result.warnings = [...(response.result.warnings || []), 'Confirme o estoque físico em Produtos e estoque antes de publicar. O saldo do anúncio original não foi somado.'];
    else response.form.stock = Math.min(response.form.stock, local.stock_quantity);
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
