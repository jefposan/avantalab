/** Mantém o atalho flutuante acima dos links legais sem criar espaço após o rodapé. */
export function observeSearchShortcutFooter(button: HTMLElement) {
  const page = button.closest('main');
  const footer = page?.querySelector(':scope > footer');
  const view = button.ownerDocument.defaultView;
  if (!page || !footer || !view) return () => {};
  let frame = 0;
  let last = -1;
  const update = () => {
    frame = 0;
    const visible = Math.max(0, Math.ceil(view.innerHeight - footer.getBoundingClientRect().top));
    if (visible !== last) { button.style.setProperty('--marketplace-footer-visible', `${visible}px`); last = visible; }
  };
  const schedule = () => { if (!frame) frame = view.requestAnimationFrame(update); };
  const observer = typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(schedule) : null;
  observer?.observe(page);
  observer?.observe(footer);
  view.addEventListener('scroll', schedule, { passive: true });
  view.addEventListener('resize', schedule);
  update();
  return () => {
    observer?.disconnect();
    view.removeEventListener('scroll', schedule);
    view.removeEventListener('resize', schedule);
    if (frame) view.cancelAnimationFrame(frame);
    button.style.removeProperty('--marketplace-footer-visible');
  };
}
