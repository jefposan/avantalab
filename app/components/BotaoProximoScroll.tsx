'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import styles from './BotaoProximoScroll.module.css';

const LIMIAR_FIM_PX = 12;
const PAUSA_APOS_ROLAGEM_MS = 180;

type BotaoProximoScrollProps = {
  /** Use para um painel que possui sua própria rolagem; sem ela, controla a página inteira. */
  scrollContainerRef?: RefObject<HTMLElement | null>;
  /** Distância inferior em pixels. O padrão protege a área segura do aparelho. */
  distanciaInferior?: number;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  title?: string;
};

function prefereMovimentoReduzido() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function BotaoProximoScroll({
  scrollContainerRef,
  distanciaInferior = 20,
  className,
  style,
  ariaLabel = 'Ir para a próxima parte da página',
  title = 'Próxima parte',
}: BotaoProximoScrollProps) {
  const [temConteudoAbaixo, setTemConteudoAbaixo] = useState(true);
  const [estaRolando, setEstaRolando] = useState(false);
  const temporizadorDeParada = useRef<number | null>(null);

  const atualizarVisibilidade = useCallback(() => {
    const container = scrollContainerRef?.current;
    if (container) {
      setTemConteudoAbaixo(container.scrollHeight - (container.scrollTop + container.clientHeight) > LIMIAR_FIM_PX);
      return;
    }

    const elementoRolagem = document.scrollingElement ?? document.documentElement;
    setTemConteudoAbaixo(elementoRolagem.scrollHeight - (window.scrollY + window.innerHeight) > LIMIAR_FIM_PX);
  }, [scrollContainerRef]);

  useEffect(() => {
    atualizarVisibilidade();
    const container = scrollContainerRef?.current;
    const alvoRolagem: HTMLElement | Window = container ?? window;

    const tratarRolagem = () => {
      atualizarVisibilidade();
      setEstaRolando(true);
      if (temporizadorDeParada.current) window.clearTimeout(temporizadorDeParada.current);
      temporizadorDeParada.current = window.setTimeout(() => setEstaRolando(false), PAUSA_APOS_ROLAGEM_MS);
    };

    alvoRolagem.addEventListener('scroll', tratarRolagem, { passive: true });
    window.addEventListener('resize', atualizarVisibilidade);
    return () => {
      alvoRolagem.removeEventListener('scroll', tratarRolagem);
      window.removeEventListener('resize', atualizarVisibilidade);
      if (temporizadorDeParada.current) window.clearTimeout(temporizadorDeParada.current);
    };
  }, [atualizarVisibilidade, scrollContainerRef]);

  const rolarParaProximaTela = () => {
    const container = scrollContainerRef?.current;
    const behavior = prefereMovimentoReduzido() ? 'auto' : 'smooth';

    if (container) {
      const fim = Math.max(0, container.scrollHeight - container.clientHeight);
      container.scrollTo({ top: Math.min(fim, container.scrollTop + Math.round(container.clientHeight * 0.84)), behavior });
      return;
    }

    const elementoRolagem = document.scrollingElement ?? document.documentElement;
    const fim = Math.max(0, elementoRolagem.scrollHeight - window.innerHeight);
    window.scrollTo({ top: Math.min(fim, window.scrollY + Math.round(window.innerHeight * 0.84)), behavior });
  };

  if (!temConteudoAbaixo) return null;

  return (
    <div
      className={`${styles.root} ${estaRolando ? styles.oculto : ''}${className ? ` ${className}` : ''}`}
      style={{ '--av-scroll-next-bottom': `${distanciaInferior}px`, ...style } as CSSProperties}
    >
      <button
        type="button"
        onClick={rolarParaProximaTela}
        className={styles.botao}
        aria-label={ariaLabel}
        aria-hidden={estaRolando}
        tabIndex={estaRolando ? -1 : 0}
        title={title}
      >
        <span className={styles.circulo}>
          <svg className={styles.icone} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}

export default BotaoProximoScroll;
