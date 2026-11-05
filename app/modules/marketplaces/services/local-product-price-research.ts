import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { getLocalProduct } from './local-products';
import { objectValue, uuidIsValid } from './listing-model';
import { consultOpenAIWebPrices, type WebPriceOffer } from './openai-web-price-search';
import { completeProductFacts, type WebProductFacts } from './web-product-facts';
import { registerConsultedProduct } from './price-product-stock';
import { readPersistedReference } from './price-persistence';
import { priceSearchDetails } from '../price-offer-identity';
import { PRICE_REFERENCE_OFFER_LIMIT } from './price-reference';

type ResearchResult = { status: string; claimed?: boolean; price_cents: number | null; offers_count: number };
async function command(db: SupabaseClient, company: string, actor: string, product: string, revision: number, key: string, action: string, offers: WebPriceOffer[] = [], error?: string) {
  const result = await db.rpc('marketplace_product_price_research', { p_empresa_id: company, p_actor_id: actor, p_product_id: product, p_revision: revision, p_request_key: key, p_action: action, p_offers: offers, p_error: error || null });
  if (result.error) throw new MarketplaceError(result.error.code === 'P0001' ? 409 : 503, 'price_research_database', result.error.code === 'P0001' ? 'O cadastro ou a pesquisa mudou. Atualize a lista antes de tentar novamente.' : 'Não foi possível registrar a pesquisa de referência. Tente novamente.');
  const data = objectValue(result.data);
  if (typeof data.status !== 'string') throw new MarketplaceError(503, 'price_research_invalid', 'A pesquisa retornou um estado incompleto. Atualize a lista antes de tentar novamente.');
  return data as ResearchResult;
}

function outcome(result: ResearchResult, hasReference = true) {
  if (['busy','pending'].includes(result.status)) throw new MarketplaceError(409, 'price_research_busy', 'Uma pesquisa deste produto já está em andamento. Aguarde e atualize a lista.');
  if (result.status === 'limited') throw new MarketplaceError(429, 'price_research_limited', 'Aguarde um minuto antes de iniciar outra pesquisa de referência.');
  if (result.status === 'conflict') throw new MarketplaceError(409, 'price_research_conflict', 'O produto foi alterado durante a pesquisa. A referência não foi substituída. Atualize a lista antes de pesquisar novamente.');
  if (result.status === 'failed') throw new MarketplaceError(503, 'price_research_failed', 'A pesquisa anterior não foi concluída. A referência foi mantida. Inicie uma nova tentativa explicitamente.');
  if (!['updated','no_offers'].includes(result.status)) throw new MarketplaceError(503, 'price_research_invalid', 'Não foi possível confirmar a atualização. Atualize a lista antes de tentar novamente.');
  return { status: result.status, priceCents: result.price_cents, offersCount: result.offers_count,
    message: result.status === 'no_offers' ? `Pesquisa concluída sem ofertas com preço e disponibilidade confirmados. ${hasReference ? 'A referência anterior foi mantida.' : 'O produto continua sem referência; informe um preço manualmente ou tente novamente mais tarde.'}` : `Referência atualizada com ${result.offers_count} oferta(s) de mercado. Nenhum anúncio ou estoque foi alterado.` };
}

export async function researchLocalProductPrice(db: SupabaseClient, company: string, actor: string, input: Record<string, unknown>, signal?: AbortSignal) {
  if (!uuidIsValid(input.productId) || !uuidIsValid(input.requestKey) || !Number.isSafeInteger(input.revision) || Number(input.revision) < 1) throw new MarketplaceError(400, 'invalid_price_research', 'Atualize o cadastro antes de pesquisar a referência.');
  const product = await getLocalProduct(db, company, input.productId);
  const revision = Number(input.revision), key = input.requestKey;
  const claimed = await command(db, company, actor, product.id, revision, key, 'claim');
  if (!claimed.claimed) {
    const existing = outcome(claimed, product.price_cents != null);
    if (existing.status === 'updated' && existing.priceCents) await readPersistedReference(db, company, product.id, existing.priceCents);
    return existing;
  }
  let offers: WebPriceOffer[];
  let facts:WebProductFacts|null|undefined;
  let fromCache = false;
  try {
    const lookup = await consultOpenAIWebPrices({ ean: product.ean, productName: product.name, ...priceSearchDetails(product.attributes,product.name) }, { db, companyId: company, actorId: actor, signal, includeFacts: !product.ean || !product.attributes?.length || !product.description });
    fromCache = lookup.fromCache === true;
    facts=lookup.product;
    // Mesma amostra comprovável do AvantaPreços; sem usar preço do anúncio como pesquisa.
    offers = (lookup.sample?.offers || []).filter(offer => Number.isFinite(offer.price) && offer.price > 0 && offer.price < 1_000_000).slice(0, PRICE_REFERENCE_OFFER_LIMIT);
  } catch (error) {
    await command(db, company, actor, product.id, revision, key, 'fail', [], error instanceof MarketplaceError ? error.code : 'research_failed');
    throw error;
  }
  const completed=outcome(await command(db, company, actor, product.id, revision, key, 'complete', offers), product.price_cents != null);
  if(facts){
    const enriched=completeProductFacts({...product,id:`LOCAL:${product.id}`,image:product.pictures?.[0]||null},facts);
    await registerConsultedProduct(db,company,actor,enriched,product.ean||facts.ean);
  }
  if (completed.status === 'updated' && completed.priceCents) await readPersistedReference(db, company, product.id, completed.priceCents);
  return fromCache ? { ...completed, message: completed.status === 'updated' ? 'Preços e fontes da pesquisa recente reaproveitados, sem nova consulta paga. Estoque e anúncios preservados.' : `${completed.message} Resultado recente reaproveitado sem nova consulta paga.` } : completed;
}
