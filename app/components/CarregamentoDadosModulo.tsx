'use client';
import { useEffect, useState } from 'react';
import BotaoAcaoCompacto from './BotaoAcaoCompacto';
import LoadingPontos from './LoadingPontos';

type Props = {
  ativo: boolean;
  titulo: string;
  mensagem: string;
  corPrimaria?: string;
  temaEscuro?: boolean;
  variante?: 'modulo' | 'local' | 'indicador';
  esqueletos?: boolean;
  escurecerFundo?: boolean;
  onCancelar?: () => void;
  compacto?: boolean;
  mostrarMensagem?: boolean;
};

/** Indicador padrão para preparação do módulo ou espera localizada em um card. */
export default function CarregamentoDadosModulo({ ativo, titulo, mensagem, corPrimaria = '#003e73', temaEscuro = false, variante = 'modulo', esqueletos = false, escurecerFundo = false, onCancelar, compacto = variante === 'indicador', mostrarMensagem = false }: Props) {
  const [demorado, setDemorado] = useState(false);
  useEffect(() => {
    setDemorado(false);
    if (!ativo || variante !== 'local') return;
    const timer = setTimeout(() => setDemorado(true), 8000);
    return () => clearTimeout(timer);
  }, [ativo, variante, mensagem]);
  if (!ativo) return null;
  const circulo = <LoadingPontos cor={corPrimaria} compacto={compacto} />;
  if (variante === 'indicador') return <div className="grid place-items-center [&>span]:mb-0" role="status" aria-live="polite" aria-busy="true" aria-label={`${titulo}. ${mensagem}`}>{circulo}{mostrarMensagem && <span className={`block text-center text-[13px] font-medium ${temaEscuro ? 'text-slate-100' : 'text-slate-700'}`}>{mensagem}</span>}</div>;
  if (variante === 'local') return <div className="my-3 grid min-h-32 place-items-center rounded-2xl px-5 py-6 text-center" style={{background: `color-mix(in srgb, ${corPrimaria} ${temaEscuro ? '14' : '7'}%, transparent)`}} role="status" aria-live="polite" aria-busy="true" aria-label={`${titulo}. ${mensagem}`}>
    <div className="w-full max-w-xl">
      <LoadingPontos cor={corPrimaria} />
      <strong className={`block text-base font-semibold sm:text-lg ${temaEscuro ? 'text-slate-100' : 'text-slate-800'}`}>{mensagem}</strong>
      <p className={`mt-1 text-sm ${temaEscuro ? 'text-slate-300' : 'text-slate-600'}`}>{demorado ? 'Está levando mais tempo que o habitual.' : 'Aguarde um instante.'}</p>
      {esqueletos && <div aria-hidden="true" className="mt-5 grid gap-3">{[0,1,2].map(item => <div key={item} className={`flex items-center gap-3 rounded-xl p-3 motion-safe:animate-pulse ${temaEscuro ? 'bg-white/5' : 'bg-white/65'}`}><span className="size-10 shrink-0 rounded-lg bg-slate-400/20" /><span className="grid flex-1 gap-2"><span className="h-3 w-3/4 rounded bg-slate-400/20" /><span className="h-2 w-1/2 rounded bg-slate-400/15" /></span></div>)}</div>}
    </div>
  </div>;
  return <div data-av-navigation-loading={escurecerFundo ? '' : undefined} className={`fixed inset-0 z-[4000] grid place-items-center p-5 text-center backdrop-blur-[2px] ${temaEscuro ? 'bg-slate-950/35' : escurecerFundo ? 'bg-slate-950/20' : 'bg-white/35'}`} role="status" aria-live="polite" aria-busy="true" aria-label={`${titulo}. ${mensagem}`}>
    <div className={`w-full max-w-[330px] rounded-2xl border px-5 py-4 shadow-[0_10px_30px_rgba(16,42,61,.12)] ${temaEscuro ? 'border-slate-700 bg-slate-900' : 'border-slate-200/90 bg-white'}`}>
      {circulo}
      <strong className={`block text-[13px] font-semibold ${temaEscuro ? 'text-slate-100' : 'text-slate-800'}`}>{titulo}</strong>
      <p className={`mt-1 text-[11px] leading-4 ${temaEscuro ? 'text-slate-400' : 'text-slate-500'}`}>{mensagem}</p>
      {onCancelar&&<BotaoAcaoCompacto className="mt-2" onClick={onCancelar}>Cancelar</BotaoAcaoCompacto>}
    </div>
  </div>;
}
