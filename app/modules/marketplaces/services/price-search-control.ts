import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import type { OpenAIWebPriceLookup } from './openai-web-price-search';

export const PRICE_SEARCH_MODEL = 'gpt-5.4-mini';
export type PriceSearchControl = { db: SupabaseClient; companyId: string; actorId: string; signal?: AbortSignal; includeFacts?: boolean };
export type PriceSearchUsage = { inputTokens: number; cachedTokens: number; outputTokens: number; webCalls: number; requestId?: string; usageKnown?: boolean; attempts?: number };
export const emptyPriceSearchUsage = (): PriceSearchUsage => ({ inputTokens: 0, cachedTokens: 0, outputTokens: 0, webCalls: 0, usageKnown: false });

export function priceSearchHash(input: { ean: string | null; productName: string; model?:string; brand?:string;variant?:string }) {
  // Nome/variante permanece na chave mesmo com EAN: nunca compartilhar variantes por aproximação.
  return createHash('sha256').update(JSON.stringify(['mini-cited-eight-restored-v13', input.ean?.trim() || '', input.productName.trim().normalize('NFC').toLowerCase().replace(/\s+/g, ' '),input.model?.trim().toLowerCase()||'',input.brand?.trim().toLowerCase()||'',input.variant?.trim().toLowerCase()||''])).digest('hex');
}

export async function controlledPriceSearch(input: { ean: string | null; productName: string }, control: PriceSearchControl, run: (record: (usage: PriceSearchUsage) => void) => Promise<OpenAIWebPriceLookup>) {
  control.signal?.throwIfAborted();
  const claim = await control.db.rpc('marketplace_price_ai_claim', { p_company: control.companyId, p_actor: control.actorId, p_hash: priceSearchHash(input), p_facts: control.includeFacts !== false });
  if (claim.error || !claim.data) throw new MarketplaceError(503, 'price_controls_unavailable', 'Não foi possível conferir os limites da pesquisa. Nenhuma nova consulta paga foi iniciada.');
  const reservation = claim.data as { status: string; id?: string; result?: OpenAIWebPriceLookup; researchedAt?: string };
  if (reservation.status === 'cached' && reservation.result) { control.signal?.throwIfAborted(); return { ...reservation.result, fromCache: true, researchedAt: reservation.researchedAt }; }
  if (reservation.status === 'busy') throw new MarketplaceError(409, 'price_search_busy', 'Uma pesquisa deste produto já está em andamento. Aguarde antes de consultar novamente.');
  if (reservation.status === 'limited') throw new MarketplaceError(429, 'price_search_budget', 'O limite de segurança de pesquisas foi atingido. Use a referência salva e tente mais tarde.');
  if (reservation.status === 'cooldown') throw new MarketplaceError(429, 'price_search_cooldown', 'Aguarde um minuto antes de repetir esta pesquisa. A referência salva continua disponível.');
  if (reservation.status !== 'claimed' || !reservation.id) throw new MarketplaceError(503, 'price_controls_unavailable', 'Não foi possível reservar a pesquisa. Nenhuma consulta paga foi iniciada.');
  let usage = emptyPriceSearchUsage();
  let result: OpenAIWebPriceLookup | undefined;
  let failure: unknown;
  try { result = await run(value => { usage = value; }); } catch (error) { failure = error; }
  const cancelled = control.signal?.aborted || failure instanceof DOMException && failure.name === 'AbortError';
  const finished = await control.db.rpc('marketplace_price_ai_finish', {
    p_company: control.companyId, p_actor: control.actorId, p_id: reservation.id,
    p_status: cancelled ? 'cancelled' : failure ? 'failed' : 'completed',
    p_result: !cancelled && !failure ? result : null,
    p_usage: { ...usage, productName: input.productName.slice(0,220), ean: input.ean, model: PRICE_SEARCH_MODEL, estimatedUsd: usage.usageKnown === false ? null : Math.max(0, usage.inputTokens - usage.cachedTokens) * .75 / 1_000_000 + usage.cachedTokens * .075 / 1_000_000 + usage.outputTokens * 4.5 / 1_000_000 + usage.webCalls * .01 },
    p_error: failure instanceof MarketplaceError ? failure.code : cancelled ? 'cancelled' : failure ? 'provider_failed' : null,
  });
  if (failure) throw failure;
  control.signal?.throwIfAborted();
  if (finished.error) throw new MarketplaceError(503, 'price_usage_save_failed', 'A pesquisa terminou, mas não foi possível registrar o resultado. Aguarde antes de repetir para evitar cobrança duplicada.');
  return { ...result!, researchedAt: new Date().toISOString() };
}
