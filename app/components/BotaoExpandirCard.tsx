'use client';

import Tooltip from './Tooltip';

type BotaoExpandirCardProps = {
  expandido: boolean;
  desabilitado?: boolean;
  onClick: () => void;
  variante?: 'cabecalho' | 'rodape';
  modo?: 'popup' | 'lista';
};

export default function BotaoExpandirCard({
  expandido,
  desabilitado = false,
  onClick,
  variante = 'cabecalho',
  modo = 'popup',
}: BotaoExpandirCardProps) {
  const rotulo = desabilitado
    ? 'Selecione este card para poder expandir'
    : modo === 'lista'
      ? expandido ? 'Recolher lista de lançamentos' : 'Expandir lista de lançamentos'
      : expandido ? 'Recolher card' : 'Expandir card';
  const mostrarRotulo = variante === 'rodape';
  const classeBotao = variante === 'rodape'
    ? 'inline-flex h-7 items-center justify-center gap-1.5 rounded-full border border-slate-300/90 bg-white/90 px-2.5 text-[10px] font-bold text-slate-600 shadow-none transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'
    : `relative mx-auto flex h-7 items-center justify-center rounded-md border border-white/40 bg-white/20 text-white shadow-sm backdrop-blur-sm transition hover:scale-105 hover:bg-white/30 active:scale-95 disabled:border-white/20 disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none disabled:hover:scale-100 disabled:hover:bg-white/10 disabled:active:scale-100 after:absolute after:-inset-[10px] after:content-[''] ${mostrarRotulo ? 'min-w-[78px] gap-1 px-1.5 text-[10px] font-black' : 'w-7'}`;

  return (
    <Tooltip texto={rotulo} posicao="top" wrapperClassName="mx-auto">
      <button
        type="button"
        disabled={desabilitado}
        onClick={(evento) => {
          evento.stopPropagation();
          onClick();
        }}
        className={classeBotao}
        aria-label={rotulo}
        aria-expanded={expandido}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={variante === 'rodape' ? 'h-3.5 w-3.5' : 'h-4 w-4'}
          aria-hidden="true"
        >
          {modo === 'lista' ? (
            expandido ? (
              <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            )
          ) : expandido ? (
            <>
              <path d="M9 3v6H3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m3 9 6-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 21v-6h6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m21 15-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <>
              <path d="M9 3H3v6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m3 3 6 6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 21h6v-6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m21 21-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}
        </svg>
        {mostrarRotulo && (
          <span>{expandido ? 'Recolher lista' : 'Expandir lista'}</span>
        )}
      </button>
    </Tooltip>
  );
}
