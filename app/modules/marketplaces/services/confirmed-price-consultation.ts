import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { readPersistedReference } from './price-persistence';
import type { PriceConsultationResult, PriceSuggestions } from './mercadolivre-price-consultation';
import { DEFAULT_PRICE_PERCENTAGES, suggestedPriceCents, type PricePercentages } from '../price-settings';

export async function confirmConsultationReference(db: SupabaseClient, company: string, result: PriceConsultationResult, percentages: PricePercentages = DEFAULT_PRICE_PERCENTAGES) {
  if (result.status !== 'found' || !result.localProductId) return result;
  const saved = await readPersistedReference(db, company, result.localProductId);
  const incoming = result.prices ? Math.round(result.prices.market * 100) : null;
  if (incoming && !saved.price_cents) throw new MarketplaceError(503, 'reference_not_saved', 'O produto foi cadastrado, mas não foi possível confirmar a gravação do preço. Não considere esse valor salvo; reabra o produto para conferir.');
  const referenceStatus = saved.price_cents ? incoming === saved.price_cents ? 'saved' : 'preserved' : 'missing';
  if (referenceStatus === 'missing') return { ...result, localProductRevision: saved.revision, referenceStatus, notice: 'Produto cadastrado sem preço. Informe uma referência manual ou use Atualizar preço para pesquisar novamente.' } satisfies PriceConsultationResult;
  if (referenceStatus === 'preserved') {
    const suggestions = suggestedPriceCents(saved.price_cents!, percentages)!;
    const prices: PriceSuggestions = { market: saved.price_cents! / 100, minimum: suggestions.minimum / 100, medium: suggestions.medium / 100, ideal: suggestions.ideal / 100 };
    return { ...result, localProductRevision: saved.revision, referenceStatus, prices, sample: { count: 1, minimum: prices.market, maximum: prices.market, source: 'local_reference' }, notice: 'Referência já salva no cadastro preservada e conferida no servidor. Para substituí-la, use Ajustar preço médio ou Atualizar preço.' } satisfies PriceConsultationResult;
  }
  return { ...result, localProductRevision: saved.revision, referenceStatus, notice: `${result.notice || ''} Referência salva no cadastro e conferida no servidor.`.trim() } satisfies PriceConsultationResult;
}
