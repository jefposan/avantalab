import { physicalQuantity } from './local-product-model.ts';

export type InitialStockSource = { connectionId: string; listingId: string; accountName: string; quantity: number; checkedAt: string };
export type InitialStockRow = { productId: string; name: string; revision: number; sources: InitialStockSource[]; warning?: string };

/** Zero/inativo não inicializa nem zera o estoque local. Nunca soma contas. */
export function initialListingQuantity(item: Record<string, unknown>) {
  const quantity = physicalQuantity(item.available_quantity);
  if (item.status !== 'active' || quantity == null || quantity === 0
    || !Array.isArray(item.variations) || item.variations.length > 0
    || (Array.isArray(item.sub_status) && item.sub_status.includes('deleted'))) return null;
  return quantity;
}

export function stockSourceKey(source: InitialStockSource) { return `${source.connectionId}:${source.listingId}`; }

export function defaultInitialStockSelections(rows: InitialStockRow[]) {
  return Object.fromEntries(rows.map(row => [row.productId, row.sources.length === 1 && !row.warning ? stockSourceKey(row.sources[0]) : '']));
}
