import type { PublicationForm } from './services/catalog-publication.ts';

export type PackageDimensions = { height?: number; width?: number; length?: number; weightKg?: number };
export type PublicationShippingQuote = {
  policy: 'mandatory' | 'optional' | 'not_allowed' | 'unknown';
  freeShipping: boolean; sellerCost: number | null;
  dimensionsSource: 'manual' | 'product' | 'category' | null;
  notice: string; checkedAt: string; expiresAt: string; token?: string;
};

/** Somente os dados que afetam a consulta; não contém sessão nem descrição. */
export function publicationShippingKey(form: Partial<PublicationForm>) {
  return JSON.stringify([form.productId, form.localProductId, form.copySource?.connectionId, form.copySource?.listingId,
    form.categoryId, form.price, form.listingType, form.shippingMode, form.condition, form.freeShipping === true,
    Object.entries(form.attributes || {}).sort(([a], [b]) => a.localeCompare(b)),
    form.packageDimensions?.height, form.packageDimensions?.width, form.packageDimensions?.length, form.packageDimensions?.weightKg]);
}

export function packageDimensionsText(value: PackageDimensions | undefined): string | null {
  if (!value || ![value.height, value.width, value.length, value.weightKg].every(n => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 10000)) return null;
  return `${value.height}x${value.width}x${value.length},${Math.ceil(value.weightKg! * 1000)}`;
}
