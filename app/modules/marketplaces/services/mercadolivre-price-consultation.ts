import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { identifyMercadoLivreCatalog } from './mercadolivre-catalog';
import type { SellerConnection } from './mercadolivre-management';
import { lookupProfileCatalogByEan } from './profile-catalog';
import { consultOpenAIWebPrices, type WebPriceOffer } from './openai-web-price-search';
import { selectReferencePriceCents } from './price-reference';
import { completeProductFacts } from './web-product-facts';
import { DEFAULT_PRICE_PERCENTAGES, suggestedPriceCents, type PricePercentages } from '../price-settings';
import { priceSearchDetails } from '../price-offer-identity';
import { productRegistrationName } from '../product-registration-name';
import type { PriceSearchControl } from './price-search-control';

export type PriceSuggestions = {
  market: number;
  minimum: number;
  medium: number;
  ideal: number;
};

export type PriceSampleSource = 'manual_reference' | 'google_shopping' | 'openai_web_search' | 'local_reference';

export type PriceConsultationResult = {
  status: 'found' | 'not_found' | 'choose';
  ean: string | null;
  query: string | null;
  product?: {
    id: string;
    name: string;
    description: string;
    image: string | null;
    pictures?: string[];
    attributes: Array<{ id: string; name: string; value: string }>;
    sources?:string[];
  };
  candidates?: Array<{ id: string; name: string; picture: string | null }>;
  prices?: PriceSuggestions;
  sample?: { count: number; minimum: number; maximum: number; source: PriceSampleSource; offers?: WebPriceOffer[] };
  pendingPriceTaskId?: string;
  historyId?: string;
  localProductId?: string;
  localProductRevision?: number;
  referenceStatus?: 'saved' | 'missing' | 'preserved';
  consultedAt?: string;
  notice?: string;
};

function priceInCents(value: unknown) {
  const number = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(number) && number > 0 && Math.abs(Math.round(number * 100) - number * 100) < 0.000001
    ? Math.round(number * 100)
    : null;
}

export function calculatePriceSuggestions(pricesInCents: readonly number[], percentages: PricePercentages = DEFAULT_PRICE_PERCENTAGES): PriceSuggestions {
  // Preços excepcionalmente altos costumam ser anúncios fora do mercado. A
  // referência comercial é formada por até oito ofertas válidas comprovadas,
  // inclusive quando a fonte externa trouxer mais resultados.
  const values = selectReferencePriceCents(pricesInCents);
  if (!values.length) throw new Error('Nenhum preço válido para calcular as sugestões.');
  const marketCents = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const suggestions = suggestedPriceCents(marketCents, percentages);
  if (!suggestions) throw new Error('Percentuais inválidos para calcular as sugestões.');
  return {
    market: marketCents / 100,
    minimum: suggestions.minimum / 100,
    medium: suggestions.medium / 100,
    ideal: suggestions.ideal / 100,
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
  percentages: PricePercentages = DEFAULT_PRICE_PERCENTAGES,
  control?: PriceSearchControl,
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
  const registrationName = product.id.startsWith('LOCAL:') ? product.name : productRegistrationName(product.name, product.attributes);
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
      name: registrationName,
      description: product.description || (registrationName !== product.name ? product.name : ''),
      image: product.pictures[0] || product.picture,
      pictures: product.pictures,
      attributes: product.attributes,
    },
  };
  if (manualCents != null) {
    const prices = calculatePriceSuggestions([manualCents], percentages);
    return {
      ...base,
      prices,
      sample: { count: 1, minimum: prices.market, maximum: prices.market, source: 'manual_reference' },
      notice: 'Registro histórico calculado a partir de um preço informado manualmente.',
    };
  }

  const lookup = await consultOpenAIWebPrices({ ean, productName: product.name, ...priceSearchDetails(product.attributes,product.name) }, control);
  const enriched={...base,ean:ean||lookup.product?.ean||null,product:completeProductFacts(base.product,lookup.product)};
  if (!lookup.sample) return {
    ...enriched,
    notice: 'Produto localizado, mas nenhuma oferta com preço e disponibilidade pôde ser confirmada na origem. Nenhum preço sem comprovação foi usado.',
  };
  const prices = calculatePriceSuggestions(lookup.sample.pricesInCents, percentages);
  return {
    ...enriched,
    prices,
    sample: { count: lookup.sample.count, minimum: lookup.sample.minimum, maximum: lookup.sample.maximum, source: 'openai_web_search', offers: lookup.sample.offers },
    ...(lookup.researchedAt ? { consultedAt: lookup.researchedAt } : {}),
    notice: lookup.fromCache ? 'Preços e fontes da pesquisa recente reaproveitados. Nenhuma nova consulta paga foi feita.' : `Referência calculada com ${lookup.sample.count} oferta(s) pesquisada(s) e suas fontes.`,
  };
}
