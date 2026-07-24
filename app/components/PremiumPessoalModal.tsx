'use client';
import React, { useRef, useState } from 'react';
import DraggableModalCard from './DraggableModalCard';
import { RECURSOS_PREMIUM_PESSOAL, type Recurso } from '../lib/cobranca';

interface PremiumPessoalModalProps {
  aberto: boolean;
  // Recurso que o usuário tentou usar (fica em destaque na lista).
  recurso?: Recurso | null;
  onFechar: () => void;
  // Abre o fluxo de contratação (AssinaturaModal, que já sabe assinar o pessoal_premium).
  onAssinar: () => void;
  // Resgate de cupom: retorna mensagem de erro (string) ou nada em caso de sucesso.
  onResgatarCupom?: (codigo: string) => Promise<string | null | void>;
  darkMode?: boolean;
  corPrimaria?: string;
}

const GRADIENTE = 'linear-gradient(135deg,#003E73,#00A6C8)';

// Modal de upgrade do perfil Pessoal — NÃO bloqueia o app (o núcleo é grátis
// para sempre); só apresenta o Premium quando um recurso pago é tocado.
export default function PremiumPessoalModal({
  aberto,
  recurso = null,
  onFechar,
  onAssinar,
  onResgatarCupom,
  darkMode = false,
  corPrimaria = '#0A1F44',
}: PremiumPessoalModalProps) {
  const [cupom, setCupom] = useState('');
  const [cupomErro, setCupomErro] = useState('');
  const [resgatando, setResgatando] = useState(false);
  const [mostrarCupom, setMostrarCupom] = useState(false);
  const resgateEmCursoRef = useRef(false);

  if (!aberto) return null;

  const resgatar = async () => {
    const codigo = cupom.trim();
    if (!codigo || resgateEmCursoRef.current) return;
    resgateEmCursoRef.current = true;
    setCupomErro('');
    setResgatando(true);
    try {
      const r = await onResgatarCupom?.(codigo);
      if (typeof r === 'string' && r) setCupomErro(r);
      // sucesso: o handler recarrega o estado (o acesso é liberado)
    } catch {
      setCupomErro('Não foi possível aplicar o cupom agora.');
    } finally {
      resgateEmCursoRef.current = false;
      setResgatando(false);
    }
  };

  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const item = darkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-slate-50';
  const itemDestaque = darkMode ? 'border-sky-500 bg-sky-500/10' : 'border-sky-400 bg-sky-50';

  return (
    <div className="av-modal-backdrop fixed inset-0 z-[5650] flex items-center justify-center bg-black/60 px-4 py-5" onClick={onFechar}>
      <DraggableModalCard
        className={`av-modal-panel flex w-full max-w-lg flex-col overflow-hidden rounded-[16px_32px_32px_32px] border shadow-2xl ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle className="flex shrink-0 cursor-grab items-start justify-between gap-3 px-6 py-4 text-white active:cursor-grabbing" style={{ background: corPrimaria || GRADIENTE }}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] opacity-70">AvantaLab</p>
            <h2 className="mt-0.5 text-lg font-black">Premium Pessoal</h2>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-lg text-white transition hover:bg-white/25" aria-label="Fechar">×</button>
        </div>

        <div className="av-modal-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <p className={`text-xs font-semibold leading-relaxed ${muted}`}>
            Este recurso faz parte do <b>Premium Pessoal</b>. O essencial continua grátis para sempre — o Premium desbloqueia os recursos avançados:
          </p>

          <div className="mt-3 grid gap-1.5">
            {RECURSOS_PREMIUM_PESSOAL.map((r) => {
              const destaque = r.recurso === recurso;
              return (
                <div key={r.recurso} className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 ${destaque ? itemDestaque : item}`}>
                  <span className="mt-0.5 text-base leading-none">{r.icone}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-black">
                      {r.titulo}
                      {destaque && <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white">Você tentou usar</span>}
                    </p>
                    <p className={`mt-0.5 text-[11px] font-semibold leading-snug ${muted}`}>{r.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 ${darkMode ? 'border-sky-500/60' : 'border-sky-400'}`} style={{ background: GRADIENTE }}>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/80">A partir de</p>
              <p className="text-xl font-black text-white">R$ 8,25<span className="text-xs font-bold text-white/80">/mês</span></p>
              <p className="text-[10px] font-semibold text-white/80">no anual (R$ 99,00/ano) · ou R$ 9,90/mês</p>
            </div>
            <button
              type="button"
              onClick={() => { onFechar(); onAssinar(); }}
              className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-sky-800 shadow-lg transition hover:brightness-95 active:scale-[0.98]"
            >
              Assinar Premium
            </button>
          </div>

          <div className="mt-3 pb-1">
            {!mostrarCupom ? (
              <button type="button" onClick={() => setMostrarCupom(true)} className={`text-[11px] font-black uppercase tracking-wide underline-offset-2 hover:underline ${muted}`}>
                Tem um cupom?
              </button>
            ) : (
              <div>
                <label className={`mb-1 block text-[11px] font-black uppercase tracking-wide ${muted}`}>Cupom</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cupom}
                    onChange={(e) => { setCupom(e.target.value.toUpperCase()); setCupomErro(''); }}
                    placeholder="Digite o código"
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm font-semibold uppercase tracking-wide outline-none transition focus:border-sky-600 ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-800'}`}
                  />
                  <button
                    type="button"
                    onClick={resgatar}
                    disabled={resgatando || !cupom.trim()}
                    className={`shrink-0 rounded-xl border px-4 text-xs font-black uppercase tracking-wide shadow-sm transition active:scale-[0.98] disabled:opacity-50 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    {resgatando ? '...' : 'Aplicar'}
                  </button>
                </div>
                {cupomErro && <p className="mt-1.5 text-xs font-bold text-red-600">{cupomErro}</p>}
              </div>
            )}
          </div>
        </div>
      </DraggableModalCard>
    </div>
  );
}
