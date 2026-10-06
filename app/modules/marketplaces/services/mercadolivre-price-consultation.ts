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

function titleMatchesProduct(title: unknown, productName?: string) {
  if (!productName) return true;
  const words = (value: unknown) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
  const expected = [...new Set(words(productName))];
  const found = new Set(words(title));
  if (!expected.length) return false;
  const matched = expected.filter((word) => found.has(word)).length;
  // Título de vitrine não é padronizado como a ficha: 75% dos termos da
  // variante escolhida preservam precisão sem descartar anúncio público por
  // diferenças de pontuação, ordem ou "GB"/"Gb".
  return matched >= Math.max(2, Math.ceil(expected.length * 0.75));
}

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

function isRateLimitFailure(error: unknown) {
  return error instanceof MarketplaceError
    && (error.code === 'provider_429' || error.status === 429);
}

function winningOfferPrice(raw: Record<string, unknown>) {
  const winner = objectValue(raw.buy_box_winner);
  return finitePrice(winner.price);
}

function winningOfferRangePrices(raw: Record<string, unknown>) {
  const range = objectValue(raw.buy_box_winner_price_range);
  const values = [finitePrice(objectValue(range.min).price), finitePrice(objectValue(range.max).price)]
    .filter((price): price is number => price != null);
  return [...new Set(values)];
}

/**
 * A busca é a vitrine pública de itens do Mercado Livre. Atualmente esse
 * recurso exige o bearer da integração para ser acessado por servidor; o token
 * autoriza somente a consulta, não muda a origem dos anúncios ou dos preços.
 */
async function consumerListingPrices(
  db: SupabaseClient,
  connection: SellerConnection,
  query: string,
  productName?: string,
) {
  const search = objectValue(await mlRequest(
    db,
    connection,
    `/sites/MLB/search?${new URLSearchParams({ q: query, limit: '50' })}`,
  ));
  const results = Array.isArray(search.results) ? search.results.map(objectValue) : [];
  return results
    // O EAN ou título exato é pesquisado na própria vitrine. Não exigimos que o
    // card exponha GTIN nos atributos: em várias categorias ele não aparece,
    // embora o anúncio seja visível ao consumidor.
    .filter((item) => item.currency_id === 'BRL' && item.condition !== 'used' && item.status !== 'closed'
      && titleMatchesProduct(item.title, productName))
    .map((item) => finitePrice(item.price))
    .filter((price): price is number => price != null);
}

async function productReferencePrices(
  db: SupabaseClient,
  connection: SellerConnection,
  raw: Record<string, unknown>,
) {
  const winner = objectValue(raw.buy_box_winner);
  const priceInCatalog = winningOfferPrice(raw);
  if (priceInCatalog != null) return [priceInCatalog];

  // Em algumas fichas a buy box não carrega price. O item vencedor continua
  // expondo o preço público do anúncio; esta leitura não usa a cotação líquida
  // /sale_price, que depende de uma permissão funcional opcional da conta.
  if (listingIdIsValid(winner.item_id)) {
    try {
      const item = objectValue(await mlRequest(
        db,
        connection,
        `/items/${winner.item_id}`,
      ));
      const cents = finitePrice(item.price);
      if (cents != null) return [cents];
    } catch (error) {
      if (isRateLimitFailure(error)) throw error;
      // Uma restrição pontual do item não invalida a conexão e não deve virar
      // erro de permissão para quem está consultando preço no PWA.
    }
  }
  // A ficha pública pode expor a faixa da oferta vencedora, mesmo quando a
  // vitrine de itens não autoriza detalhar as ofertas individualmente.
  return winningOfferRangePrices(raw);
}

async function activeOfferPrices(
  db: SupabaseClient,
  connection: SellerConnection,
  product: { id: string; name: string },
  ean: string | null,
) {
  const terms = [product.name, ...(ean ? [ean] : [])];
  const searches = await Promise.all(terms.map(async (term) => {
    const search = objectValue(await mlRequest(
      db,
      connection,
      `/sites/MLB/search?${new URLSearchParams({ q: term, limit: '50' })}`,
    ));
    return (Array.isArray(search.results) ? search.results.map(objectValue) : []).map((item) => ({ item, searchedByEan: term === ean }));
  }));
  const unique = new Map<string, { item: Record<string, unknown>; searchedByEan: boolean }>();
  for (const row of searches.flat()) {
    if (!listingIdIsValid(row.item.id)) continue;
    const current = unique.get(row.item.id);
    unique.set(row.item.id, { item: row.item, searchedByEan: Boolean(current?.searchedByEan || row.searchedByEan) });
  }

  const isPublicOffer = (item: Record<string, unknown>) => item.currency_id === 'BRL' && item.condition !== 'used' && item.status !== 'closed';
  const attributeContainsEan = (item: Record<string, unknown>) => {
    if (!ean) return false;
    const attributes = Array.isArray(item.attributes) ? item.attributes.map(objectValue) : [];
    return attributes.some((attribute) => {
      if (!['GTIN', 'EAN', 'UPC', 'PRODUCT_IDENTIFIER'].includes(String(attribute.id).toUpperCase())) return false;
      const values = [attribute.value_name, attribute.value_id, objectValue(attribute.value_struct).number,
        ...(Array.isArray(attribute.values) ? attribute.values.map(objectValue).flatMap((value) => [value.name, value.id]) : [])];
      return values.some((value) => String(value || '').replace(/\D/g, '') === ean);
    });
  };

  const known = [...unique.values()].filter(({ item }) => isPublicOffer(item) && (item.catalog_product_id === product.id || attributeContainsEan(item)));
  const unchecked = [...unique.values()]
    .filter(({ item, searchedByEan }) => searchedByEan && isPublicOffer(item) && item.catalog_product_id !== product.id && !attributeContainsEan(item))
    .slice(0, 20);
  const checked: Record<string, unknown>[] = [];
  if (unchecked.length) {
    const bulk = await mlRequest(db, connection, `/items/bulk?ids=${unchecked.map(({ item }) => item.id).join(',')}`);
    if (Array.isArray(bulk)) checked.push(...bulk.map((entry) => objectValue(objectValue(entry).body)));
  }

  return [...known.map(({ item }) => item), ...checked.filter((item) => isPublicOffer(item) && attributeContainsEan(item))]
    .map((item) => finitePrice(item.price)).filter((price): price is number => price != null);
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
  // Prioridade: a vitrine pública de itens. A API hoje exige bearer, então
  // reutilizamos a conexão apenas para autorizar a chamada pública. Para EAN,
  // tentamos o próprio código e, se a vitrine não o indexar, o título exato da
  // ficha escolhida — ainda sem depender dos anúncios da conta conectada.
  const consumerTerms = ean
    ? [{ term: ean }, { term: product.name, catalogProductId: product.id }]
    : [{ term: product.name, catalogProductId: product.id }];
  try {
    for (const { term, catalogProductId } of consumerTerms) {
      values = await consumerListingPrices(db, connection, term, catalogProductId ? product.name : undefined);
      if (values.length) break;
    }
    if (!values.length) values = await activeOfferPrices(db, connection, product, ean);
  } catch (error) {
    if (isRateLimitFailure(error)) throw error;
    // A busca pública acima continua sendo válida quando a busca auxiliar por
    // catálogo não estiver disponível para aquela conta/categoria.
  }
  if (!values.length) {
    source = 'catalog_reference';
    values = await productReferencePrices(db, connection, product.raw);
  }
  if (!values.length) {
    throw new MarketplaceError(409, 'price_unavailable', 'Produto localizado, mas não há ofertas públicas comparáveis no Mercado Livre no momento.');
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
