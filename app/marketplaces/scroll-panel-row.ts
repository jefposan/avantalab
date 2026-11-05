/** Sticky deixa de acompanhar a viewport se um ancestral vira scroll container.
 * O foco da ficha bloqueia o body com overflow:hidden; a barra então rola junto
 * com o documento e não pode reservar sua posição inicial como espaço fixo. */
export function marketplaceSelectorBottom(selector: Element | null) {
  if (!selector) return 0;
  const doc = selector.ownerDocument, view = doc?.defaultView;
  if (view?.getComputedStyle(selector).position === 'sticky') {
    for (let parent = selector.parentElement; parent && parent !== doc.documentElement; parent = parent.parentElement) {
      if (/^(auto|scroll|hidden|overlay)$/.test(view.getComputedStyle(parent).overflowY)) return 0;
    }
  }
  return selector.getBoundingClientRect().bottom;
}

/** Chamado somente por ação explícita para exibir uma linha ou um bloco. */
export function marketplaceNavigationBottom(row: HTMLElement, additionalHeaderBottom = 0) {
  const header = row.closest('main')?.querySelector('header');
  const selector = row.closest('main')?.querySelector('[data-marketplace-selector]');
  return Math.max(0, header?.getBoundingClientRect().bottom ?? 0, marketplaceSelectorBottom(selector ?? null), additionalHeaderBottom);
}

export function scrollMarketplaceRow(row: HTMLElement, additionalHeaderBottom = 0, behavior?: 'instant' | 'smooth') {
  const headerBottom = marketplaceNavigationBottom(row, additionalHeaderBottom);
  const preferredBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
  window.scrollTo({
    top: Math.max(0, window.scrollY + row.getBoundingClientRect().top - headerBottom - 8),
    behavior: behavior === 'instant' ? 'instant' : preferredBehavior,
  });
}

/** A preparação pode terminar enquanto o popup ainda bloqueia o body.
 * Reservar a altura persistente da navegação que voltará a ficar sticky. */
export function scrollMarketplacePreparation(title: HTMLElement) {
  const main = title.closest('main');
  const navigationHeight = main ? Number.parseFloat(window.getComputedStyle(main).getPropertyValue('--marketplace-navigation-height')) || 0 : 0;
  scrollMarketplaceRow(title.closest<HTMLElement>('article') || title, navigationHeight, 'instant');
}

/** Depois da página solicitada carregar, alinhar o card real (não a sublista). */
export function scrollMarketplacePageTop(list: HTMLElement | null) {
  const frame = requestAnimationFrame(() => {
    if (!list?.isConnected) return;
    const card = list.closest<HTMLElement>('[data-marketplace-page-card]') || list;
    const viewport = card.closest('[data-avantaprecos-viewport]');
    const topbarBottom = viewport?.firstElementChild?.getBoundingClientRect().bottom ?? 0;
    card.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    scrollMarketplaceRow(card, topbarBottom);
  });
  return () => cancelAnimationFrame(frame);
}

/** Medir só depois de expandir/recolher a ficha anterior, nunca durante o clique. */
export function scrollExpandedMarketplaceProduct(getRow: () => HTMLElement | null) {
  const frame = requestAnimationFrame(() => {
    const row = getRow();
    if (!row?.isConnected || !row.querySelector('[aria-expanded="true"]')) return;
    const header=row.querySelector<HTMLElement>('[id^="identity-"]');
    scrollMarketplaceRow(header||row, 0, 'instant');
  });
  return () => cancelAnimationFrame(frame);
}

/** A ficha travada conserva o cabeçalho alcançável mesmo após foco, resize ou
 * mudanças de layout acima dela. Nunca move a rolagem interna dos detalhes. */
export function keepExpandedProductHeaderVisible(row: HTMLElement) {
  const doc=row.ownerDocument,view=doc.defaultView;
  const header=row.querySelector<HTMLElement>('[id^="identity-"]');
  if(!view||!header||row.closest('[inert]'))return()=>{};
  let frame=0,stopped=false;
  const align=()=>{
    frame=0;
    if(stopped||!row.isConnected||!header.isConnected||doc.querySelector('[aria-modal="true"]'))return;
    for(let pass=0;pass<2;pass++){
      const top=Math.max(view.visualViewport?.offsetTop||0,marketplaceNavigationBottom(row))+8;
      let delta=header.getBoundingClientRect().top-top;
      if(Math.abs(delta)<=1)break;
      // Alguns painéis têm um ancestral rolável além do documento. Corrigir
      // primeiro esse ancestral, sem alcançar data-product-scroll (descendente).
      for(let parent=row.parentElement;parent&&parent!==doc.body&&parent!==doc.documentElement;parent=parent.parentElement){
        if(/^(auto|scroll|hidden|overlay)$/.test(view.getComputedStyle(parent).overflowY)&&parent.scrollHeight>parent.clientHeight){
          parent.scrollTo({top:Math.max(0,parent.scrollTop+delta),behavior:'instant'});
          delta=header.getBoundingClientRect().top-top;
        }
      }
      if(Math.abs(delta)>1)view.scrollTo({top:Math.max(0,view.scrollY+delta),behavior:'instant'});
    }
  };
  const schedule=()=>{if(!stopped&&!frame)frame=view.requestAnimationFrame(align);};
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
  const main=row.closest('main');
  [row,header,main,main?.querySelector('header'),main?.querySelector('[data-marketplace-selector]')].forEach(node=>{if(node)resize?.observe(node);});
  const mutations=typeof MutationObserver==='undefined'?null:new MutationObserver(schedule);
  mutations?.observe(main||doc.body,{childList:true,subtree:true});
  doc.addEventListener('scroll',schedule,true);doc.addEventListener('focusin',schedule);
  view.addEventListener('resize',schedule);view.visualViewport?.addEventListener('resize',schedule);view.visualViewport?.addEventListener('scroll',schedule);
  align();schedule();
  return()=>{
    stopped=true;view.cancelAnimationFrame(frame);resize?.disconnect();mutations?.disconnect();
    doc.removeEventListener('scroll',schedule,true);doc.removeEventListener('focusin',schedule);
    view.removeEventListener('resize',schedule);view.visualViewport?.removeEventListener('resize',schedule);view.visualViewport?.removeEventListener('scroll',schedule);
  };
}

const marketplacePanelIds = new Set(['connected-accounts-content', 'sales-content', 'announced-content', 'warehouses-content', 'products-content', 'sales-report-content']);

/** Atalho local: abre pelo acionador existente, sem alterar filtros ou atualizar dados. */
export function scrollToMarketplacePanel(contentId: string) {
  if (!['sales-content','announced-content','warehouses-content','sales-report-content'].includes(contentId)) return;
  const content = document.getElementById(contentId);
  const card = content?.parentElement;
  if (!content || !card || card.closest('[inert]')) return;
  if (content.hidden) {
    const button = card.querySelector<HTMLButtonElement>(`button[aria-controls="${contentId}"][aria-expanded="false"]`);
    if (!button || button.disabled) return;
    button.click();
  }
  requestAnimationFrame(() => {
    if (!card.isConnected || content.hidden) return;
    const title = card.querySelector<HTMLElement>('h2');
    if (title) { title.tabIndex = -1; title.focus({preventScroll:true}); }
    scrollMarketplaceRow(card);
  });
}

/** Captura só a expansão explícita dos cards do módulo, antes do toggle.
 * Mede após o React aplicar a expansão e recolher eventuais fichas anteriores. */
export function captureMarketplacePanelExpansion(event: { target: EventTarget | null; currentTarget: HTMLElement }) {
  const target = event.target;
  if (!(target instanceof Element) || !event.currentTarget.contains(target)) return;
  if (target.closest('[role="dialog"],[role="alertdialog"]')) return;
  const button = target.closest<HTMLButtonElement>('button[aria-controls][aria-expanded="false"]');
  const contentId = button?.getAttribute('aria-controls');
  if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || !contentId || !marketplacePanelIds.has(contentId)) return;
  const root = event.currentTarget;
  requestAnimationFrame(() => {
    if (!button.isConnected || button.getAttribute('aria-expanded') !== 'true') return;
    const content = document.getElementById(contentId);
    const card = content?.parentElement;
    if (!content || content.hidden || !card?.isConnected || !root.contains(card)) return;
    scrollMarketplaceRow(card);
  });
}
