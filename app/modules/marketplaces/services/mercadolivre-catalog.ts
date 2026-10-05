import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { mlRequest, type SellerConnection } from './mercadolivre-management';
import {
  catalogAttributes,
  catalogCandidate,
  catalogPictures,
  safeText,
  validEan,
  type CatalogCandidate,
} from './catalog-publication';
import { objectValue } from './listing-model';

export type CatalogProductDetail = CatalogCandidate & {
  attributes: Array<{ id: string; name: string; value: string }>;
  pictures: string[];
  description: string;
  raw: Record<string, unknown>;
};

export type CatalogIdentification = {
  status: 'found' | 'not_found' | 'choose';
  ean?: string;
  query?: string;
  candidates: CatalogCandidate[];
  product?: CatalogProductDetail;
  notice?: string;
};

function searchTerm(input: { ean?: unknown; query?: unknown }) {
  if (input.ean != null && String(input.ean).trim()) {
    const ean = validEan(input.ean);
    if (!ean) throw new MarketplaceError(400, 'invalid_ean', 'Informe um EAN/GTIN válido com dígito verificador.');
    return { ean, query: '', params: { product_identifier: ean } };
  }

  const query = safeText(input.query, 120).replace(/\s+/g, ' ');
  if (query.length < 3) throw new MarketplaceError(400, 'invalid_query', 'Digite pelo menos 3 caracteres para pesquisar o produto.');
  return { ean: '', query, params: { q: query } };
}

export async function identifyMercadoLivreCatalog(
  db: SupabaseClient,
  connection: SellerConnection,
  input: { ean?: unknown; query?: unknown; productId?: unknown },
): Promise<CatalogIdentification> {
  if (!process.env.MARKETPLACE_SECRETS_KEY) {
    throw new MarketplaceError(503, 'integration_not_configured', 'A conexão do Mercado Livre não está configurada neste ambiente.');
  }

  const term = searchTerm(input);
  const params = new URLSearchParams({ site_id: 'MLB', status: 'active', limit: '20' });
  if (term.ean) params.set('product_identifier', term.ean);
  else params.set('q', term.query);
  const search = objectValue(await mlRequest(db, connection, `/products/search?${params}`));
  if (!Array.isArray(search.results)) {
    throw new MarketplaceError(503, 'catalog_unavailable', 'O catálogo não retornou uma lista válida. Tente novamente.');
  }

  const candidates = search.results
    .map(catalogCandidate)
    .filter((candidate): candidate is CatalogCandidate => Boolean(candidate));

  if (!candidates.length) {
    return {
      status: 'not_found',
      ...(term.ean ? { ean: term.ean } : { query: term.query }),
      candidates: [],
      notice: term.ean
        ? 'EAN não localizado no catálogo ativo do Mercado Livre.'
        : 'Nenhum produto foi localizado com essa pesquisa.',
    };
  }

  const selectedId = safeText(input.productId, 30);
  const selected = selectedId
    ? candidates.find((candidate) => candidate.id === selectedId)
    : candidates.length === 1
      ? candidates[0]
      : null;

  if (!selected) {
    return {
      status: 'choose',
      ...(term.ean ? { ean: term.ean } : { query: term.query }),
      candidates,
      notice: 'Mais de um produto foi localizado. Escolha a ficha que corresponde exatamente ao item consultado.',
    };
  }

  const detail = objectValue(await mlRequest(db, connection, `/products/${selected.id}`));
  const product = catalogCandidate(detail);
  if (!product || product.id !== selected.id || product.domainId !== selected.domainId) {
    throw new MarketplaceError(409, 'catalog_changed', 'A ficha do produto mudou. Faça a consulta novamente.');
  }

  return {
    status: 'found',
    ...(term.ean ? { ean: term.ean } : { query: term.query }),
    candidates,
    product: {
      ...product,
      attributes: catalogAttributes(detail.attributes),
      pictures: catalogPictures(detail.pictures),
      description: safeText(detail.short_description, 5000)
        || safeText(objectValue(detail.short_description).content, 5000),
      raw: detail,
    },
  };
}
