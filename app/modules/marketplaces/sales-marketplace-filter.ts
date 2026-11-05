import type { MarketplaceSale } from './services/mercadolivre-sales';

export type SalesMarketplace = 'mercado_livre' | 'magalu' | `warehouse:${string}`;
export type SalesView = 'online' | 'direct';

/** Canal da venda, não o estoque: uma venda manual do Online continua direta. */
export function salesByView<T extends Pick<MarketplaceSale, 'provider' | 'directSale'>>(sales: T[], view: SalesView): T[] {
  return sales.filter(sale => view === 'direct' ? sale.provider === 'direct' : sale.provider !== 'direct');
}

export const SALES_MARKETPLACES: ReadonlyArray<{ value: SalesMarketplace; label: string }> = [
  { value: 'mercado_livre', label: 'Mercado Livre' },
  { value: 'magalu', label: 'Magalu' },
];

export function saleMarketplace(sale: Pick<MarketplaceSale, 'provider' | 'directSale'>): SalesMarketplace {
  if(sale.provider==='direct')return `warehouse:${sale.directSale?.warehouseId || 'unknown'}`;
  return sale.provider === 'magalu' ? 'magalu' : 'mercado_livre';
}

export function salesByMarketplaces<T extends Pick<MarketplaceSale, 'provider' | 'directSale'>>(sales: T[], selected: SalesMarketplace[]): T[] {
  return selected.length ? sales.filter(sale => selected.includes(saleMarketplace(sale))) : sales;
}

