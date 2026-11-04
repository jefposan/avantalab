'use client';

import {
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

type CardExpandidoModalProps = {
  aberto: boolean;
  rotulo: string;
  onFechar: () => void;
  children: ReactNode;
  variante?: 'centralizado' | 'avisos' | 'compacto';
  darkMode?: boolean;
};

export default function CardExpandidoModal({
  aberto,
  rotulo,
  onFechar,
  children,
  variante = 'centralizado',
  darkMode = false,
}: CardExpandidoModalProps) {
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const onFecharRef = useRef(onFechar);

  useEffect(() => {
    onFecharRef.current = onFechar;
  }, [onFechar]);

  useEffect(() => {
    if (!aberto) return;

    const elementoAnterior = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const foco = window.requestAnimationFrame(() => dialogoRef.current?.focus());

    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onFecharRef.current();
        return;
      }

      if (evento.key !== 'Tab' || !dialogoRef.current) return;
      const focaveis = Array.from(
        dialogoRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focaveis.length) {
        evento.preventDefault();
        dialogoRef.current.focus();
        return;
      }

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', aoPressionarTecla);
    return () => {
      window.cancelAnimationFrame(foco);
      document.removeEventListener('keydown', aoPressionarTecla);
      elementoAnterior?.focus();
    };
  }, [aberto]);

  if (!aberto || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={variante === 'avisos' ? 'fixed inset-0 z-[12000] bg-black/40' : 'fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-[2px]'}
      onClick={onFechar}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        tabIndex={-1}
        className={variante === 'avisos'
          ? `fixed inset-x-3 top-[92px] max-h-[calc(100dvh-108px)] w-auto max-w-sm overflow-hidden rounded-2xl border shadow-2xl outline-none sm:left-auto sm:right-4 sm:w-80 xl:right-8 ${darkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`
          : variante==='compacto'
          ? 'max-h-[calc(100dvh-2rem)] w-[min(94vw,480px)] overflow-y-auto rounded-[18px] outline-none'
          : 'max-h-[calc(100dvh-2rem)] w-[min(94vw,1400px)] overflow-hidden rounded-[24px] outline-none'}
        onClick={(evento) => evento.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
