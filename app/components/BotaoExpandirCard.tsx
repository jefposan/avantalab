'use client';

import Tooltip from './Tooltip';

type BotaoExpandirCardProps = {
  expandido: boolean;
  desabilitado?: boolean;
  onClick: () => void;
};

export default function BotaoExpandirCard({
  expandido,
  desabilitado = false,
  onClick,
}: BotaoExpandirCardProps) {
  const rotulo = desabilitado
    ? 'Selecione este card para poder expandir'
    : expandido
      ? 'Recolher card'
      : 'Expandir card';

  return (
    <Tooltip texto={rotulo} posicao="top" wrapperClassName="mx-auto">
      <button
        type="button"
        disabled={desabilitado}
        onClick={(evento) => {
          evento.stopPropagation();
          onClick();
        }}
        className="relative mx-auto flex h-6 w-6 items-center justify-center rounded-md border border-white/40 bg-white/20 text-white shadow-sm backdrop-blur-sm transition hover:scale-105 hover:bg-white/30 active:scale-95 disabled:border-white/20 disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none disabled:hover:scale-100 disabled:hover:bg-white/10 disabled:active:scale-100 after:absolute after:-inset-[10px] after:content-['']"
        aria-label={rotulo}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-4 w-4"
          aria-hidden="true"
        >
          {expandido ? (
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
      </button>
    </Tooltip>
  );
}
