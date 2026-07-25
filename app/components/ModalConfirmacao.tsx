'use client';

import { useEffect, useId, useRef } from 'react';
import DraggableModalCard from './DraggableModalCard';

type ModalConfirmacaoProps = {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  textoCancelar?: string;
  textoConfirmar?: string;
  carregando?: boolean;
  corPrimaria?: string;
  textoSobreCorPrimaria?: string;
  darkMode?: boolean;
  variante?: 'destrutiva' | 'primaria' | 'alerta';
  aoCancelar: () => void | Promise<void>;
  aoConfirmar: () => void | Promise<void>;
};

export default function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoCancelar = "Cancelar",
  textoConfirmar = "Confirmar",
  carregando = false,
  corPrimaria = '#003E73',
  textoSobreCorPrimaria = '#ffffff',
  darkMode = false,
  variante = 'destrutiva',
  aoCancelar,
  aoConfirmar,
}: ModalConfirmacaoProps) {
  const tituloId = useId();
  const mensagemId = useId();
  const cancelarRef = useRef<HTMLButtonElement | null>(null);
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  const aoCancelarRef = useRef(aoCancelar);
  const carregandoRef = useRef(carregando);

  useEffect(() => {
    aoCancelarRef.current = aoCancelar;
  }, [aoCancelar]);

  useEffect(() => {
    carregandoRef.current = carregando;
  }, [carregando]);

  useEffect(() => {
    if (!aberto) return;

    const elementoAnterior = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const foco = window.requestAnimationFrame(() => cancelarRef.current?.focus());
    const aoPressionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        if (!carregandoRef.current) aoCancelarRef.current();
        return;
      }
      if (evento.key !== 'Tab' || !dialogoRef.current) return;
      const focaveis = Array.from(
        dialogoRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focaveis.length) return;
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
      document.body.style.overflow = overflowAnterior;
      elementoAnterior?.focus();
    };
  }, [aberto]);

  if (!aberto) return null;

  const cardTema = darkMode
    ? 'border-slate-700 bg-slate-900 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';
  const mensagemTema = darkMode
    ? variante === 'destrutiva'
      ? 'border-red-400/35 bg-red-400/10 text-red-50'
      : 'border-amber-400/35 bg-amber-400/10 text-amber-50'
    : variante === 'destrutiva'
      ? 'border-red-200 bg-red-50 text-red-950'
      : 'border-amber-200 bg-amber-50 text-amber-950';
  const cancelarTema = darkMode
    ? 'border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700'
    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100';

  return (
    <div
      ref={dialogoRef}
      className="fixed inset-0 z-[20000] flex items-center justify-center overflow-y-auto bg-slate-950/80 px-4 py-[max(1rem,env(safe-area-inset-top))]"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      onClick={(evento) => {
        evento.stopPropagation();
        if (!carregando) aoCancelar();
      }}
    >
      <DraggableModalCard
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={mensagemId}
        className={`my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border shadow-2xl ${cardTema}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle className="px-5 py-4" style={{ backgroundColor: corPrimaria, color: textoSobreCorPrimaria }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
            {variante === 'destrutiva' ? 'Confirmação de exclusão' : 'Confirmação'}
          </p>
          <h2 id={tituloId} className="mt-1 text-xl font-black">{titulo}</h2>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 overscroll-contain">
          <p id={mensagemId} className={`mb-6 whitespace-pre-line rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed ${mensagemTema}`}>
            {mensagem}
          </p>

          <div className="grid grid-cols-2 gap-3">
          <button
  ref={cancelarRef}
  type="button"
  onClick={aoCancelar}
  disabled={carregando}
  className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${cancelarTema}`}
>
  {textoCancelar}
</button>

          <button
  type="button"
  onClick={aoConfirmar}
  disabled={carregando}
  className="min-h-11 rounded-xl px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
  style={{ backgroundColor: variante === 'destrutiva' ? '#dc2626' : corPrimaria }}
>
  {carregando ? "Aguarde..." : textoConfirmar}
</button>
          </div>
        </div>
      </DraggableModalCard>
    </div>
  );
}
