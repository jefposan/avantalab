import { objectValue } from './services/listing-model.ts';
import { isValidEan } from './services/ean.ts';

export type SaleItem = { title: string; quantity: number; unitPrice: number | null; ean?: string | null; listingId?: string; variationId?: string; eanUnavailable?: boolean };
export function saleItemEan(value: unknown): string | null {
  const code = typeof value === 'string' ? value.trim() : '';
  return /^\d{8,14}$/.test(code) && isValidEan(code) ? code : null;
}
/** Recupera referências antigas só quando todas as linhas do próprio pedido coincidem. */
export function normalizedSaleItems(raw: unknown, inventory: unknown): SaleItem[] {
  const rows = (Array.isArray(raw) ? raw : []).slice(0,100).map(objectValue);
  const lines = (Array.isArray(inventory) ? inventory : []).map(objectValue);
  const aligned = rows.length === lines.length && rows.every((row,i) => row.title === lines[i].title && row.quantity === lines[i].quantity);
  return rows.map((row,i) => {
    const reference = aligned ? lines[i] : {};
    const listingId = typeof row.listingId === 'string' ? row.listingId : reference.listingId;
    const variationId = row.variationId ?? reference.variationId;
    return { title: typeof row.title === 'string' && row.title ? row.title.slice(0,500) : 'Produto',
      quantity: typeof row.quantity === 'number' && Number.isFinite(row.quantity) ? Math.max(1,Math.floor(row.quantity)) : 1,
      unitPrice: typeof row.unitPrice === 'number' && Number.isFinite(row.unitPrice) && row.unitPrice >= 0 ? row.unitPrice : null,
      ean: saleItemEan(row.ean),
      ...(typeof listingId === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(listingId) ? { listingId } : {}),
      ...(variationId != null ? { variationId: String(variationId) } : {}),
    };
  });
}
