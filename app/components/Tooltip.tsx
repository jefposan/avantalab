'use client';

import { ReactNode, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  texto: string;
  children: ReactNode;
  posicao?: 'top' | 'bottom' | 'left' | 'right';
  wrapperClassName?: string;
  desativado?: boolean;
}

export default function Tooltip({
  texto,
  children,
  posicao = 'top',
  wrapperClassName = '',
  desativado = false,
}: TooltipProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const atualizarPosicao = () => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const margem = 10;

    let top = rect.top;
    let left = rect.left;

    if (posicao === 'top') {
      top = rect.top - margem;
      left = rect.left + rect.width / 2;
    }

    if (posicao === 'bottom') {
      top = rect.bottom + margem;
      left = rect.left + rect.width / 2;
    }

    if (posicao === 'left') {
      top = rect.top + rect.height / 2;
      left = rect.left - margem;
    }

    if (posicao === 'right') {
      top = rect.top + rect.height / 2;
      left = rect.right + margem;
    }

    setCoords({ top, left });
  };

  const abrirTooltip = () => {
    if (desativado) return;
    atualizarPosicao();
    setVisivel(true);
  };

  const fecharTooltip = () => {
    setVisivel(false);
  };

  const transformPorPosicao = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return (
    <>
      <span
        ref={ref}
        className={`inline-flex ${wrapperClassName}`}
        onMouseEnter={abrirTooltip}
        onMouseLeave={fecharTooltip}
        onFocus={abrirTooltip}
        onBlur={fecharTooltip}
        onPointerDown={fecharTooltip}
      >
        {children}
      </span>

      {visivel && !desativado &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[99999] max-w-[280px] rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold leading-snug text-white shadow-xl"
            style={{
              top: coords.top,
              left: coords.left,
              transform: transformPorPosicao[posicao],
            }}
          >
            {texto}
          </div>,
          document.body
        )}
    </>
  );
}
