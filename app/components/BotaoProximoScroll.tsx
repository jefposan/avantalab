'use client';

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './BotaoProximoScroll.module.css';

type BotaoProximoScrollProps = {
  scrollContainerRef?: RefObject<HTMLElement | null>;
  modo?: 'pagina' | 'container';
  destinos?: readonly string[];
  distanciaInferior?: number;
  className?: string;
  ariaLabel?: string;
  title?: string;
};

const LIMIAR_FIM_PX = 2;

function elementoRolagemPagina() {
  return document.scrollingElement ?? document.documentElement;
}

function movimentoReduzido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function BotaoProximoScroll({
  scrollContainerRef,
  modo = 'pagina',
  destinos = [],
  distanciaInferior = 20,
  className = '',
  ariaLabel = 'Avançar para a próxima parte',
  title = 'Próxima parte',
}: BotaoProximoScrollProps) {
  const [visivel, setVisivel] = useState(false);
  const montado = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const emContainer = modo === 'container';

  const atualizarVisibilidade = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (container) {
      setVisivel(container.scrollHeight - container.scrollTop - container.clientHeight > LIMIAR_FIM_PX);
      return;
    }
    const pagina = elementoRolagemPagina();
    setVisivel(pagina.scrollHeight - pagina.scrollTop - pagina.clientHeight > LIMIAR_FIM_PX);
  }, [scrollContainerRef]);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    const alvo: HTMLElement | Window = container ?? window;
    let quadro = 0;
    const agendarAtualizacao = () => {
      window.cancelAnimationFrame(quadro);
      quadro = window.requestAnimationFrame(atualizarVisibilidade);
    };

    agendarAtualizacao();
    alvo.addEventListener('scroll', agendarAtualizacao, { passive: true });
    window.addEventListener('resize', agendarAtualizacao);

    const tamanho = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(agendarAtualizacao)
      : null;
    tamanho?.observe(container ?? document.documentElement);

    const mutacoes = typeof MutationObserver !== 'undefined'
      ? new MutationObserver(agendarAtualizacao)
      : null;
    mutacoes?.observe(container ?? document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(quadro);
      alvo.removeEventListener('scroll', agendarAtualizacao);
      window.removeEventListener('resize', agendarAtualizacao);
      tamanho?.disconnect();
      mutacoes?.disconnect();
    };
  }, [atualizarVisibilidade, scrollContainerRef]);

  const avancar = () => {
    const behavior: ScrollBehavior = movimentoReduzido() ? 'auto' : 'smooth';
    const container = scrollContainerRef?.current;
    if (container) {
      const fim = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollTo({
        top: Math.min(fim, container.scrollTop + Math.round(container.clientHeight * 0.84)),
        behavior,
      });
      return;
    }

    const pagina = elementoRolagemPagina();
    const atual = pagina.scrollTop;
    const proximoDestino = destinos
      .map((id) => document.getElementById(id))
      .filter((elemento): elemento is HTMLElement => Boolean(elemento))
      .map((elemento) => {
        const margem = Number.parseFloat(window.getComputedStyle(elemento).scrollMarginTop) || 0;
        return {
          elemento,
          top: Math.max(0, elemento.getBoundingClientRect().top + window.scrollY - margem),
        };
      })
      .find((destino) => destino.top > atual + 24);

    if (proximoDestino) {
      proximoDestino.elemento.scrollIntoView({ behavior, block: 'start' });
      return;
    }

    const rolarAteFimReal = (modo: ScrollBehavior) => {
      const paginaAtualizada = elementoRolagemPagina();
      window.scrollTo({
        top: Math.max(0, paginaAtualizada.scrollHeight - paginaAtualizada.clientHeight),
        left: 0,
        behavior: modo,
      });
    };

    rolarAteFimReal(behavior);
    if (behavior === 'smooth') {
      window.setTimeout(() => rolarAteFimReal('auto'), 520);
      window.setTimeout(() => rolarAteFimReal('auto'), 900);
    }
  };

  const conteudo = (
    <div
      className={`${styles.root} ${emContainer ? styles.container : styles.pagina} ${visivel ? styles.visivel : ''} ${className}`}
      style={{ '--av-scroll-next-bottom': `${distanciaInferior}px` } as CSSProperties}
      aria-hidden={!visivel}
    >
      <button
        type="button"
        className={styles.botao}
        onClick={avancar}
        aria-label={ariaLabel}
        title={title}
        tabIndex={visivel ? 0 : -1}
      >
        <span className={styles.circulo}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M12 5v14m0 0l-6-6m6 6l6-6" />
          </svg>
        </span>
      </button>
    </div>
  );

  if (emContainer) return conteudo;
  return montado ? createPortal(conteudo, document.body) : null;
}
