'use client';

import { useEffect, useId, useRef } from 'react';

type ProcessandoModalProps = {
  aberto: boolean;
  darkMode: boolean;
  titulo?: string;
  mensagem?: string;
  corPrimaria?: string;
};

export default function ProcessandoModal({
  aberto,
  darkMode,
  titulo = 'Processando',
  mensagem = 'Aguarde enquanto aplicamos a alteração.',
  corPrimaria = '#003E73',
}: ProcessandoModalProps) {
  const tituloId = useId();
  const mensagemId = useId();
  const camadaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aberto) return;

    const elementoAnterior = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const foco = window.requestAnimationFrame(() => camadaRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(foco);
      document.body.style.overflow = overflowAnterior;
      elementoAnterior?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div
      ref={camadaRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby={tituloId}
      aria-describedby={mensagemId}
      className="fixed inset-0 z-[30000] flex items-center justify-center bg-slate-950/85 px-4 outline-none"
      onKeyDown={(evento) => evento.preventDefault()}
    >
      <section className={`w-full max-w-xs overflow-hidden rounded-2xl border shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-white/80 bg-white text-slate-900'}`}>
        <div className="flex items-center gap-3 px-4 py-4 text-white" style={{ backgroundColor: corPrimaria }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
            <svg className="h-5 w-5 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none">
              <path d="M12 3a9 9 0 1 1-6.36 2.64" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <div role="status" aria-live="assertive" aria-atomic="true">
            <p id={tituloId} className="text-sm font-black">{titulo}</p>
            <p id={mensagemId} className="mt-0.5 text-[11px] font-semibold text-cyan-100">{mensagem}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
