export type PricePercentages = { minimum: number; medium: number; ideal: number };
export type PriceTheme = 'profile' | 'light' | 'dark' | 'system';
export type FinanceRevenueBasis = 'gross' | 'net';
export type PriceSettings = { percentages: PricePercentages; theme: PriceTheme; revision: number; storageReady: boolean; financeRevenueEnabled?: boolean; financeRevenueBasis?: FinanceRevenueBasis; profileDark?: boolean; profileColor?:string };
export const DEFAULT_PRICE_PERCENTAGES: PricePercentages = { minimum: 50, medium: 70, ideal: 90 };
export const DEFAULT_PRICE_SETTINGS: PriceSettings = { percentages: DEFAULT_PRICE_PERCENTAGES, theme: 'profile', revision: 0, storageReady: true };
export function validPricePercentages(value: unknown): value is PricePercentages {
  if (!value || typeof value !== 'object') return false;
  const { minimum, medium, ideal } = value as PricePercentages;
  return [minimum, medium, ideal].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 1000 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-7)
    && minimum <= medium && medium <= ideal;
}
export function validPriceTheme(value: unknown): value is PriceTheme { return ['profile', 'light', 'dark', 'system'].includes(String(value)); }
export function validFinanceRevenueBasis(value: unknown): value is FinanceRevenueBasis { return value === 'gross' || value === 'net'; }
export function validPriceSettings(value: unknown): value is PriceSettings {
  if (!value || typeof value !== 'object') return false;
  const row = value as PriceSettings;
  return validPricePercentages(row.percentages) && validPriceTheme(row.theme) && Number.isSafeInteger(row.revision) && row.revision >= 0 && typeof row.storageReady === 'boolean' && (row.financeRevenueEnabled === undefined || typeof row.financeRevenueEnabled === 'boolean') && (row.financeRevenueBasis === undefined || validFinanceRevenueBasis(row.financeRevenueBasis)) && (row.profileDark === undefined || typeof row.profileDark === 'boolean') && (row.profileColor===undefined||typeof row.profileColor==='string'&&/^#[0-9a-f]{6}$/i.test(row.profileColor));
}
export function suggestedPriceCents(reference: number | null, percentages = DEFAULT_PRICE_PERCENTAGES) {
  if (reference == null || !Number.isSafeInteger(reference) || reference < 0 || !validPricePercentages(percentages)) return null;
  return { minimum: Math.round(reference * percentages.minimum / 100), medium: Math.round(reference * percentages.medium / 100), ideal: Math.round(reference * percentages.ideal / 100) };
}
