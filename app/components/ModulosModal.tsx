'use client';
import React from 'react';
import DraggableModalCard from './DraggableModalCard';
import { COBRANCA_ATIVA } from '@/app/lib/cobranca';

export type Modulo = {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  perfis: string[];
  precoMensal?: number;
};

interface ModulosModalProps {
  aberto: boolean;
  onFechar: () => void;
  modulos: Modulo[]; // já filtrados pelo tipo de perfil
  ativos: string[];
  carregando: boolean;
  acaoEmId: string | null; // módulo em processamento (instalando/removendo)
  onInstalar: (id: string) => void;
  onDesinstalar: (id: string) => void;
  darkMode: boolean;
  corPrimaria: string;
  planoComercial: string | null;
  podeGerenciar: boolean;
  cancelamentos: Record<string, string>;
}

function iconeModulo(icone: string): string {
  const mapa: Record<string, string> = {
    relogio: '🕐',
    vendas: '🛒',
    recebimentos: '💵',
    crm: '👥',
    custos: '🧮',
    projetos: '◇',
  };
  return mapa[icone] || '▣';
}

export default function ModulosModal({
  aberto,
  onFechar,
  modulos,
  ativos,
  carregando,
  acaoEmId,
  onInstalar,
  onDesinstalar,
  darkMode,
  corPrimaria,
  planoComercial,
  podeGerenciar,
  cancelamentos,
}: ModulosModalProps) {
  if (!aberto) return null;

  const card = darkMode ? 'bg-slate-900 text-slate-100 border-slate-700' : 'bg-white text-slate-900 border-slate-200';
  const itemBorda = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onFechar} />

      <DraggableModalCard className={`relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl ${card}`}>
        {/* Header */}
        <div data-modal-drag-handle className="flex cursor-grab items-start justify-between gap-3 px-5 py-4 text-white active:cursor-grabbing" style={{ background: 'linear-gradient(135deg, #020617, #003E73)' }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.65)' }}>AvantaLab</p>
            <h2 className="mt-0.5 text-lg font-black leading-tight text-white">Módulos</h2>
            <p className="mt-0.5 text-xs font-semibold text-cyan-50/80">Adicione recursos ao seu perfil financeiro.</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-black text-white transition hover:bg-white/25"
            aria-label="Fechar"
          >×</button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4">
          {carregando && modulos.length === 0 ? (
            <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Carregando módulos...</p>
          ) : modulos.length === 0 ? (
            <p className={`py-8 text-center text-sm font-semibold ${textMuted}`}>Nenhum módulo disponível para este perfil.</p>
          ) : (
            <div className="grid gap-3">
              {modulos.map((m) => {
                const instalado = ativos.includes(m.id);
                const processando = acaoEmId === m.id;
                const cancelamentoEm = cancelamentos[m.id];
                const business = planoComercial === 'business';
                const businessPro = planoComercial === 'business_pro';
                const disponivelNoPlano = !COBRANCA_ATIVA || business || businessPro;
                const preco = (m.precoMensal ?? 14.9).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                return (
                  <div key={m.id} className={`flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center ${itemBorda}`}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-xl">{iconeModulo(m.icone)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{m.nome}</p>
                      <p className={`mt-0.5 text-xs ${textMuted}`}>{m.descricao}</p>
                      {instalado && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">Instalado</span>
                      )}
                      <p className={`mt-1 text-[11px] font-bold ${textMuted}`}>
                        {cancelamentoEm
                          ? `Acesso até ${new Intl.DateTimeFormat('pt-BR').format(new Date(cancelamentoEm))}`
                          : !COBRANCA_ATIVA
                            ? 'Disponível para instalação'
                            : businessPro
                              ? 'Incluso no Business Pro'
                              : business
                                ? `${preco} por mês`
                                : 'Disponível no Business e Business Pro'}
                      </p>
                    </div>
                    {instalado ? (
                      <button
                        type="button"
                        disabled={processando || !podeGerenciar || Boolean(cancelamentoEm)}
                        onClick={() => onDesinstalar(m.id)}
                        className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >{processando ? '...' : cancelamentoEm ? 'Cancelamento agendado' : business ? 'Cancelar assinatura' : 'Remover'}</button>
                    ) : (
                      <button
                        type="button"
                        disabled={processando || !podeGerenciar || !disponivelNoPlano}
                        onClick={() => onInstalar(m.id)}
                        className="shrink-0 rounded-xl px-3 py-2 text-xs font-black text-white shadow transition hover:brightness-110 disabled:opacity-50"
                        style={{ backgroundColor: corPrimaria }}
                      >{processando ? '...' : !COBRANCA_ATIVA ? 'Instalar' : business ? `Assinar ${preco}` : businessPro ? 'Instalar' : 'Indisponível'}</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DraggableModalCard>
    </div>
  );
}
