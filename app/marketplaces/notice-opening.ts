import type { NoticeTarget } from '@/app/modules/marketplaces/notice-navigation';

export const NOTICE_OPENING_RESULT = 'avanta:marketplace-notice-result';
export const NOTICE_OPENING_CANCEL = 'avanta:marketplace-notice-cancel';
export function reportMarketplaceNoticeOpening(key: string, error?: string) {
  window.dispatchEvent(new CustomEvent(NOTICE_OPENING_RESULT, {detail:{key,error}}));
}
export function cancelMarketplaceNoticeOpening(key: string) {
  window.dispatchEvent(new CustomEvent(NOTICE_OPENING_CANCEL, {detail:{key}}));
}

/** Espera o resultado explícito do estoque ou a montagem do anúncio.
 * Não busca dados nem resolve pendências de negócio. */
export function watchMarketplaceNoticeOpening(page: HTMLElement, target: NoticeTarget, ready: () => void, failed: (error?: string) => void) {
  let frame = 0, stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true; cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener(NOTICE_OPENING_RESULT, result);
  };
  const check = () => {
    frame = 0;
    if (stopped || !page.isConnected) return;
    // Estoque conclui pelo resultado da tentativa, nunca pela geometria ou por
    // uma ficha antiga do mesmo produto montada em outro bloco.
    if (target.panel === 'stock') {
      const result=Array.from(page.querySelectorAll<HTMLElement>('[data-marketplace-notice-result]')).find(node=>node.dataset.marketplaceNoticeResult===target.key);
      if(!result)return;
      const error=result.dataset.marketplaceNoticeError;
      if(!error&&!Array.from(result.querySelectorAll<HTMLElement>('[data-marketplace-detail]')).some(row=>(row.dataset.marketplaceDetail||'').endsWith(`:${target.productId}`)))return;
      stop();if(error)failed(error);else ready();return;
    }
    const row = Array.from(page.querySelectorAll<HTMLElement>('[data-marketplace-detail]')).find(node => {
      const key = node.dataset.marketplaceDetail || '';
      return key === `announced:${target.listingId}` || key.endsWith(`|${target.listingId}`);
    });
    if (!row) return;
    if (!row.querySelector('[aria-expanded="true"]')) return;
    stop(); ready();
  };
  function schedule() { if(stopped)return;if(target.panel==='stock'){check();return;}if(!frame)frame=requestAnimationFrame(check); }
  function result(event: Event) {
    const detail = (event as CustomEvent<{key:string;error?:string}>).detail;
    if (stopped || target.panel !== 'stock' || detail?.key !== target.key) return;
    stop(); if (detail.error) failed(detail.error); else ready();
  }
  const observer = new MutationObserver(schedule);
  const timer = setTimeout(() => { if (!stopped) { stop(); cancelMarketplaceNoticeOpening(target.key); failed('A abertura demorou mais que o esperado. Tente novamente.'); } }, 25_000);
  observer.observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-expanded', 'hidden', 'style', 'data-marketplace-notice-result', 'data-marketplace-notice-error'] });
  window.addEventListener(NOTICE_OPENING_RESULT, result);
  window.addEventListener('scroll', schedule, { passive: true }); schedule();
  return stop;
}
