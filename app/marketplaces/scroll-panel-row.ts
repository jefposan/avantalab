/** Chamado somente após abrir uma linha por ação explícita do usuário. */
export function scrollMarketplaceRow(row: HTMLElement) {
  const header = row.closest('main')?.querySelector('header');
  const selector = row.closest('main')?.querySelector('[data-marketplace-selector]');
  const headerBottom = Math.max(0, header?.getBoundingClientRect().bottom ?? 0, selector?.getBoundingClientRect().bottom ?? 0);
  window.scrollTo({
    top: Math.max(0, window.scrollY + row.getBoundingClientRect().top - headerBottom - 8),
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
  });
}
