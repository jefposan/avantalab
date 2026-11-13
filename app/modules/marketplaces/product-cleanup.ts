export type ProductCleanupItem = {
  id: string; name: string; sku: string; ean: string | null; revision: number;
  stock: number | null; origin: 'avantaprecos' | 'anuncio' | 'local';
  hasHistory: boolean; linked: boolean; disconnectedLinks?: number; blockers: string[];
};
export type ProductCleanupList = { companyName: string; products: ProductCleanupItem[] };
export type ProductCleanupReview = ProductCleanupList & { reviewToken: string };
export type ProductCleanupResult = { removed: number; productIds: string[]; historyPreserved: true; replayed: boolean };
export const productCleanupOrigin = (origin: ProductCleanupItem['origin']) => ({ avantaprecos: 'AvantaPreços', anuncio: 'Anúncios', local: 'Cadastro local' })[origin];
