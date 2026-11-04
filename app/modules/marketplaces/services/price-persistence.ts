import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import type { PriceConsultationResult } from './mercadolivre-price-consultation';

export function assertSavedPrices(row: unknown, prices: NonNullable<PriceConsultationResult['prices']>) {
  const stored = row && typeof row === 'object' ? row as Record<string, unknown> : {};
  for (const [field, value] of Object.entries({ market_price_cents: prices.market, minimum_price_cents: prices.minimum, medium_price_cents: prices.medium, ideal_price_cents: prices.ideal })) {
    if (stored[field] !== Math.round(value * 100)) throw new MarketplaceError(503, 'reference_not_confirmed', 'Não foi possível confirmar os valores gravados no histórico. Reabra o produto para conferir a referência salva.');
  }
}

/** Confere o cadastro canônico da mesma empresa; nunca pesquisa ou grava preços. */
export async function readPersistedReference(db: SupabaseClient, company: string, productId: string, expectedCents?: number) {
  const { data, error } = await db.from('marketplace_products').select('id,price_cents,revision').eq('empresa_id', company).eq('id', productId).is('archived_at', null).maybeSingle();
  if (error || !data || (expectedCents !== undefined && data.price_cents !== expectedCents)) throw new MarketplaceError(409, 'reference_not_confirmed', 'Não foi possível confirmar o preço salvo no cadastro. Reabra o produto para conferir a referência antes de tentar novamente.');
  return data as { id: string; price_cents: number | null; revision: number };
}

