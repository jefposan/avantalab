export const PRODUCT_STOCK_CHANGED = 'avanta:marketplace-products-changed';
export const LISTING_CONFIRMED = 'avanta:marketplace-listing-confirmed';
export function notifyListingConfirmed(update:import('./listing-confirmation').ListingConfirmation){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(LISTING_CONFIRMED,{detail:update}));
}
export const CATALOG_CONTENT_CHANGED = 'avanta:marketplace-catalog-content-changed';
export const CATALOG_COMPLETION_REQUESTED = 'avanta:marketplace-catalog-completion-requested';
export const PRODUCT_REFERENCE_CHANGED = 'avanta:marketplace-product-reference-changed';
export const PRODUCT_LISTINGS_REMOVED = 'avanta:marketplace-product-listings-removed';
export function notifyProductListingsRemoved(companyId:string){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(PRODUCT_LISTINGS_REMOVED,{detail:{companyId}}));
}
export function notifyProductReferenceChanged(companyId: string, product: import('@/app/modules/marketplaces/services/local-product-model').LocalProduct) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PRODUCT_REFERENCE_CHANGED, { detail: { companyId, product } }));
}
export const MARKETPLACE_DETAIL_NAVIGATION = 'avanta:marketplace-detail-navigation';
export type MarketplaceDetailNavigation = { companyId: string; keepDetail: string };

/** Clique/ativação por teclado em outra ação recolhe fichas, sem executar gravações. */
export function captureMarketplaceDetailNavigation(companyId: string, event: { target: EventTarget | null; currentTarget: HTMLElement }) {
  const target = event.target;
  if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
  if (target.closest('[role="dialog"],[role="alertdialog"]')) return;
  const action = target.closest('button,a,input,select,textarea,[role="button"],[role="option"]');
  if (!action || action.matches(':disabled,[aria-disabled="true"]')) return;
  const keepDetail = target.closest('[data-marketplace-detail]')?.getAttribute('data-marketplace-detail') || '';
  window.dispatchEvent(new CustomEvent<MarketplaceDetailNavigation>(MARKETPLACE_DETAIL_NAVIGATION, { detail: { companyId, keepDetail } }));
}

export function shouldDismissMarketplaceDetail(event: Event, companyId: string, currentDetail: string, busy: boolean) {
  const detail = (event as CustomEvent<MarketplaceDetailNavigation>).detail;
  return !busy && Boolean(currentDetail) && detail?.companyId === companyId && detail.keepDetail !== currentDetail;
}
export function notifyProductStockChanged(companyId: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PRODUCT_STOCK_CHANGED, { detail: { companyId } }));
}
