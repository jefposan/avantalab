/** Ao recolher pelo rodapé, devolve a leitura e o foco ao controle do topo. */
export function collapseMarketplacePanel(contentId: string, collapse: () => void) {
  const headerButton = document.getElementById(contentId)?.parentElement
    ?.querySelector<HTMLButtonElement>(`button[aria-controls="${contentId}"]`);
  collapse();
  requestAnimationFrame(() => {
    if (!headerButton?.isConnected) return;
    headerButton.focus({ preventScroll: true });
    headerButton.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
}
