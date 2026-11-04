import type { InventoryNotice } from './live-feed';

export type NoticeTarget = { key: string; productId?: string; listingId?: string; connectionId?: string; orderId?: string; provider: string; panel: 'stock' | 'listing' | 'sale'; origin?: 'announced' };
/** Identificadores exatos; nunca escolhe um produto por título ou pela primeira linha. */
export function inventoryNoticeTarget(notice: InventoryNotice): NoticeTarget | null {
  const base = { key: notice.id, provider: notice.provider, connectionId: notice.connectionId || undefined };
  if (notice.productId && (notice.source === 'stock' || ['stock_not_confirmed','insufficient_stock','baseline_reconciliation','sale_reconciliation','stock_changed'].includes(notice.code))) return { ...base, panel: 'stock', productId: notice.productId };
  if (['product_not_linked','variation_not_linked'].includes(notice.code) && notice.listingId && notice.connectionId) return { ...base, panel:'listing', listingId:notice.listingId };
  if (notice.orderId && notice.connectionId) return { ...base, panel: 'sale', orderId: notice.orderId };
  if (notice.listingId && notice.connectionId) return { ...base, panel: 'listing', listingId: notice.listingId };
  if (notice.productId) return { ...base, panel: 'stock', productId: notice.productId };
  return null;
}
