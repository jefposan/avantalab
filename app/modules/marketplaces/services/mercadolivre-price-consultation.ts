import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { identifyMercadoLivreCatalog } from './mercadolivre-catalog';
import type { SellerConnection } from './mercadolivre-management';
import { lookupProfileCatalogByEan } from './profile-catalog';
import type {WebPriceOffer} from './openai-web-price-search';
import {consultMercadoLivreMarketPrices} from './mercadolivre-market-prices';
import {emptyMarketResearch,type MarketPriceResearch} from '../market-price-research';
import { selectReferencePriceCents } from './price-reference';
import { DEFAULT_PRICE_PERCENTAGES, suggestedPriceCents, type PricePercentages } from '../price-settings';
import { productRegistrationName } from '../product-registration-name';
import type { PriceSearchControl } from './price-search-control';

export type PriceSuggestions = {
  market: number;
  minimum: number;
  medium: number;
  ideal: number;
};

export type PriceSampleSource = 'manual_reference' | 'google_shopping' | 'openai_web_search' | 'local_reference' | 'mercadolivre_catalog';

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
  marketResearch?: MarketPriceResearch;
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
 * O PWA identifica o produto e consulta as ofertas do catálogo no servidor.
 * Sem IA ou fallback pago; nenhum segredo ou token é enviado ao PWA.
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

  let evidence:MarketPriceResearch;
  try { evidence=await consultMercadoLivreMarketPrices(db,connection,{ean,productName:product.name,attributes:product.attributes,identification},control?.signal); }
  catch(error){control?.signal?.throwIfAborted();evidence=emptyMarketResearch(product.name,'unavailable',error instanceof MarketplaceError?error.message:'Não foi possível consultar as ofertas do Mercado Livre.');}
  if(evidence.status!=='ready'||evidence.mean==null)return {...base,marketResearch:evidence,notice:evidence.message};
  const suggestions=suggestedPriceCents(Math.round(evidence.mean*100),percentages)!;
  return {...base,prices:{market:evidence.mean,minimum:suggestions.minimum/100,medium:suggestions.medium/100,ideal:suggestions.ideal/100},sample:{count:evidence.count,minimum:evidence.minimum!,maximum:evidence.maximum!,source:'mercadolivre_catalog',offers:evidence.offers},marketResearch:evidence,consultedAt:evidence.checkedAt,notice:'Referência obtida diretamente do Mercado Livre.'};
}
