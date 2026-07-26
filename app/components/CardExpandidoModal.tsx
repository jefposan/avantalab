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
};

export default function CardExpandidoModal({
  aberto,
  rotulo,
  onFechar,
  children,
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
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-[2px]"
      onClick={onFechar}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-[min(94vw,1400px)] overflow-hidden rounded-[24px] outline-none"
        onClick={(evento) => evento.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
