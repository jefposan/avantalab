'use client';
import React from 'react';
import DraggableModalCard from './DraggableModalCard';
import { rotuloStatusAssinatura, rotuloPlano, type EstadoAcesso } from '../lib/cobranca';

interface AssinaturaModalProps {
  aberto: boolean;
  onFechar: () => void;
  darkMode?: boolean;
  corPrimaria?: string;
  estado: EstadoAcesso | null;
}

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Cor do selo conforme o status.
function corStatus(status: string): { bg: string; texto: string } {
  if (status === 'ativa' || status === 'cortesia') return { bg: '#DCFCE7', texto: '#15803D' };
  if (status === 'trial') return { bg: '#DBEAFE', texto: '#1D4ED8' };
  if (status === 'inadimplente') return { bg: '#FEF3C7', texto: '#B45309' };
  return { bg: '#FEE2E2', texto: '#B91C1C' }; // vencida / cancelada
}

export default function AssinaturaModal({ aberto, onFechar, darkMode = false, corPrimaria = '#0A1F44', estado }: AssinaturaModalProps) {
  if (!aberto) return null;

  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const linha = darkMode ? 'border-slate-700' : 'border-slate-100';

  const status = estado?.status || 'expirada';
  const selo = corStatus(status);

  // Texto da validade conforme o estado.
  let validadeRotulo = 'Validade';
  let validadeValor = '—';
  if (estado?.status === 'trial') {
    validadeRotulo = 'Teste até';
    validadeValor = formatarData(estado.trialFim);
  } else if (estado?.validoAte) {
    validadeRotulo = 'Válido até';
    validadeValor = formatarData(estado.validoAte);
  }

  return (
    <div className="fixed inset-0 z-[5600] flex items-center justify-center bg-black/60 px-4" onClick={onFechar}>
      <DraggableModalCard
        className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl ${card}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-modal-drag-handle className="flex cursor-grab items-start justify-between gap-3 px-6 py-4 text-white active:cursor-grabbing" style={{ background: corPrimaria }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-70">AvantaLab</p>
            <h2 className="mt-0.5 text-lg font-black leading-tight">Assinatura</h2>
          </div>
          <button type="button" onClick={onFechar} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white transition hover:bg-white/25" aria-label="Fechar">×</button>
        </div>

        <div className="px-6 py-5">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className={`text-xs font-black uppercase tracking-wide ${muted}`}>Situação</span>
              <span className="rounded-full px-3 py-1 text-xs font-black" style={{ backgroundColor: selo.bg, color: selo.texto }}>
                {rotuloStatusAssinatura(status)}
              </span>
            </div>

            <div className={`flex items-center justify-between gap-3 border-t pt-3 ${linha}`}>
              <span className={`text-xs font-black uppercase tracking-wide ${muted}`}>Plano</span>
              <strong className="text-sm font-black">{rotuloPlano(estado?.plano ?? null, estado?.ciclo ?? null)}</strong>
            </div>

            <div className={`flex items-center justify-between gap-3 border-t pt-3 ${linha}`}>
              <span className={`text-xs font-black uppercase tracking-wide ${muted}`}>{validadeRotulo}</span>
              <strong className="text-sm font-black">{validadeValor}</strong>
            </div>
          </div>

          <p className={`mt-5 text-xs font-semibold leading-relaxed ${muted}`}>
            Em breve você poderá ver as faturas, baixar a 2ª via e trocar de plano por aqui.
          </p>
        </div>
      </DraggableModalCard>
    </div>
  );
}
