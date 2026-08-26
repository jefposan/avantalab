'use client';

import { useEffect, useId, useRef, useState } from 'react';
import DraggableModalCard from './DraggableModalCard';

type Props = { aberto: boolean; darkMode?: boolean; aoFechar: () => void; aoSairPerfil: () => Promise<void>; aoExcluirConta: (confirmacao: string) => Promise<{ erro?: boolean; mensagem?: string; bloqueios?: string[] }> };

export default function ExcluirContaGestaoModal({ aberto, darkMode = false, aoFechar, aoSairPerfil, aoExcluirConta }: Props) {
  const [confirmacao, setConfirmacao] = useState('');
  const [etapa, setEtapa] = useState<'escolha' | 'conta'>('escolha');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const tituloId = useId(); const descricaoId = useId();
  const cancelarRef = useRef<HTMLButtonElement | null>(null);
  const dialogoRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const foco = requestAnimationFrame(() => cancelarRef.current?.focus());
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !carregando) aoFechar(); if (e.key === 'Tab' && dialogoRef.current) { const itens = Array.from(dialogoRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])')); if (!itens.length) return; const primeiro = itens[0]; const ultimo = itens[itens.length - 1]; if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); } else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); } } };
    document.addEventListener('keydown', tecla); return () => { cancelAnimationFrame(foco); document.removeEventListener('keydown', tecla); document.body.style.overflow = overflow; anterior?.focus(); };
  }, [aberto, carregando, aoFechar]);
  useEffect(() => { if (!aberto) { setEtapa('escolha'); setConfirmacao(''); setErro(''); setCarregando(false); } }, [aberto]);
  if (!aberto) return null;
  const tema = darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900';
  const sair = async () => { setCarregando(true); setErro(''); try { await aoSairPerfil(); } catch { setErro('Não foi possível sair deste perfil. Tente novamente.'); setCarregando(false); } };
  const excluir = async () => { setCarregando(true); setErro(''); const resultado = await aoExcluirConta(confirmacao); if (resultado.erro) { setErro([resultado.mensagem, ...(resultado.bloqueios || [])].filter(Boolean).join('\n')); setCarregando(false); } };
  return <div ref={dialogoRef} className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-950/80 px-4 py-5" onClick={() => !carregando && aoFechar()}>
    <DraggableModalCard role="dialog" aria-modal="true" aria-labelledby={tituloId} aria-describedby={descricaoId} className={`w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl ${tema}`} onClick={(e) => e.stopPropagation()}>
      <div data-modal-drag-handle className="bg-red-600 px-5 py-4 text-white"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-100">Acesso e conta</p><h2 id={tituloId} className="mt-1 text-xl font-black">{etapa === 'escolha' ? 'Remover meu acesso' : 'Excluir minha conta da Gestão'}</h2></div>
      <div className="p-5"><p id={descricaoId} className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{etapa === 'escolha' ? 'Escolha o que deseja remover. O AvantaVendas é independente e não será alterado.' : 'Esta ação remove todos os seus acessos na Gestão. Ela não altera a sua conta nem seus dados no AvantaVendas.'}</p>
      {erro && <p role="alert" className="mt-4 whitespace-pre-line rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{erro}</p>}
      {etapa === 'escolha' ? <div className="mt-5 space-y-3"><button type="button" disabled={carregando} onClick={sair} className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-bold ${darkMode ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}><span className="block">Sair deste perfil</span><span className={`mt-1 block text-xs font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Remove somente seu acesso ao perfil atual.</span></button><button type="button" disabled={carregando} onClick={() => setEtapa('conta')} className="w-full rounded-xl border border-red-300 px-4 py-3 text-left text-sm font-bold text-red-700 hover:bg-red-50"><span className="block">Excluir minha conta da Gestão</span><span className="mt-1 block text-xs font-normal">Remove todos os seus acessos na Gestão. Não afeta o AvantaVendas.</span></button></div> : <><label className="mt-5 block text-sm font-bold" htmlFor="confirmar-excluir-conta">Digite <strong>EXCLUIR MINHA CONTA</strong></label><input id="confirmar-excluir-conta" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="off" className={`mt-2 h-11 w-full rounded-xl border px-3 outline-none ${darkMode ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-300 bg-white'}`} /></>}
      <div className="mt-6 grid grid-cols-2 gap-3"><button ref={cancelarRef} type="button" disabled={carregando} onClick={() => etapa === 'conta' ? setEtapa('escolha') : aoFechar()} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${darkMode ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-50'}`}>{etapa === 'conta' ? 'Voltar' : 'Cancelar'}</button>{etapa === 'conta' && <button type="button" disabled={carregando || confirmacao.trim().toUpperCase() !== 'EXCLUIR MINHA CONTA'} onClick={excluir} className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white disabled:opacity-50">{carregando ? 'Excluindo...' : 'Excluir conta'}</button>}</div></div>
    </DraggableModalCard>
  </div>;
}
