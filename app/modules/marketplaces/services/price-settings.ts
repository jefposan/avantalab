import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceError } from './management-access';
import { DEFAULT_PRICE_SETTINGS, validPricePercentages, validPriceTheme, validFinanceRevenueBasis, type PriceSettings } from '../price-settings';
const columns = 'minimum_percent,medium_percent,ideal_percent,theme_mode,revision';
const revenueColumns = `${columns},finance_revenue_enabled`;
export async function readPriceSettings(db: SupabaseClient, companyId: string): Promise<PriceSettings> {
  const latest = await db.from('marketplace_price_settings').select(`${revenueColumns},finance_revenue_basis`).eq('empresa_id', companyId).maybeSingle();
  const basisReady = !['42703', 'PGRST204'].includes(latest.error?.code || '');
  const result = basisReady ? latest : await db.from('marketplace_price_settings').select(revenueColumns).eq('empresa_id', companyId).maybeSingle();
  const revenueReady = !['42703', 'PGRST204'].includes(result.error?.code || '');
  const { data, error } = revenueReady
    ? result
    : await db.from('marketplace_price_settings').select(columns).eq('empresa_id', companyId).maybeSingle();
  if (error) {
    // Compatibilidade explícita antes de instalar a migração; não simula gravação.
    if (['42P01', 'PGRST205'].includes(error.code)) return { ...DEFAULT_PRICE_SETTINGS, storageReady: false };
    throw new MarketplaceError(503, 'price_settings_unavailable', 'Não foi possível carregar os percentuais. Tente novamente.');
  }
  if (!data) return { ...DEFAULT_PRICE_SETTINGS, ...(revenueReady ? { financeRevenueEnabled: true } : {}), ...(basisReady ? { financeRevenueBasis: 'gross' } : {}) };
  const percentages = { minimum: Number(data.minimum_percent), medium: Number(data.medium_percent), ideal: Number(data.ideal_percent) };
  if (!validPricePercentages(percentages) || !validPriceTheme(data.theme_mode) || !Number.isSafeInteger(data.revision) || data.revision < 1) throw new MarketplaceError(503, 'price_settings_invalid', 'As configurações de preços precisam ser revisadas pelo administrador.');
  const financeRevenueEnabled = (data as { finance_revenue_enabled?: boolean }).finance_revenue_enabled;
  const financeRevenueBasis = (data as { finance_revenue_basis?: unknown }).finance_revenue_basis;
  return { ...(validFinanceRevenueBasis(financeRevenueBasis) ? { financeRevenueBasis } : {}), percentages, theme: data.theme_mode, revision: data.revision, storageReady: true, ...(typeof financeRevenueEnabled === 'boolean' ? { financeRevenueEnabled } : {}) };
}
export async function savePriceSettings(db: SupabaseClient, companyId: string, actor: string, body: Record<string, unknown>) {
  if (!validPricePercentages(body.percentages)) throw new MarketplaceError(400, 'invalid_percentages', 'Informe percentuais de 0,01% a 1.000%, em ordem: mínimo ≤ médio ≤ ideal, com até duas casas decimais.');
  if (!validPriceTheme(body.theme)) throw new MarketplaceError(400, 'invalid_theme', 'Selecione uma aparência válida.');
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw new MarketplaceError(400, 'invalid_revision', 'Atualize as configurações antes de salvar.');
  const financeRevenueEnabled = body.financeRevenueEnabled;
  if (financeRevenueEnabled !== undefined && typeof financeRevenueEnabled !== 'boolean') {
    throw new MarketplaceError(400, 'invalid_finance_revenue', 'Selecione uma opção válida para o envio das receitas.');
  }
  const financeRevenueBasis = body.financeRevenueBasis;
  if (financeRevenueBasis !== undefined && !validFinanceRevenueBasis(financeRevenueBasis)) {
    throw new MarketplaceError(400, 'invalid_finance_revenue_basis', 'Selecione Bruto ou Líquido para o faturamento.');
  }
  const values = { ...(financeRevenueBasis === undefined ? {} : { finance_revenue_basis: financeRevenueBasis }), ...(financeRevenueEnabled === undefined ? {} : { finance_revenue_enabled: financeRevenueEnabled }), minimum_percent: body.percentages.minimum, medium_percent: body.percentages.medium, ideal_percent: body.percentages.ideal, theme_mode: body.theme, revision: Number(body.revision) + 1, updated_by: actor, updated_at: new Date().toISOString() };
  const query = Number(body.revision) === 0
    ? db.from('marketplace_price_settings').insert({ empresa_id: companyId, ...values })
    : db.from('marketplace_price_settings').update(values).eq('empresa_id', companyId).eq('revision', body.revision);
  const { data, error } = await query.select(columns).maybeSingle();
  if (error?.code === '23505' || (!error && !data)) throw new MarketplaceError(409, 'price_settings_conflict', 'Outra pessoa alterou as configurações. Atualize antes de salvar novamente.');
  if (error || !data) throw new MarketplaceError(503, 'price_settings_save', 'Não foi possível salvar as configurações. Confira a instalação do banco e tente novamente.');
  return { percentages: body.percentages, theme: body.theme, revision: Number(data.revision), storageReady: true,
    ...(financeRevenueBasis === undefined ? {} : { financeRevenueBasis }),
    ...(financeRevenueEnabled === undefined ? {} : { financeRevenueEnabled }) } satisfies PriceSettings;
}
