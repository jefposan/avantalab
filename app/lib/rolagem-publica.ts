export function rolarParaSecaoPublica(href: string) {
  const destino = document.querySelector<HTMLElement>(href);
  const cabecalho = document.querySelector<HTMLElement>('[data-public-header]');
  if (!destino) return;

  const movimentoReduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const alvoVisual = destino.querySelector<HTMLElement>('[data-scroll-target]') ?? destino;
  const margemDeLeitura = 28;
  const topo = alvoVisual.getBoundingClientRect().top + window.scrollY
    - (cabecalho?.offsetHeight ?? 74) - margemDeLeitura;

  window.history.replaceState(null, '', href);
  window.scrollTo({ top: Math.max(0, topo), behavior: movimentoReduzido ? 'auto' : 'smooth' });
}
