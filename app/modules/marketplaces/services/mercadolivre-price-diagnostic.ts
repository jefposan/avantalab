import 'server-only';
import { MarketplaceError } from './management-access';
import { validEan } from './catalog-publication';

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown, limit = 160) => typeof value === 'string' ? value.slice(0, limit) : '';
const positive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
const catalogId = (value: unknown) => typeof value === 'string' && /^MLB\d{3,20}$/.test(value) ? value : null;

export function priceDiagnosticInput(input: RecordValue) {
  const ean = input.ean ? validEan(input.ean) : '';
  const query = text(input.query, 120).trim();
  if (input.ean && !ean || !ean && query.length < 3 || input.catalogId && !catalogId(input.catalogId)) {
    throw new MarketplaceError(400, 'invalid_diagnostic_input', 'Informe um EAN válido ou nome/modelo com pelo menos 3 caracteres. O catálogo opcional deve ter um ID MLB válido.');
  }
  return { ean: ean || '', query, catalogId: catalogId(input.catalogId) };
}

/** Apenas GETs definidos pelo diagnóstico. Nunca recebe URL ou método do cliente. */
export async function diagnoseMercadoLivrePrices(input: ReturnType<typeof priceDiagnosticInput>, read: (path: string) => Promise<unknown>) {
  const probes: Array<{ operation: string; path: string; status: number; code?: string; elapsedMs: number }> = [];
  async function probe(operation: string, path: string) {
    const started = Date.now();
    try {
      const data = record(await read(path));
      probes.push({ operation, path, status: 200, elapsedMs: Date.now() - started });
      return data;
    } catch (error) {
      const known = error instanceof MarketplaceError;
      probes.push({ operation, path, status: known ? (/^provider_\d{3}$/.test(error.code) ? Number(error.code.slice(-3)) : error.status) : 503, code: known && /^(provider_\d{3}|reconnect|refresh_busy|database|provider_unavailable|invalid_response)$/.test(error.code) ? error.code : 'diagnostic_unavailable', elapsedMs: Date.now() - started });
      return null;
    }
  }
  const params = new URLSearchParams({ site_id: 'MLB', status: 'active', limit: '5', ...(input.ean ? { product_identifier: input.ean } : { q: input.query }) });
  const [identity, search, listings] = await Promise.all([
    probe('authentication', '/users/me'),
    probe('catalog_search', `/products/search?${params}`),
    probe('listing_search', `/sites/MLB/search?${new URLSearchParams({ q: input.query || input.ean, limit: '20' })}`),
  ]);
  const candidates = (Array.isArray(search?.results) ? search.results : []).map(record).filter(item => catalogId(item.id)).slice(0, 2).map(item => ({ id: String(item.id), name: text(item.name) }));
  const ids = [...new Set([...(input.catalogId ? [input.catalogId] : []), ...candidates.map(item => item.id)])].slice(0, 2);
  function sample(data: RecordValue | null) {
    const offers = (Array.isArray(data?.results) ? data.results : []).slice(0, 20).map(record).map(item => ({
      id: text(item.item_id || item.id, 32), title: text(item.title), price: positive(item.price), currency: text(item.currency_id, 8),
      condition: text(item.condition, 24), status: text(item.status, 24),
      available: typeof item.available_quantity === 'number' ? item.available_quantity : null,
      sellerId: typeof item.seller_id === 'number' ? item.seller_id : null,
    }));
    const values = offers.filter(item => item.currency === 'BRL' && item.price !== null).map(item => Math.round(item.price! * 100));
    return { responseFields: data ? Object.keys(data).filter(key => /^(results|items|paging|pagination|total)$/.test(key)) : [], totalReported: typeof record(data?.paging).total === 'number' ? record(data?.paging).total : null, offers,
      priceCount: values.length, sampleMean: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) / 100 : null,
      identityValidated: false, saved: false };
  }
  const catalogs = await Promise.all(ids.map(async id => {
    const [detail, items] = await Promise.all([probe('catalog_detail', `/products/${id}`), probe('catalog_offers', `/products/${id}/items?limit=20`)]);
    const winner = record(detail?.buy_box_winner);
    return { id, name: text(detail?.name), status: text(detail?.status),
      attributes: (Array.isArray(detail?.attributes) ? detail.attributes : []).map(record).filter(a => ['GTIN', 'EAN', 'BRAND', 'MODEL', 'VOLTAGE', 'COLOR'].includes(String(a.id))).map(a => ({ id: text(a.id, 32), value: text(a.value_name) })),
      winner: winner.item_id ? { id: text(winner.item_id, 32), price: positive(winner.price), currency: text(winner.currency_id, 8) } : null,
      sample: sample(items) };
  }));
  return { consultedAt: new Date().toISOString(), authenticated: !!identity, input, probes, candidates, listingSample: sample(listings), catalogs, openaiCalls: 0, advertisementsChanged: false, referenceSaved: false };
}
