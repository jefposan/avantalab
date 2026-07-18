'use client';

import { useMemo } from 'react';
import RecebimentosClient from '@/app/recebimentos/RecebimentosClient';
import { criarRepoSupabase } from '@/app/recebimentos/data/repo';
import DraggableModalCard from './DraggableModalCard';

type Props = {
  aberto: boolean;
  empresaId: string;
  perfil: 'gestor' | 'administrador';
  darkMode: boolean;
  onFechar: () => void;
  onFinanceiroAtualizado: () => void;
};

export default function RecebimentosAdminModal({ aberto, empresaId, perfil, darkMode, onFechar, onFinanceiroAtualizado }: Props) {
  const repo = useMemo(() => criarRepoSupabase(empresaId), [empresaId]);
  if (!aberto) return null;

  const card = darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900';
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="recebimentos-modal-titulo">
      <button type="button" className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm" onClick={onFechar} aria-label="Fechar Recebimentos" />
      <DraggableModalCard className={`relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${card}`}>
        <div data-modal-drag-handle className="flex cursor-grab items-start justify-between gap-3 px-5 py-4 text-white active:cursor-grabbing" style={{ background: 'linear-gradient(135deg, #020617, #003E73)' }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/65">AvantaLab · Módulo</p>
            <h2 id="recebimentos-modal-titulo" className="mt-0.5 text-lg font-black leading-tight text-white">Recebimentos Presencial</h2>
            <p className="mt-0.5 text-xs font-semibold text-cyan-50/80">Empresas, colaboradores, conferência e resultados em campo.</p>
          </div>
          <button type="button" onClick={onFechar} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-black text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="Fechar">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <RecebimentosClient repo={repo} integrado perfilInicial={perfil} mostrarLinkColaboradores onFinanceiroAtualizado={onFinanceiroAtualizado} />
        </div>
      </DraggableModalCard>
    </div>
  );
}
