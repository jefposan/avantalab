'use client';

import Tooltip from './Tooltip';
import { corEhClara } from '@/app/lib/formatters';

type BotaoExpandirCardProps = {
  expandido: boolean;
  desabilitado?: boolean;
  onClick: () => void;
  variante?: 'cabecalho' | 'rodape' | 'painel';
  contexto?: string;
  controlsId?: string;
  somenteIcone?: boolean;
  destaque?: boolean;
  modo?: 'popup' | 'lista';
  compactoNoRodape?: boolean;
  corPrimaria?: string;
  darkMode?: boolean;
};

export default function BotaoExpandirCard({
  expandido,
  desabilitado = false,
  onClick,
  variante = 'cabecalho',
  modo = 'popup',
  compactoNoRodape = false,
  corPrimaria,
  darkMode = false,
  contexto,
  controlsId,
  somenteIcone = false,
  destaque = false,
}: BotaoExpandirCardProps) {
  const rotulo = desabilitado
    ? 'Selecione este card para poder expandir'
    : contexto
      ? `${expandido ? 'Recolher' : 'Expandir'} ${contexto}`
    : modo === 'lista'
      ? expandido ? 'Recolher lista de lançamentos' : 'Expandir lista de lançamentos'
      : expandido ? 'Recolher card' : 'Expandir card';
  const painelSomenteIcone = variante === 'painel' && somenteIcone;
  const painelDestaque = variante === 'painel' && !somenteIcone && destaque;
  const mostrarRotulo = variante !== 'cabecalho' && !painelSomenteIcone;
  const usarTemaPrimarioNoRodape = compactoNoRodape && Boolean(corPrimaria);
  const estiloTemaPrimario = usarTemaPrimarioNoRodape
    ? darkMode
      ? {
          backgroundColor: '#0f172a',
          borderColor: corPrimaria,
          color: `color-mix(in srgb, ${corPrimaria} 72%, white)`,
          boxShadow: `0 3px 10px ${corPrimaria}28`,
        }
      : {
          backgroundColor: corPrimaria,
          borderColor: corPrimaria,
          color: corEhClara(corPrimaria!) ? '#0f172a' : '#ffffff',
          boxShadow: `0 3px 10px ${corPrimaria}33`,
        }
    : undefined;
  const classeBotao = variante === 'painel'
    ? `inline-flex min-h-12 items-center justify-center rounded-xl text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-50 ${painelSomenteIcone ? 'h-12 w-12 shrink-0' : 'gap-2 border px-3'}`
    : variante === 'rodape'
    ? `inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold shadow-none transition-transform hover:scale-[1.04] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${usarTemaPrimarioNoRodape ? '' : 'border-slate-300/90 bg-white/90 text-slate-600 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-700'} ${compactoNoRodape ? "relative h-5 after:absolute after:-inset-[12px] after:content-['']" : 'h-7'}`
    : `relative mx-auto flex h-7 items-center justify-center rounded-md border border-white/40 bg-white/20 text-white shadow-sm backdrop-blur-sm transition hover:scale-105 hover:bg-white/30 active:scale-95 disabled:border-white/20 disabled:bg-white/10 disabled:text-white/45 disabled:shadow-none disabled:hover:scale-100 disabled:hover:bg-white/10 disabled:active:scale-100 after:absolute after:-inset-[10px] after:content-[''] ${mostrarRotulo ? 'min-w-[78px] gap-1 px-1.5 text-[10px] font-black' : 'w-7'}`;

  return (
    <Tooltip texto={rotulo} posicao="top" wrapperClassName={variante === 'painel' ? '' : `mx-auto ${compactoNoRodape ? 'translate-y-3' : ''}`}>
      <button
        type="button"
        disabled={desabilitado}
        onClick={(evento) => {
          evento.stopPropagation();
          onClick();
        }}
        className={classeBotao}
        style={variante === 'painel' ? { color: darkMode ? '#bfdbfe' : corPrimaria || '#003E73', backgroundColor: painelSomenteIcone ? 'transparent' : darkMode ? '#182235' : '#ffffff', borderColor: darkMode ? '#475569' : '#cbd5e1', ...(painelDestaque ? { backgroundColor:corPrimaria||'#003E73',color:corEhClara(corPrimaria||'#003E73')?'#0f172a':'#ffffff',borderColor:corPrimaria||'#003E73',borderRadius:999,paddingInline:18 } : {}), ...(painelSomenteIcone ? { borderWidth: 0, padding: 0, width: 48, minWidth: 48, boxShadow: 'none' } : {}) } : estiloTemaPrimario}
        aria-label={rotulo}
        aria-expanded={expandido}
        aria-controls={controlsId}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={compactoNoRodape ? 'h-3 w-3' : variante === 'rodape' ? 'h-3.5 w-3.5' : 'h-4 w-4'}
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
          <span>{variante === 'painel' ? expandido ? 'Recolher' : 'Expandir' : expandido ? 'Recolher lista' : 'Expandir lista'}</span>
        )}
      </button>
    </Tooltip>
  );
}
