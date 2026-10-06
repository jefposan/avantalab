import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { identifyMercadoLivreCatalog } from './mercadolivre-catalog';
import type { SellerConnection } from './mercadolivre-management';
import { lookupProfileCatalogByEan } from './profile-catalog';
import { consultGoogleShoppingPrices } from './dataforseo-google-shopping';
import { selectReferencePriceCents } from './price-reference';

export type PriceSuggestions = {
  market: number;
  minimum: number;
  medium: number;
  ideal: number;
};

export type PriceSampleSource = 'manual_reference' | 'google_shopping';

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
  sample?: { count: number; minimum: number; maximum: number; source: PriceSampleSource };
  pendingPriceTaskId?: string;
  historyId?: string;
  consultedAt?: string;
  notice?: string;
};

function priceInCents(value: unknown) {
  const number = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(number) && number > 0 && Math.abs(Math.round(number * 100) - number * 100) < 0.000001
    ? Math.round(number * 100)
    : null;
}

export function calculatePriceSuggestions(pricesInCents: readonly number[]): PriceSuggestions {
  // Preços excepcionalmente altos costumam ser anúncios fora do mercado. A
  // referência comercial é formada pelas até cinco menores ofertas válidas,
  // inclusive quando a fonte externa trouxer mais resultados.
  const values = selectReferencePriceCents(pricesInCents);
  if (!values.length) throw new Error('Nenhum preço válido para calcular as sugestões.');
  const marketCents = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const amount = (factor: number) => Math.round(marketCents * factor) / 100;
  return {
    market: marketCents / 100,
    minimum: amount(0.5),
    medium: amount(0.7),
    ideal: amount(0.9),
  };
}

/**
 * O PWA usa a conexão Mercado Livre apenas para identificar o produto no
 * catálogo isolado da empresa. A média vem da integração de pesquisa de preços
 * configurada somente no servidor; nenhum segredo ou token é enviado ao PWA.
 */
export async function consultMercadoLivrePrice(
  db: SupabaseClient,
  connection: SellerConnection,
  input: { ean?: unknown; query?: unknown; productId?: unknown; manualPrice?: unknown; pendingPriceTaskId?: string },
): Promise<PriceConsultationResult> {
  let identification = await identifyMercadoLivreCatalog(db, connection, input);

  // Um EAN pode não existir no catálogo público, mas estar cadastrado no perfil
  // da empresa. Mantemos essa identificação disponível para a busca assistida.
  if (identification.status === 'not_found' && identification.ean) {
    const profile = await lookupProfileCatalogByEan(db, connection.empresa_id, identification.ean, input.productId);
    if (profile.status !== 'not_found') {
      identification = {
        status: profile.status,
        ean: identification.ean,
        candidates: profile.candidates,
        product: profile.product ? { ...profile.product, raw: {} } : undefined,
        notice: profile.notice,
      };
    }
  }

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
  const manualCents = input.manualPrice === undefined ? null : priceInCents(input.manualPrice);
  if (input.manualPrice !== undefined && manualCents == null) {
    throw new MarketplaceError(400, 'invalid_manual_price', 'Informe um preço válido, com até duas casas decimais.');
  }

  const base = {
    status: 'found' as const,
    ean,
    query,
    product: {
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.pictures[0] || product.picture,
      attributes: product.attributes,
    },
  };
  if (manualCents != null) {
    const prices = calculatePriceSuggestions([manualCents]);
    return {
      ...base,
      prices,
      sample: { count: 1, minimum: prices.market, maximum: prices.market, source: 'manual_reference' },
      notice: 'Registro histórico calculado a partir de um preço informado manualmente.',
    };
  }

  const lookup = await consultGoogleShoppingPrices({ ean, productName: product.name }, input.pendingPriceTaskId);
  if (lookup.status === 'pending') return {
    ...base,
    pendingPriceTaskId: lookup.taskId,
    notice: 'Estamos comparando ofertas públicas. A consulta continuará automaticamente.',
  };
  if (!lookup.sample) return {
    ...base,
    notice: 'Produto localizado, mas não há preços comparáveis em reais no Google Shopping neste momento.',
  };
  const prices = calculatePriceSuggestions(lookup.sample.pricesInCents);
  return {
    ...base,
    prices,
    sample: { count: lookup.sample.count, minimum: lookup.sample.minimum, maximum: lookup.sample.maximum, source: 'google_shopping' },
    notice: `Referência calculada com ${lookup.sample.count} menor${lookup.sample.count === 1 ? '' : 'es'} oferta${lookup.sample.count === 1 ? '' : 's'} comparável${lookup.sample.count === 1 ? '' : 'is'} no Google Shopping.`,
  };
}
