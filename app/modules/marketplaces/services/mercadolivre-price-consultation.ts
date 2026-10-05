import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { identifyMercadoLivreCatalog } from './mercadolivre-catalog';
import { mlRequest, type SellerConnection } from './mercadolivre-management';
import { listingIdIsValid, objectValue } from './listing-model';

export type PriceSuggestions = {
  market: number;
  minimum: number;
  medium: number;
  ideal: number;
};

export type PriceConsultationResult = {
  status: 'found' | 'not_found' | 'choose';
  ean: string | null;
  query: string | null;
  product?: {
    id: string;
    name: string;
    description: string;
    image: string | null;
    attributes: Array<{ id: string; name: string; value: string }>;
  };
  candidates?: Array<{ id: string; name: string; picture: string | null }>;
  prices?: PriceSuggestions;
  sample?: { count: number; minimum: number; maximum: number; source: 'active_offers' | 'catalog_reference' };
  notice?: string;
};

const finitePrice = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
};

export function calculatePriceSuggestions(pricesInCents: readonly number[]): PriceSuggestions {
  const values = pricesInCents.filter((value) => Number.isSafeInteger(value) && value > 0);
  if (!values.length) throw new Error('Nenhum preço válido para calcular a média.');
  const marketCents = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const amount = (factor: number) => Math.round(marketCents * factor) / 100;
  return {
    market: marketCents / 100,
    minimum: amount(0.5),
    medium: amount(0.7),
    ideal: amount(0.9),
  };
}

function productReferencePrices(raw: Record<string, unknown>) {
  const values: number[] = [];
  const winner = objectValue(raw.buy_box_winner);
  const range = objectValue(raw.buy_box_winner_price_range);
  const minimum = objectValue(range.min);
  const maximum = objectValue(range.max);
  for (const value of [winner.price, minimum.price, maximum.price]) {
    const cents = finitePrice(value);
    if (cents != null) values.push(cents);
  }
  return [...new Set(values)];
}

async function activeOfferPrices(
  db: SupabaseClient,
  connection: SellerConnection,
  product: { id: string; name: string },
) {
  const search = objectValue(await mlRequest(
    db,
    connection,
    `/sites/MLB/search?${new URLSearchParams({ q: product.name, limit: '50' })}`,
  ));
  const rows = Array.isArray(search.results) ? search.results.map(objectValue) : [];
  const exact = rows.filter((item) => (
    item.catalog_product_id === product.id
    && item.currency_id === 'BRL'
    && item.condition !== 'used'
    && listingIdIsValid(item.id)
  )).slice(0, 20);

  const current = await Promise.all(exact.map(async (item) => {
    try {
      const salePrice = objectValue(await mlRequest(db, connection, `/items/${item.id}/sale_price?context=channel_marketplace`));
      return finitePrice(salePrice.amount);
    } catch {
      // Compatibilidade enquanto o campo price ainda coexistir na busca pública.
      return finitePrice(item.price);
    }
  }));

  return current.filter((value): value is number => value != null);
}

export async function consultMercadoLivrePrice(
  db: SupabaseClient,
  connection: SellerConnection,
  input: { ean?: unknown; query?: unknown; productId?: unknown },
): Promise<PriceConsultationResult> {
  const identification = await identifyMercadoLivreCatalog(db, connection, input);
  const ean = identification.ean || null;
  const query = identification.query || null;

  if (identification.status !== 'found' || !identification.product) {
    return {
      status: identification.status,
      ean,
      query,
      candidates: identification.candidates.map(({ id, name, picture }) => ({ id, name, picture })),
      notice: identification.notice,
    };
  }

  const product = identification.product;
  let source: 'active_offers' | 'catalog_reference' = 'active_offers';
  let values: number[] = [];
  try {
    values = await activeOfferPrices(db, connection, product);
  } catch {
    values = [];
  }
  if (!values.length) {
    source = 'catalog_reference';
    values = productReferencePrices(product.raw);
  }
  if (!values.length) {
    throw new MarketplaceError(409, 'price_unavailable', 'Produto localizado, mas o Mercado Livre não retornou preços comparáveis no momento.');
  }

  const prices = calculatePriceSuggestions(values);
  return {
    status: 'found',
    ean,
    query,
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.pictures[0] || product.picture,
      attributes: product.attributes,
    },
    prices,
    sample: {
      count: values.length,
      minimum: Math.min(...values) / 100,
      maximum: Math.max(...values) / 100,
      source,
    },
  };
}
