import type { CSSProperties } from 'react';

/** Loading visual compartilhado. O consumidor fornece role/status e texto. */
export default function LoadingPontos({ cor = '#003e73', compacto = false }: { cor?: string; compacto?: boolean }) {
  return <span className={`avanta-loading-pontos${compacto ? ' avanta-loading-pontos--compacto' : ''}`} style={{ color: cor }} aria-hidden="true">
    <span className="avanta-loading-pontos-trajeto">{Array.from({ length: 10 }, (_, indice) => <i key={indice} style={{ '--av-ponto-atraso': `${-indice * .2 - .046}s` } as CSSProperties} />)}</span>
  </span>;
}
