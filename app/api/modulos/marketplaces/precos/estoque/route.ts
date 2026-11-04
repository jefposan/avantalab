import { NextResponse } from 'next/server';
import { authorizePriceConsultation } from '@/app/modules/marketplaces/services/price-access';
import { authorizeMarketplace, managementFailure, MarketplaceError } from '@/app/modules/marketplaces/services/management-access';
import { priceStockProduct, setConsultedProductStock, stockSummary } from '@/app/modules/marketplaces/services/price-product-stock';
import { warehouseContext, warehouseCommand } from '@/app/modules/marketplaces/services/warehouses';
import {stockDivergence,listingStockSyncTerminated} from '@/app/modules/marketplaces/stock-reconciliation';
import { readProductInternalNotes } from '@/app/modules/marketplaces/services/product-internal-notes';
import {enqueueConfirmedZero} from '@/app/modules/marketplaces/services/zero-stock';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db, empresaId, perfil, usuario, stockPermission } = await authorizePriceConsultation(request, body.empresaId);
    const canManage = stockPermission || ['gestor_master', 'administrador', 'operador_completo'].includes(perfil);
    const canDeleteProduct=['gestor_master','administrador','operador_completo'].includes(perfil);
    if (body.action === 'context') {
      const product=await priceStockProduct(db,empresaId,body);
      let syncHint='',syncLinkedCount:number|undefined,importStockReview=Boolean(product.listing_stock_review_at);
      try{const links=await db.from('marketplace_product_links').select('provider,reported_stock,status').eq('empresa_id',empresaId).eq('product_id',product.id).limit(501);if(links.error)throw links.error;syncLinkedCount=links.data?.length||0;importStockReview=importStockReview&&Boolean(links.data?.some(link=>!listingStockSyncTerminated(link.status)));syncHint=stockDivergence(product.stock_quantity,links.data||[]);}catch{syncHint='Conferir saldos';}
      return NextResponse.json({stock:{...stockSummary(product,canManage),importStockReview,canDeleteProduct,...await warehouseContext(db,empresaId,product.id),...(await readProductInternalNotes(db,empresaId,[product.id])).get(product.id),syncHint,syncLinkedCount}},{headers:{'Cache-Control':'no-store'}});
    }
    if (!['set','add','transfer'].includes(body.action)) throw new MarketplaceError(400, 'invalid_stock_action', 'Operação de estoque inválida.');
    // A autorização dedicada concede somente confirmação de saldo; não concede Gestão ou outros comandos.
    const access = stockPermission ? { db, usuario } : await authorizeMarketplace(request, empresaId, 'manage');
    if(body.warehouseId !== undefined || body.action!=='set') {
      const product=await priceStockProduct(access.db,empresaId,body);
      await warehouseCommand(access.db,empresaId,access.usuario.id,{...body,productId:product.id});
      const latest=await priceStockProduct(access.db,empresaId,{productId:product.id});
      const context=await warehouseContext(access.db,empresaId,product.id);
      if(body.action==='set'&&body.quantity===0&&context.warehouses?.some(w=>w.id===body.warehouseId&&w.is_online))await enqueueConfirmedZero(access.db,empresaId,latest);
      return NextResponse.json({stock:{...stockSummary(latest,true),canDeleteProduct,...context,...(await readProductInternalNotes(access.db,empresaId,[product.id])).get(product.id)}},{headers:{'Cache-Control':'no-store'}});
    }
    return NextResponse.json({ stock: {...await setConsultedProductStock(access.db, empresaId, access.usuario.id, body),canDeleteProduct} }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return managementFailure(error); }
}
