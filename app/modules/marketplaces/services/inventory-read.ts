import 'server-only';
import { MarketplaceError } from './management-access';

export type InventoryRow = Record<string, unknown>;
/** Paginação completa: nunca interpreta truncamento/erro como ausência de pendência. */
export async function inventoryRows(read: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<InventoryRow[]> {
  const rows: InventoryRow[] = [];
  for (let from = 0; from < 20_000; from += 500) {
    const result = await read(from, from + 499);
    if (result.error || !Array.isArray(result.data) || result.data.some(row=>!row || typeof row!=='object' || Array.isArray(row))) throw new MarketplaceError(503, 'inventory_database', 'Não foi possível conferir as pendências de estoque.');
    rows.push(...result.data as InventoryRow[]);
    if (result.data.length < 500) return rows;
  }
  throw new MarketplaceError(503, 'inventory_database', 'A conferência de pendências excedeu o limite. Tente novamente.');
}
