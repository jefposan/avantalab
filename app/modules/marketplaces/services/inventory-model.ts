import { objectValue } from './listing-model.ts';

export type InventoryLine = { listingId: string; variationId: string; quantity: number; title: string };
export function inventoryLines(raw: unknown): InventoryLine[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length > 100) throw new Error('invalid_inventory_quantity');
  const lines = new Map<string, InventoryLine>();
  for (const value of raw) {
    const row = objectValue(value), item = objectValue(row.item);
    if (!/^MLB\d{6,20}$/.test(String(item.id)) || typeof row.quantity !== 'number' || !Number.isSafeInteger(row.quantity) || row.quantity < 1 || row.quantity > 99999) throw new Error('invalid_inventory_line');
    const variationId = item.variation_id == null ? '' : /^\d{1,24}$/.test(String(item.variation_id)) ? String(item.variation_id) : 'invalid';
    const listingId = String(item.id), key = `${listingId}:${variationId}`;
    const previous = lines.get(key);
    const quantity = (previous?.quantity || 0) + row.quantity;
    if (quantity > 99999) throw new Error('invalid_inventory_quantity');
    lines.set(key, { listingId, variationId, quantity, title: typeof item.title === 'string' ? item.title.slice(0, 500) : 'Produto' });
  }
  return [...lines.values()];
}
export function safeMarketplaceLink(provider: string, value: unknown): string | null {
  if (provider === 'magalu') return value === 'https://seller.magalu.com' || value === 'https://seller.magalu.com/' ? value : null;
  if (provider !== 'mercado_livre' || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && ['produto.mercadolivre.com.br', 'www.mercadolivre.com.br'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
export function listingStockPolicy(item: Record<string, unknown>, sellerTags: unknown, desired: number, allowIncrease: boolean) {
  if (!Number.isSafeInteger(desired) || desired < 0 || desired > 99999) return 'invalid_quantity';
  if (!Array.isArray(item.variations) || item.variations.length) return 'variations';
  if (!Array.isArray(sellerTags) || sellerTags.includes('warehouse_management') || sellerTags.includes('multiwarehouse') || Array.isArray(item.stock_locations) && item.stock_locations.length) return 'warehouse';
  if (objectValue(item.shipping).logistic_type === 'fulfillment') return 'fulfillment';
  if (Array.isArray(item.tags) && item.tags.includes('bundle') || objectValue(item.bundle).type === 'kit') return 'virtual_kit';
  if (!Array.isArray(item.sub_status)) return 'incomplete_listing';
  if (item.status !== 'active' && !(item.status === 'paused' && item.sub_status.includes('out_of_stock') && !item.sub_status.some(s => ['closed', 'deleted', 'suspended', 'held'].includes(String(s))))) return 'inactive';
  if (typeof item.available_quantity !== 'number' || !Number.isSafeInteger(item.available_quantity) || item.available_quantity < 0) return 'incomplete_listing';
  if (item.available_quantity === desired) return 'equal';
  // Uma venda ainda não recebida pode ter reduzido o anúncio; não repor unidades por engano.
  if (item.available_quantity < desired && !allowIncrease) return 'lower_remote_stock';
  return 'write';
}
