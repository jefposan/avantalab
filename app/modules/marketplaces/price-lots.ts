import { marketplaceDateTime } from './date-format.ts';

export type PriceLot = {
  id: string; empresa_id: string; company_name: string; name: string; supplier: string;
  received_on: string; notes: string; purchase_cost_cents: number | null;
  status: 'open' | 'closed'; created_at: string; updated_at: string;
};
export type PriceLotItem = {
  id: string; lot_id: string; empresa_id: string; scanned_code: string; quantity: number;
  product_name: string | null; product_description: string | null; image_url: string | null;
  history_id: string | null; reference_source: string | null; researched_at: string | null;
  market_price_cents: number | null; minimum_price_cents: number | null;
  medium_price_cents: number | null; ideal_price_cents: number | null; created_at: string;
};
export type PriceLotDetail = { lot: PriceLot; items: PriceLotItem[]; canEdit: boolean };

export function lotTotals(items: readonly PriceLotItem[], cost: number | null) {
  let quantity = 0, pending = 0;
  const sales = { minimum: 0, medium: 0, ideal: 0 };
  for (const item of items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('Quantidade inválida no lote.');
    quantity += item.quantity;
    const values = [item.market_price_cents, item.minimum_price_cents, item.medium_price_cents, item.ideal_price_cents];
    if (values.some(value => value === null)) { pending += item.quantity; continue; }
    if (values.some(value => !Number.isSafeInteger(value) || Number(value) <= 0)) throw new Error('Preço inválido no lote.');
    sales.minimum += item.minimum_price_cents! * item.quantity;
    sales.medium += item.medium_price_cents! * item.quantity;
    sales.ideal += item.ideal_price_cents! * item.quantity;
  }
  if (![quantity, pending, ...Object.values(sales)].every(Number.isSafeInteger)) throw new Error('O lote ultrapassou o limite de cálculo.');
  const comparable = pending === 0 && quantity > 0 && cost !== null;
  return {
    quantity, pending, sales, difference: comparable ? {
      minimum: sales.minimum - cost!, medium: sales.medium - cost!, ideal: sales.ideal - cost!,
    } : null
  };
}

/** Moeda pt-BR sem arredondamento silencioso; vazio significa custo ainda não informado. */
export function parseLotCost(value: unknown): number | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value.trim())) throw new Error('Informe o custo em reais, por exemplo 1.250,00.');
  const cents = Math.round(Number(value.trim().replace(/\./g, '').replace(',', '.')) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 2_000_000_000) throw new Error('O custo do lote está fora do limite permitido.');
  return cents;
}

export const lotMoney = (cents: number | null) => cents === null ? 'Pendente' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const lotUnits = (quantity: number) => `${quantity} ${quantity === 1 ? 'unidade' : 'unidades'}`;
export const lotGenerationLabel = (date: Date) => marketplaceDateTime.format(date);
export const lotSource = (source: string | null) => !source ? 'Preço pendente' : source === 'local_reference' ? 'Referência cadastrada' : source === 'manual_reference' ? 'Referência manual' : 'Média pesquisada';
